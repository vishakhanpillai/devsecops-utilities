import { DnsRecord, ParseResult } from '../types/subdomain.types';

/**
 * Parser for BIND DNS Zone files.
 */
export function parseZoneFile(text: string, defaultOrigin = ''): ParseResult {
  const lines = text.split(/\r?\n/);
  let currentOrigin = defaultOrigin.replace(/\.$/, '');
  const records: DnsRecord[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Check for $ORIGIN
    const originMatch = line.match(/^\$ORIGIN\s+([^\s;]+)/i);
    if (originMatch) {
      currentOrigin = originMatch[1].replace(/\.$/, '');
      continue;
    }

    // Skip comment lines
    if (line.startsWith(';')) continue;

    // Remove inline comments
    const commentIndex = line.indexOf(';');
    if (commentIndex !== -1) {
      line = line.substring(0, commentIndex).trim();
    }
    if (!line) continue;

    // Split by whitespace
    const tokens = line.split(/\s+/);
    if (tokens.length < 3) continue;

    const name = tokens[0];
    let ttl = '3600 IN';
    let dnsClass = 'IN';
    let type = '';

    // Parse tokens after name
    let idx = 1;

    // Check if next token is TTL (numeric)
    if (idx < tokens.length && /^\d+$/.test(tokens[idx])) {
      const ttlNum = tokens[idx];
      idx++;
      if (idx < tokens.length && tokens[idx].toUpperCase() === 'IN') {
        ttl = `${ttlNum} IN`;
        dnsClass = 'IN';
        idx++;
      } else {
        ttl = `${ttlNum} IN`;
      }
    } else if (idx < tokens.length && tokens[idx].toUpperCase() === 'IN') {
      dnsClass = 'IN';
      idx++;
      if (idx < tokens.length && /^\d+$/.test(tokens[idx])) {
        ttl = `${tokens[idx]} IN`;
        idx++;
      }
    }

    // Next token should be record type (A, AAAA, CNAME, TXT, MX, SRV, NS, SOA, etc.)
    if (idx < tokens.length) {
      type = tokens[idx].toUpperCase();
      idx++;
    }

    const rdataTokens = tokens.slice(idx);
    const rdata = rdataTokens.join(' ');

    // Normalize subdomain and FQDN
    let subdomain = name;
    let fqdn = '';

    if (name === '@') {
      subdomain = '@';
      fqdn = currentOrigin || 'root';
    } else if (name.endsWith('.')) {
      fqdn = name.slice(0, -1);
      if (currentOrigin && fqdn.endsWith('.' + currentOrigin)) {
        subdomain = fqdn.slice(0, -(currentOrigin.length + 1));
      } else {
        subdomain = fqdn;
      }
    } else {
      subdomain = name;
      fqdn = currentOrigin ? `${name}.${currentOrigin}` : name;
    }

    // Extract primary IP if type is A or AAAA
    let ip = '';
    if (type === 'A' || type === 'AAAA') {
      ip = rdataTokens[0] || '';
    } else if (type === 'CNAME') {
      ip = rdataTokens[0] ? rdataTokens[0].replace(/\.$/, '') : '';
    } else {
      ip = rdata;
    }

    records.push({
      subdomain,
      ttl,
      class: dnsClass,
      type,
      ip,
      fqdn,
      protocol: '',
      active: '',
      descriptor: '',
    });
  }

  return { origin: currentOrigin, records };
}

/**
 * Fallback parser for plain subdomain list (one per line, TSV, or CSV).
 */
export function parsePlainList(text: string, origin = ''): ParseResult {
  const lines = text.split(/\r?\n/);
  const cleanOrigin = origin.trim().replace(/^\./, '').replace(/\.$/, '');
  const records: DnsRecord[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    // Check if line contains CSV or Tab
    if (line.includes('\t') || line.includes(',')) {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      const item = parts[0].trim();
      const ip = (parts[1] || '').trim();
      let fqdn = item;
      let sub = item;
      if (cleanOrigin && !item.includes('.')) {
        fqdn = `${item}.${cleanOrigin}`;
      } else if (cleanOrigin && item.endsWith(`.${cleanOrigin}`)) {
        sub = item.slice(0, -(cleanOrigin.length + 1));
      }
      records.push({
        subdomain: sub,
        ttl: '3600 IN',
        class: 'IN',
        type: ip.includes(':') ? 'AAAA' : (ip ? 'A' : 'A'),
        ip: ip,
        fqdn: fqdn,
        protocol: '',
        active: '',
        descriptor: (parts[2] || '').trim(),
      });
      continue;
    }

    let sub = line;
    let fqdn = line;

    if (cleanOrigin && !line.includes('.')) {
      fqdn = `${line}.${cleanOrigin}`;
    } else if (cleanOrigin && line.endsWith(`.${cleanOrigin}`)) {
      sub = line.slice(0, -(cleanOrigin.length + 1));
    }

    records.push({
      subdomain: sub,
      ttl: '3600 IN',
      class: 'IN',
      type: 'A',
      ip: '',
      fqdn: fqdn,
      protocol: '',
      active: '',
      descriptor: '',
    });
  }

  return { origin: cleanOrigin, records };
}

/**
 * Universal auto-detecting parser.
 */
export function parseInput(text: string, origin = ''): ParseResult {
  if (text.includes('$ORIGIN') || text.includes(' IN ') || text.includes('\tIN\t')) {
    const res = parseZoneFile(text, origin);
    if (res.records.length > 0) return res;
  }
  return parsePlainList(text, origin);
}
