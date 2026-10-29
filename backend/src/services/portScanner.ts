import net from 'net';
import fs from 'fs';
import { spawn } from 'child_process';
import {
  PortResult,
  PortScanOptions,
  PortScanProgress,
  PortScanSummary,
  PortState,
} from '../types/portScanner.types';

// Standard common ports to service names mapping
export const COMMON_SERVICES: Record<number, string> = {
  20: 'ftp-data',
  21: 'ftp',
  22: 'ssh',
  23: 'telnet',
  25: 'smtp',
  53: 'domain (dns)',
  80: 'http',
  110: 'pop3',
  143: 'imap',
  443: 'https',
  465: 'smtps',
  587: 'submission',
  993: 'imaps',
  995: 'pop3s',
  1433: 'ms-sql-s',
  1521: 'oracle',
  2049: 'nfs',
  3000: 'node/dev-app',
  3306: 'mysql',
  3389: 'ms-wbt-server (rdp)',
  5000: 'upnp/docker-registry',
  5432: 'postgresql',
  5900: 'vnc',
  6379: 'redis',
  6443: 'k8s-api',
  8000: 'http-alt',
  8080: 'http-proxy',
  8443: 'https-alt',
  8888: 'http-alt',
  9000: 'sonarqube/portainer',
  9090: 'prometheus/cockpit',
  9200: 'elasticsearch',
  9418: 'git',
  27017: 'mongodb',
};

// Known Windows default installation locations for Nmap
const WINDOWS_NMAP_PATHS = [
  'C:\\Program Files (x86)\\Nmap\\nmap.exe',
  'C:\\Program Files\\Nmap\\nmap.exe',
  'C:\\nmap\\nmap.exe',
  'D:\\nmap\\nmap.exe',
];

/**
 * Locate the nmap binary across operating systems (PATH, common Windows paths, or NMAP_PATH env)
 */
