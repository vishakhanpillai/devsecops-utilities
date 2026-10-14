import dns from 'dns';
import net from 'net';
import http from 'http';
import https from 'https';
import { DnsRecord, CheckOptions, AlternativePort } from '../types/subdomain.types';

// Non-blocking c-ares async resolver with fallback
const asyncResolver = new dns.promises.Resolver();
asyncResolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

// High priority ports to check when standard 80/443 fail
export const ALTERNATIVE_PORTS: AlternativePort[] = [
  { port: 8080, name: 'HTTP:8080' },
  { port: 8443, name: 'HTTPS:8443' },
  { port: 22, name: 'SSH' },
  { port: 21, name: 'FTP' },
  { port: 3389, name: 'RDP' },
  { port: 25, name: 'SMTP' },
  { port: 8000, name: 'HTTP:8000' },
  { port: 3000, name: 'HTTP:3000' },
  { port: 5000, name: 'HTTP:5000' },
  { port: 9000, name: 'HTTP:9000' },
  { port: 9090, name: 'HTTP:9090' },
  { port: 53, name: 'DNS' },
  { port: 3306, name: 'MySQL' },
  { port: 5432, name: 'Postgres' },
  { port: 6379, name: 'Redis' },
];

/**
 * Fast non-blocking DNS resolution with strict timeout
 */
export async function resolveHostFast(fqdn: string, timeoutMs = 1500): Promise<string | null> {
  const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));

  const resolvePromise = asyncResolver.resolve4(fqdn)
    .then((ips) => (ips && ips.length > 0 ? ips[0] : null))
    .catch(async () => {
      try {
        const res = await dns.promises.lookup(fqdn);
        return res ? res.address : null;
      } catch {
        return null;
      }
    });

  return await Promise.race([resolvePromise, timeoutPromise]);
}

/**
 * Direct HTTP check using IP and Host header
 */
export function probeHttp(
  targetIp: string,
  fqdn: string,
  port = 80,
  timeoutMs = 2000
): Promise<{ alive: boolean; status?: number; port: number; err?: string }> {
  return new Promise((resolve) => {
    let finished = false;
    const req = http.request(
      {
        host: targetIp,
        port,
        path: '/',
        method: 'GET',
        headers: {
          'Host': fqdn,
          'User-Agent': 'Mozilla/5.0 DevSecOpsUtilities/1.0',
          'Accept': '*/*',
        },
        timeout: timeoutMs,
      },
      (res) => {
        if (!finished) {
          finished = true;
          resolve({ alive: true, status: res.statusCode, port });
        }
        res.resume();
      }
    );

    req.on('error', (err: any) => {
      if (!finished) {
        finished = true;
        resolve({ alive: false, port, err: err?.code || err?.message });
      }
    });

    req.on('timeout', () => {
      req.destroy();
      if (!finished) {
        finished = true;
        resolve({ alive: false, port, err: 'TIMEOUT' });
      }
    });

    req.end();
  });
}

/**
 * Direct HTTPS check using IP, SNI servername, and Host header
 */
export function probeHttps(
  targetIp: string,
  fqdn: string,
  port = 443,
  timeoutMs = 2000
): Promise<{ alive: boolean; status?: number; port: number; err?: string }> {
  return new Promise((resolve) => {
    let finished = false;
    const req = https.request(
      {
        host: targetIp,
        port,
        path: '/',
        method: 'GET',
        headers: {
          'Host': fqdn,
          'User-Agent': 'Mozilla/5.0 DevSecOpsUtilities/1.0',
          'Accept': '*/*',
        },
        servername: fqdn,
        rejectUnauthorized: false, // Handle internal / self-signed certs
        timeout: timeoutMs,
      },
      (res) => {
        if (!finished) {
          finished = true;
          resolve({ alive: true, status: res.statusCode, port });
        }
        res.resume();
      }
    );

    req.on('error', (err: any) => {
      if (!finished) {
        finished = true;
        resolve({ alive: false, port, err: err?.code || err?.message });
      }
    });

    req.on('timeout', () => {
      req.destroy();
      if (!finished) {
        finished = true;
        resolve({ alive: false, port, err: 'TIMEOUT' });
      }
    });

    req.end();
  });
}

