import {
  PortScanOptions,
  PortScanProgress,
  PortScanSummary,
} from '../../types/portScanner';

export async function fetchPortScannerStatus(): Promise<{
  nmapAvailable: boolean;
  nmapVersion?: string;
  enginesSupported: string[];
}> {
  try {
    const res = await fetch('/api/scan/ports/status');
    if (!res.ok) throw new Error('Status check failed');
    return await res.json();
  } catch {
    return { nmapAvailable: false, enginesSupported: ['native_socket'] };
  }
}

export async function stopPortScan(scanId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/scan/ports/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function streamPortScan(
  options: PortScanOptions,
  onProgress: (prog: PortScanProgress) => void,
  onComplete: (summary: PortScanSummary) => void,
  onError: (err: string) => void,
  onScanIdReady?: (scanId: string) => void
): Promise<() => void> {
  const controller = new AbortController();

  try {
    const response = await fetch('/api/scan/ports/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      const errText = await response.text();
      throw new Error(errText || 'Failed to start port scan stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const block of lines) {
            const eventMatch = block.match(/event:\s*([^\n]+)/);
            const dataMatch = block.match(/data:\s*([\s\S]+)/);

            if (eventMatch && dataMatch) {
              const eventType = eventMatch[1].trim();
              const eventData = JSON.parse(dataMatch[1].trim());

              if (eventType === 'init') {
                if (onScanIdReady && eventData.scanId) {
                  onScanIdReady(eventData.scanId);
                }
                onProgress({ ...eventData, type: 'init' });
              } else if (eventType === 'port') {
                onProgress(eventData);
              } else if (eventType === 'heartbeat') {
                onProgress({ ...eventData, type: 'heartbeat' });
              } else if (eventType === 'complete') {
                onComplete(eventData);
              } else if (eventType === 'stopped') {
                onProgress({ type: 'stopped', ...eventData });
              } else if (eventType === 'error') {
                onError(eventData.error || 'Port scan error');
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          onError(err.message || 'Stream connection closed unexpectedly');
        }
      }
    })();
  } catch (err: any) {
    onError(err.message || 'Failed to connect to port scanner API');
  }

  return () => {
    controller.abort();
  };
}
