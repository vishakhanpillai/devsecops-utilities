export type PortScanEngine = 'nmap' | 'native_socket';

export type PortState = 'open' | 'filtered' | 'closed';

export interface PortResult {
  host: string;
  ip?: string;
  port: number;
  protocol: 'tcp' | 'udp';
  state: PortState;
  service?: string;
  product?: string;
  version?: string;
  banner?: string;
  latencyMs?: number;
}

export interface PortScanOptions {
  targets: string[];
  ports: number[];
  timeoutMs?: number;
  concurrency?: number;
  engine?: 'auto' | 'nmap' | 'native_socket';
  serviceDetection?: boolean;
}

export interface PortScanProgress {
  type: 'init' | 'port' | 'progress' | 'complete' | 'error' | 'stopped' | 'heartbeat';
  scanId: string;
  totalPorts: number;
  scannedPorts: number;
  openPortsCount: number;
  currentHost?: string;
  result?: PortResult;
  message?: string;
}

export interface PortScanSummary {
  scanId: string;
  engineUsed: PortScanEngine;
  targets: string[];
  totalPortsScanned: number;
  openCount: number;
  filteredCount: number;
  closedCount: number;
  durationMs: number;
  results: PortResult[];
}

export interface PortProfile {
  id: string;
  name: string;
  description: string;
  ports: number[];
}