export async function resolveNmapExecutable(): Promise<string | null> {
  // 1. Explicit environment override
  if (process.env.NMAP_PATH && fs.existsSync(process.env.NMAP_PATH)) {
    return process.env.NMAP_PATH;
  }

  // 2. Windows specific directory checks
  if (process.platform === 'win32') {
    for (const p of WINDOWS_NMAP_PATHS) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }

  // 3. Test if 'nmap' is discoverable on PATH
  return new Promise((resolve) => {
    try {
      const proc = spawn('nmap', ['--version'], {
        shell: process.platform === 'win32',
        windowsHide: true,
      });

      proc.on('error', () => resolve(null));
      proc.on('close', (code) => {
        if (code === 0) resolve('nmap');
        else resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

// Cache status of Nmap detection
let nmapCache: { available: boolean; version?: string; binaryPath?: string } | null = null;

export async function checkNmapAvailable(forceRefresh = false): Promise<{
  available: boolean;
  version?: string;
  binaryPath?: string;
}> {
  if (nmapCache && !forceRefresh) return nmapCache;

  const binary = await resolveNmapExecutable();
  if (!binary) {
    nmapCache = { available: false };
    return nmapCache;
  }

  return new Promise((resolve) => {
    try {
      const proc = spawn(binary, ['--version'], {
        shell: process.platform === 'win32',
        windowsHide: true,
      });
      let output = '';

      proc.stdout.on('data', (d) => {
        output += d.toString();
      });

      proc.on('error', () => {
        nmapCache = { available: false };
        resolve({ available: false });
      });

      proc.on('close', (code) => {
        if (code === 0 && output) {
          const match = output.match(/Nmap version ([^\s]+)/i);
          const version = match ? match[1] : output.split('\n')[0].trim();
          nmapCache = { available: true, version, binaryPath: binary };
          resolve({ available: true, version, binaryPath: binary });
        } else {
          nmapCache = { available: false };
          resolve({ available: false });
        }
      });
    } catch {
      nmapCache = { available: false };
      resolve({ available: false });
    }
  });
}

/**
 * Scan a single port using Node.js native TCP sockets
 */
export function scanNativePort(
  host: string,
  port: number,
  timeoutMs = 1500
): Promise<PortResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let banner = '';
    let state: PortState = 'closed';

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      state = 'open';
      // For HTTP/HTTPS, send small probe to elicit a banner
      if ([80, 8080, 8000, 3000].includes(port)) {
        socket.write('HEAD / HTTP/1.0\r\n\r\n');
      }
    });

    socket.on('data', (data) => {
      banner += data.toString('utf8');
      socket.destroy();
    });

    socket.on('timeout', () => {
      state = 'filtered';
      socket.destroy();
    });

    socket.on('error', (err: any) => {
      if (err.code === 'ECONNREFUSED') {
        state = 'closed';
      } else if (err.code === 'EHOSTUNREACH' || err.code === 'ETIMEDOUT') {
        state = 'filtered';
      } else {
        state = 'closed';
      }
      socket.destroy();
    });

    socket.on('close', () => {
      const latencyMs = Date.now() - start;
      const defaultService = COMMON_SERVICES[port] || 'unknown';

      let extractedBanner: string | undefined;
      let service = defaultService;

      if (banner) {
        const cleanBanner = banner.trim();
        // SSH Banner
        if (cleanBanner.startsWith('SSH-')) {
          service = 'ssh';
          extractedBanner = cleanBanner.split('\n')[0];
        } else if (cleanBanner.includes('HTTP/')) {
          const serverHeader = cleanBanner.match(/Server:\s*([^\r\n]+)/i);
          if (serverHeader) {
            extractedBanner = serverHeader[1].trim();
          }
        } else {
          extractedBanner = cleanBanner.slice(0, 100);
        }
      }

      resolve({
        host,
        port,
        protocol: 'tcp',
        state,
        service,
        banner: extractedBanner,
        latencyMs,
      });
    });

    socket.connect(port, host);
  });
}

/**
 * Native Socket Concurrent Port Scanner
 */
export async function runNativeSocketScan(
  options: PortScanOptions,
  scanId: string,
  onProgress: (prog: PortScanProgress) => void,
  isCancelled: () => boolean
): Promise<PortScanSummary> {
  const { targets, ports, timeoutMs = 1500, concurrency = 20 } = options;
  const startTime = Date.now();

  const allTasks: { host: string; port: number }[] = [];
  for (const host of targets) {
    for (const port of ports) {
      allTasks.push({ host, port });
    }
  }

  const totalPorts = allTasks.length;
  let scannedPorts = 0;
  let openCount = 0;
  let filteredCount = 0;
  let closedCount = 0;
  const results: PortResult[] = [];

  let taskIndex = 0;

  async function worker() {
    while (taskIndex < allTasks.length) {
      if (isCancelled()) break;
      const currentIndex = taskIndex++;
      const task = allTasks[currentIndex];

      const res = await scanNativePort(task.host, task.port, timeoutMs);
      results.push(res);
      scannedPorts++;

      if (res.state === 'open') openCount++;
      else if (res.state === 'filtered') filteredCount++;
      else closedCount++;

      onProgress({
        type: 'port',
        scanId,
        totalPorts,
        scannedPorts,
        openPortsCount: openCount,
        currentHost: task.host,
        result: res,
      });
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, totalPorts) }, () => worker());
  await Promise.all(workers);

  return {
    scanId,
    engineUsed: 'native_socket',
    targets,
    totalPortsScanned: scannedPorts,
    openCount,
    filteredCount,
    closedCount,
    durationMs: Date.now() - startTime,
    results,
  };
}

/**
 * Parse Nmap XML output to PortResults with full <extraports> and <status> fallback
 */
