import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parseInput } from '../services/dnsParser';
import { checkRecord } from '../services/hostChecker';
import { generateExcelBuffer, generateCsv } from '../services/subdomainExporter';
import { DnsRecord } from '../types/subdomain.types';

export const subdomainRouter = Router();

// Setup in-memory file upload handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Store active scan cancel callbacks
const activeScans = new Map<string, () => void>();

/**
 * POST /api/parse
 * Parses uploaded zone file or raw text input
 */
subdomainRouter.post('/parse', upload.single('file'), (req: Request, res: Response) => {
  try {
    let rawText = '';
    const origin = (req.body && req.body.origin) || '';

    if (req.file) {
      rawText = req.file.buffer.toString('utf8');
    } else if (req.body && req.body.text) {
      rawText = req.body.text;
    } else {
      return res.status(400).json({ success: false, error: 'No text or file provided' });
    }

    const filterHostOnly =
      (req.body && req.body.filterHostOnly === 'true') ||
      (req.body && req.body.filterHostOnly === true);

    const parsed = parseInput(rawText, origin);
    let records = parsed.records;

    if (filterHostOnly) {
      records = records.filter((r) => ['A', 'AAAA', 'CNAME'].includes(r.type));
    }

    res.json({
      success: true,
      origin: parsed.origin,
      totalCount: records.length,
      records: records,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/check-single
 * Probes a single subdomain record
 */
subdomainRouter.post('/check-single', async (req: Request, res: Response) => {
  try {
    const { record, timeout = 2500 } = req.body;
    if (!record || !record.fqdn) {
      return res.status(400).json({ success: false, error: 'Record with fqdn required' });
    }
    const result = await checkRecord(record, { timeout });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/scan/stream
 * Server-Sent Events (SSE) streaming endpoint for scanning multiple subdomains concurrently
 */
subdomainRouter.post('/scan/stream', async (req: Request, res: Response) => {
  const {
    records = [],
    concurrency = 15,
    timeout = 2500,
    scanId = Date.now().toString(),
  }: {
    records: DnsRecord[];
    concurrency: number;
    timeout: number;
    scanId: string;
  } = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'Records array required' });
  }

  // Disable socket timeouts for streaming
  req.setTimeout(0);
  res.setTimeout(0);

  // Setup SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let isAborted = false;
  activeScans.set(scanId, () => {
    isAborted = true;
  });

  // Keep-alive heartbeat every 2s so proxies never drop the stream
  const keepAliveTimer = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': keepalive\n\n');
    }
  }, 2000);

  res.on('close', () => {
    clearInterval(keepAliveTimer);
    if (!res.writableEnded && completed < total) {
      isAborted = true;
    }
    activeScans.delete(scanId);
  });

  const sendEvent = (event: string, data: any) => {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  const total = records.length;
  let completed = 0;
  let activeCount = 0;
  let inactiveCount = 0;

  sendEvent('start', { total, scanId });

  // Concurrency queue
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < records.length && !isAborted) {
      const idx = currentIndex++;
      const item = records[idx];

      try {
        const result = await checkRecord(item, { timeout });
        completed++;
        if (result.active === 'Yes') {
          activeCount++;
        } else {
          inactiveCount++;
        }

        sendEvent('item', {
          index: idx,
          result: result,
          completed,
          total,
          activeCount,
          inactiveCount,
        });
      } catch (err: any) {
        completed++;
        inactiveCount++;
        sendEvent('item', {
          index: idx,
          result: {
            ...item,
            active: 'No',
            protocol: 'None',
            error: err.message,
          },
          completed,
          total,
          activeCount,
          inactiveCount,
        });
      }
    }
  }

  const workers: Promise<void>[] = [];
  const workerCount = Math.min(concurrency, records.length);
  for (let w = 0; w < workerCount; w++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  clearInterval(keepAliveTimer);
  activeScans.delete(scanId);

  sendEvent('done', {
    total,
    completed,
    activeCount,
    inactiveCount,
    aborted: isAborted,
  });

  res.end();
});

/**
 * POST /api/scan/stop
 * Cancels a running scan by ID
 */
subdomainRouter.post('/scan/stop', (req: Request, res: Response) => {
  const { scanId } = req.body;
  if (scanId && activeScans.has(scanId)) {
    const cancelFn = activeScans.get(scanId);
    if (cancelFn) cancelFn();
    activeScans.delete(scanId);
    return res.json({ success: true, message: 'Scan cancelled' });
  }
  res.json({ success: false, message: 'Scan not found or already finished' });
});

/**
 * POST /api/export/excel
 * Generates formatted .xlsx file matching the user's template
 */
subdomainRouter.post('/export/excel', async (req: Request, res: Response) => {
  try {
    const { rows = [], filename = 'Subdomain_MasterSheet.xlsx', useDoubleClassHeader = false } = req.body;
    const buffer = await generateExcelBuffer(rows, { useDoubleClassHeader });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/export/csv
 * Generates CSV file
 */
subdomainRouter.post('/export/csv', (req: Request, res: Response) => {
  try {
    const { rows = [], filename = 'Subdomain_MasterSheet.csv' } = req.body;
    const csvData = generateCsv(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
