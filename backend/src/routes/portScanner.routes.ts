import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import {
  checkNmapAvailable,
  runNativeSocketScan,
  runNmapScan,
} from '../services/portScanner';
import { PortResult, PortScanOptions } from '../types/portScanner.types';

export const portScannerRouter = Router();

// Store cancellation callbacks by scanId
const activePortScans = new Map<string, () => void>();

/**
 * GET /api/scan/ports/status
 * Returns availability of system Nmap binary
 */
portScannerRouter.get('/status', async (_req: Request, res: Response) => {
  const status = await checkNmapAvailable();
  res.json({
    success: true,
    nmapAvailable: status.available,
    nmapVersion: status.version,
    enginesSupported: status.available ? ['nmap', 'native_socket'] : ['native_socket'],
  });
});

/**
 * POST /api/scan/ports/stop
 * Cancels a running port scan
 */
portScannerRouter.post('/stop', (req: Request, res: Response) => {
  const { scanId } = req.body;
  if (!scanId || !activePortScans.has(scanId)) {
    return res.status(404).json({ success: false, error: 'Scan ID not found or already completed.' });
  }

  const cancelFn = activePortScans.get(scanId);
  if (cancelFn) {
    cancelFn();
    activePortScans.delete(scanId);
  }

  res.json({ success: true, message: 'Scan cancelled successfully.' });
});

/**
 * POST /api/scan/ports/stream
 * Server-Sent Events (SSE) streaming port scan
 */
portScannerRouter.post('/stream', async (req: Request, res: Response) => {
  const options: PortScanOptions = req.body;
  const targets = (options.targets || []).map((t) => t.trim()).filter(Boolean);
  const ports = (options.ports || []).filter((p) => typeof p === 'number' && p > 0 && p <= 65535);

  if (targets.length === 0 || ports.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Please provide at least one valid target host and at least one port number.',
    });
  }

  // Setup SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Crucial for Nginx buffering bypass
  res.flushHeaders?.();

  const scanId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let cancelled = false;

  activePortScans.set(scanId, () => {
    cancelled = true;
  });

  // Automatically cancel scanning and free resources if client closes connection/tab
  res.on('close', () => {
    cancelled = true;
    activePortScans.delete(scanId);
  });

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const nmapStatus = await checkNmapAvailable();

  // If user explicitly chose Nmap engine but binary is missing, explain clearly
  if (options.engine === 'nmap' && !nmapStatus.available) {
    activePortScans.delete(scanId);
    sendEvent('error', {
      scanId,
      error:
        'The Nmap binary was not found on this system. Please install Nmap (https://nmap.org) or run via Docker, or switch to the Native Node TCP Sockets engine.',
    });
    res.end();
    return;
  }

  const useNmap = options.engine === 'nmap' ? true : options.engine === 'auto' ? nmapStatus.available : false;

  sendEvent('init', {
    scanId,
    totalPorts: targets.length * ports.length,
    targets,
    portsCount: ports.length,
    engineUsed: useNmap ? 'nmap' : 'native_socket',
  });

  try {
    let summary;

    if (useNmap && nmapStatus.available) {
      summary = await runNmapScan(
        { ...options, targets, ports },
        scanId,
        (prog) => sendEvent(prog.type, prog),
        () => cancelled
      );
    } else {
      summary = await runNativeSocketScan(
        { ...options, targets, ports },
        scanId,
        (prog) => sendEvent(prog.type, prog),
        () => cancelled
      );
    }

    activePortScans.delete(scanId);

    if (cancelled) {
      sendEvent('stopped', { scanId, message: 'Scan was stopped by user.' });
    } else {
      sendEvent('complete', summary);
    }
  } catch (err: any) {
    activePortScans.delete(scanId);
    sendEvent('error', { scanId, error: err.message || 'An error occurred during port scan.' });
  } finally {
    res.end();
  }
});

/**
 * POST /api/scan/ports/export/excel
 * Generates an Excel workbook from port scan results
 */
portScannerRouter.post('/export/excel', async (req: Request, res: Response) => {
  try {
    const { results }: { results: PortResult[] } = req.body;
    if (!Array.isArray(results)) {
      return res.status(400).json({ success: false, error: 'Results array is required' });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DevSecOps Utilities Suite';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Port Scan Results', {
      views: [{ showGridLines: true }],
    });

    // Dark Header Style
    const darkHeaderFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF18181B' }, // Zinc-900
    };

    const headerFont: Partial<ExcelJS.Font> = {
      name: 'Segoe UI',
      size: 10,
      bold: true,
      color: { argb: 'FFF4F4F5' },
    };

    const cellBorders: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF27272A' } },
      bottom: { style: 'thin', color: { argb: 'FF27272A' } },
      left: { style: 'thin', color: { argb: 'FF27272A' } },
      right: { style: 'thin', color: { argb: 'FF27272A' } },
    };

    // Columns
    const headers = [
      'Target Host',
      'IP Address',
      'Port',
      'Protocol',
      'State',
      'Service',
      'Product / Banner',
      'Latency (ms)',
    ];

    const headerRow = sheet.getRow(1);
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.fill = darkHeaderFill;
      cell.font = headerFont;
      cell.border = cellBorders;
    });
    headerRow.height = 24;

    results.forEach((r, idx) => {
      const row = sheet.getRow(idx + 2);
      row.getCell(1).value = r.host;
      row.getCell(2).value = r.ip || r.host;
      row.getCell(3).value = r.port;
      row.getCell(4).value = r.protocol.toUpperCase();
      row.getCell(5).value = r.state.toUpperCase();
      row.getCell(6).value = r.service || 'unknown';
      row.getCell(7).value = r.banner || r.product || '—';
      row.getCell(8).value = r.latencyMs !== undefined ? r.latencyMs : '—';

      // Fonts
      row.getCell(1).font = { name: 'Segoe UI', size: 9.5, bold: true };
      row.getCell(2).font = { name: 'Consolas', size: 9, color: { argb: 'FF71717A' } };
      row.getCell(3).font = { name: 'Consolas', size: 10, bold: true };
      row.getCell(4).font = { name: 'Consolas', size: 9 };
      row.getCell(5).font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: {
          argb: r.state === 'open' ? 'FF10B981' : r.state === 'filtered' ? 'FFF59E0B' : 'FF71717A',
        },
      };
      row.getCell(6).font = { name: 'Consolas', size: 9.5, color: { argb: 'FF38BDF8' } };
      row.getCell(7).font = { name: 'Segoe UI', size: 9, color: { argb: 'FFA1A1AA' } };
      row.getCell(8).font = { name: 'Consolas', size: 9 };

      // Zebra striping
      if (idx % 2 === 1) {
        for (let c = 1; c <= 8; c++) {
          row.getCell(c).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' },
          };
        }
      }

      for (let c = 1; c <= 8; c++) {
        row.getCell(c).border = cellBorders;
      }
      row.height = 20;
    });

    sheet.getColumn(1).width = 28;
    sheet.getColumn(2).width = 20;
    sheet.getColumn(3).width = 10;
    sheet.getColumn(4).width = 12;
    sheet.getColumn(5).width = 14;
    sheet.getColumn(6).width = 18;
    sheet.getColumn(7).width = 40;
    sheet.getColumn(8).width = 14;

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="port-scan-${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Excel export failed' });
  }
});
