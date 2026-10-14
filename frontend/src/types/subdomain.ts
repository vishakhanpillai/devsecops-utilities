export interface SubdomainRecord {
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

export type SubdomainFilterType = 'all' | 'active' | 'inactive' | 'pending';

export interface ScanProgressState {
  completed: number;
  total: number;
  percent: number;
}

export interface SubdomainMetrics {
  total: number;
  active: number;
  inactive: number;
  pending: number;
}

export interface ParseApiResponse {
  success: boolean;
  origin: string;
  totalCount?: number;
  records: SubdomainRecord[];
  error?: string;
}