export function parseNmapXml(
  xml: string,
  fallbackHost: string,
  requestedPorts: number[] = []
): PortResult[] {
  const results: PortResult[] = [];
  const hostMatches = xml.match(/<host[\s\S]*?<\/host>/g) || [];

  // If no <host> block was found in XML (or target was skipped), synthesize results for requested ports
  if (hostMatches.length === 0 && requestedPorts.length > 0) {
    for (const port of requestedPorts) {
      results.push({
        host: fallbackHost,
        port,
        protocol: 'tcp',
        state: 'closed',
        service: COMMON_SERVICES[port] || 'unknown',
      });
    }
    return results;
  }

  for (const hostXml of hostMatches) {
    // Extract IP or hostname
    const addrMatch = hostXml.match(/<address\s+addr="([^"]+)"/);
    const hostIp = addrMatch ? addrMatch[1] : fallbackHost;

    const hostnameMatch = hostXml.match(/<hostname\s+name="([^"]+)"/);
    const hostName = hostnameMatch ? hostnameMatch[1] : hostIp;

    // Check host status (up vs down)
    const statusMatch = hostXml.match(/<status\s+state="([^"]+)"/);
    const isHostUp = statusMatch ? statusMatch[1] === 'up' : true;

    // Check default extraports state (e.g. <extraports state="closed" count="8">)
    const extraportsMatch = hostXml.match(/<extraports\s+state="([^"]+)"/);
    const extraportsState: PortState =
      extraportsMatch && extraportsMatch[1] === 'filtered'
        ? 'filtered'
        : extraportsMatch && extraportsMatch[1] === 'open'
        ? 'open'
        : 'closed';

    const parsedPortNumbers = new Set<number>();

    // Extract ports explicitly listed
    const portMatches = hostXml.match(/<port\s+protocol="([^"]+)"\s+portid="([^"]+)">[\s\S]*?<\/port>/g) || [];

    for (const portXml of portMatches) {
      const portInfo = portXml.match(/<port\s+protocol="([^"]+)"\s+portid="([^"]+)">/);
      if (!portInfo) continue;

      const protocol = (portInfo[1] === 'udp' ? 'udp' : 'tcp') as 'tcp' | 'udp';
      const portNum = parseInt(portInfo[2], 10);
      parsedPortNumbers.add(portNum);

      // State
      const stateMatch = portXml.match(/<state\s+state="([^"]+)"/);
      const rawState = stateMatch ? stateMatch[1] : 'closed';
      const state: PortState =
        rawState === 'open' ? 'open' : rawState === 'filtered' ? 'filtered' : 'closed';

      // Service & Version detection
      const serviceMatch = portXml.match(/<service\s+name="([^"]+)"(?:\s+product="([^"]*)")?(?:\s+version="([^"]*)")?(?:\s+extrainfo="([^"]*)")?/);
      let serviceName = COMMON_SERVICES[portNum] || 'unknown';
      let product: string | undefined;
      let version: string | undefined;

      if (serviceMatch) {
        serviceName = serviceMatch[1] || serviceName;
        product = serviceMatch[2] || undefined;
        version = serviceMatch[3] || undefined;
      }

      let banner: string | undefined;
      if (product || version) {
        banner = [product, version].filter(Boolean).join(' ');
      }

      results.push({
        host: hostName,
        ip: hostIp,
        port: portNum,
        protocol,
        state,
        service: serviceName,
        product,
        version,
        banner,
      });
    }

    // For any port that was requested but collapsed into <extraports> (or if host blocked ping)
    if (requestedPorts.length > 0) {
      for (const reqPort of requestedPorts) {
        if (!parsedPortNumbers.has(reqPort)) {
          results.push({
            host: hostName,
            ip: hostIp,
            port: reqPort,
            protocol: 'tcp',
            state: isHostUp ? extraportsState : 'closed',
            service: COMMON_SERVICES[reqPort] || 'unknown',
          });
        }
      }
    }
  }

  // Keep results sorted by port number
  return results.sort((a, b) => a.port - b.port);
}

/**
 * Execute real Nmap scan with unprivileged flags, -Pn host discovery bypass, and real-time heartbeat
 */
