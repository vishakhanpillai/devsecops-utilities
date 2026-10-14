import {
  SubdomainRecord,
  ParseApiResponse,
} from '../../types/subdomain';

export async function parseZoneContent(
  text: string,
  origin = '',
  filterHostOnly = true
): Promise<ParseApiResponse> {
  const res = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      origin: origin.trim(),
      filterHostOnly,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Parse failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function parseZoneFile(
  file: File,
  origin = '',
  filterHostOnly = true
): Promise<ParseApiResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('origin', origin.trim());
  formData.append('filterHostOnly', String(filterHostOnly));

  const res = await fetch('/api/parse', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Parse failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function checkSingleRecord(
  record: SubdomainRecord,
  timeout = 2500
): Promise<{ success: boolean; result: SubdomainRecord }> {
  const res = await fetch('/api/check-single', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record, timeout }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Single check failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function stopScan(scanId: string): Promise<void> {
  await fetch('/api/scan/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scanId }),
  }).catch((err) => console.error('Stop scan error', err));
}

export async function exportExcelFile(
  records: SubdomainRecord[],
  filename: string
): Promise<void> {
  const res = await fetch('/api/export/excel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rows: records,
      filename,
    }),
  });
  if (!res.ok) {
    throw new Error('Failed to generate Excel file');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportCsvFile(
  records: SubdomainRecord[],
  filename: string
): Promise<void> {
  const res = await fetch('/api/export/csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rows: records,
      filename,
    }),
  });
  if (!res.ok) {
    throw new Error('CSV export failed');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