/**
 * Fast TCP socket check for alternative ports
 */
export function probeTcp(
  targetIp: string,
  port: number,
  timeoutMs = 1500
): Promise<{ port: number; open: boolean; error?: string }> {
  return new Promise((resolve) => {
    let finished = false;
    const socket = new net.Socket();

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        socket.destroy();
        resolve({ port, open: false, error: 'TIMEOUT' });
      }
    }, timeoutMs);

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        socket.destroy();
        resolve({ port, open: true });
      }
    });

    socket.on('timeout', () => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        socket.destroy();
        resolve({ port, open: false, error: 'TIMEOUT' });
      }
    });

    socket.on('error', (err: any) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        socket.destroy();
        resolve({ port, open: false, error: err?.code || err?.message });
      }
    });

    try {
      socket.connect(port, targetIp);
    } catch {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        resolve({ port, open: false });
      }
    }
  });
}

/**
 * Multi-vector check for a single record:
 * 1. Checks if IP exists or resolves it via fast DNS
 * 2. Probes HTTP & HTTPS
 * 3. Probes alternative ports ONLY if web fails
 */
export async function checkRecord(
  record: DnsRecord,
  options: CheckOptions = {}
): Promise<DnsRecord> {
  const { timeout = 2500 } = options;
  const fqdn = record.fqdn;
  let targetIp: string | null = null;

  // Check if record already has a valid IPv4
  if (record.ip && /^\d+\.\d+\.\d+\.\d+$/.test(record.ip.trim())) {
    targetIp = record.ip.trim();
  } else {
    // Fast async DNS lookup
    targetIp = await resolveHostFast(fqdn, 1500);
  }

  // If no IP could be determined, host does not resolve and has no IP -> Inactive
  if (!targetIp) {
    return {
      ...record,
      protocol: '-',
      active: 'No',
      dnsResolved: false,
      openPorts: [],
    };
  }

  // Tier 1: Probing standard Web (HTTP & HTTPS)
  const [httpRes, httpsRes] = await Promise.all([
    probeHttp(targetIp, fqdn, 80, timeout),
    probeHttps(targetIp, fqdn, 443, timeout),
  ]);

  const hasHttps = httpsRes.alive;
  const hasHttp = httpRes.alive;

  // If both HTTPS and HTTP are alive, return immediately
  if (hasHttps && hasHttp) {
    return {
      ...record,
      ip: targetIp,
      protocol: 'HTTPS,HTTP',
      active: 'Yes',
      dnsResolved: true,
      openPorts: ['HTTPS', 'HTTP'],
    };
  }

  // If one of them is alive:
  if (hasHttps || hasHttp) {
    return {
      ...record,
      ip: targetIp,
      protocol: hasHttps ? 'HTTPS' : 'HTTP',
      active: 'Yes',
      dnsResolved: true,
      openPorts: hasHttps ? ['HTTPS'] : ['HTTP'],
    };
  }

  // Tier 2: Neither 80 nor 443 responded. Check alternative ports!
  const portProbes = await Promise.all(
    ALTERNATIVE_PORTS.map((p) => probeTcp(targetIp!, p.port, 1500))
  );

  const openPorts: string[] = [];
  for (const probe of portProbes) {
    if (probe.open) {
      const meta = ALTERNATIVE_PORTS.find((cp) => cp.port === probe.port);
      openPorts.push(meta ? meta.name : `TCP:${probe.port}`);
    }
  }

  const isAlive = openPorts.length > 0;
  let protocolStr = '-';
  if (isAlive) {
    protocolStr = openPorts.slice(0, 3).join(',');
  }

  return {
    ...record,
    ip: targetIp,
    protocol: protocolStr,
    active: isAlive ? 'Yes' : 'No',
    dnsResolved: true,
    openPorts,
  };
}
