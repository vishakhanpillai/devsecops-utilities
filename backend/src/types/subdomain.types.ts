export interface DnsRecord {
  subdomain: string;
  ttl: string;
  class: string;
  type: string;
  ip: string;
  fqdn: string;
  protocol: string;
  active: 'Yes' | 'No' | '' | string;
  descriptor: string;
  dnsResolved?: boolean;
  openPorts?: string[];
  error?: string;
  _originalIndex?: number;
  _scanning?: boolean;
}

export interface ParseResult {
  origin: string;
  records: DnsRecord[];
}

export interface CheckOptions {
  timeout?: number;
}

export interface AlternativePort {
  port: number;
  name: string;
}