export async function runNmapScan(
  options: PortScanOptions,
  scanId: string,
  onProgress: (prog: PortScanProgress) => void,
  isCancelled: () => boolean
): Promise<PortScanSummary> {
  const { targets, ports, serviceDetection = true } = options;
  const startTime = Date.now();
  const totalPorts = targets.length * ports.length;

  const nmapStatus = await checkNmapAvailable();
  const binaryPath = nmapStatus.binaryPath;
  if (!nmapStatus.available || !binaryPath) {
    throw new Error(
      'Nmap binary not found on this system. Install Nmap (https://nmap.org) or run via Docker, or switch to the Native Node TCP Sockets engine.'
    );
  }

  const portListStr = ports.join(',');
  // Flags designed for unprivileged, firewalled, and Docker environments:
  // -Pn: Treat all hosts as online (skips ICMP ping which fails for non-root and is blocked by firewalls)
  // -sT: Unprivileged TCP connect scan (safe in Docker 'USER node' and Windows non-admin)
  // --unprivileged: Avoids raw socket calls
  // -T4: Aggressive timing template
  const args = [
    '-Pn',
    '-sT',
    '--unprivileged',
    '-T4',
    '-p',
    portListStr,
    '-oX',
    '-',
    ...targets,
  ];

  if (serviceDetection) {
    args.unshift('-sV');
  }

  return new Promise((resolve, reject) => {
    let xmlOutput = '';
    let stderrOutput = '';

    const proc = spawn(binaryPath, args, {
      shell: process.platform === 'win32',
      windowsHide: true,
    }) as any;

    // Provide real-time heartbeat updates while Nmap performs deep service & version analysis
    let elapsedSeconds = 0;
    const heartbeatTimer = setInterval(() => {
      elapsedSeconds++;
      if (isCancelled()) {
        try {
          proc.kill();
        } catch {
          // ignore
        }
        clearInterval(heartbeatTimer);
        return;
      }

      onProgress({
        type: 'heartbeat',
        scanId,
        totalPorts,
        scannedPorts: 0,
        openPortsCount: 0,
        currentHost: targets[0],
        message: `Nmap is probing ports and detecting service versions (-sV)... (${elapsedSeconds}s)`,
      });
    }, 1000);

    proc.stdout.on('data', (d: Buffer | string) => {
      xmlOutput += d.toString();
    });

    proc.stderr.on('data', (d: Buffer | string) => {
      stderrOutput += d.toString();
    });

    proc.on('error', (err: Error) => {
      clearInterval(heartbeatTimer);
      reject(err);
    });

    proc.on('close', (code: number | null) => {
      clearInterval(heartbeatTimer);

      if (isCancelled()) {
        resolve({
          scanId,
          engineUsed: 'nmap',
          targets,
          totalPortsScanned: 0,
          openCount: 0,
          filteredCount: 0,
          closedCount: 0,
          durationMs: Date.now() - startTime,
          results: [],
        });
        return;
      }

      if (code === 0 || xmlOutput.includes('</nmaprun>')) {
        const results = parseNmapXml(xmlOutput, targets[0] || 'localhost', ports);
        const openCount = results.filter((r) => r.state === 'open').length;
        const filteredCount = results.filter((r) => r.state === 'filtered').length;
        const closedCount = results.filter((r) => r.state === 'closed').length;

        results.forEach((r, idx) => {
          onProgress({
            type: 'port',
            scanId,
            totalPorts: results.length,
            scannedPorts: idx + 1,
            openPortsCount: openCount,
            currentHost: r.host,
            result: r,
          });
        });

        resolve({
          scanId,
          engineUsed: 'nmap',
          targets,
          totalPortsScanned: results.length,
          openCount,
          filteredCount,
          closedCount,
          durationMs: Date.now() - startTime,
          results,
        });
      } else {
        const errMsg = stderrOutput.trim() || `Nmap process exited with code ${code}`;
        reject(new Error(errMsg));
      }
    });
  });
}
