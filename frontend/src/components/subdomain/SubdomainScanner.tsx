import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Square,
  FileSpreadsheet,
  Upload,
  ChevronDown,
  ChevronUp,
  Globe,
  Radio,
  FileDown,
} from 'lucide-react';
import { SubdomainRecord, SubdomainFilterType } from '../../types/subdomain';
import {
  parseZoneContent,
  parseZoneFile,
  checkSingleRecord,
  stopScan as stopScanApi,
  exportExcelFile,
  exportCsvFile,
} from '../../services/subdomain/subdomainApi';
import { ImportDrawer } from './ImportDrawer';
import { BatchDescriptorModal } from './BatchDescriptorModal';
import { SubdomainFilterBar } from './SubdomainFilterBar';
import { SubdomainTable } from './SubdomainTable';

export const SubdomainScanner: React.FC = () => {
  const [records, setRecords] = useState<SubdomainRecord[]>([]);
  const [origin, setOrigin] = useState('');
  const [activeFilter, setActiveFilter] = useState<SubdomainFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ completed: 0, total: 0, percent: 0 });
  const [scanId, setScanId] = useState<string | null>(null);

  // UI Panels
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Ready');
  const [isLoading, setIsLoading] = useState(false);

  // Clear any legacy preloaded sample data from localStorage on mount
  useEffect(() => {
    try {
      localStorage.removeItem('subdomain_react_records');
      localStorage.removeItem('subdomain_react_origin');
    } catch {
      // Ignore
    }
  }, []);

  // Save to localStorage when records change
  const saveRecordsToStorage = (updatedRecords: SubdomainRecord[], updatedOrigin = origin) => {
    try {
      localStorage.setItem('subdomain_react_records', JSON.stringify(updatedRecords));
      localStorage.setItem('subdomain_react_origin', updatedOrigin);
      setSaveStatus('Saved locally');
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  };

  // Parse input content from drawer
  const handleParseContent = async (text: string, originOverride: string, filterHostOnly: boolean) => {
    setIsLoading(true);
    try {
      const data = await parseZoneContent(text, originOverride, filterHostOnly);
      if (data.success) {
        setRecords(data.records);
        setOrigin(data.origin);
        saveRecordsToStorage(data.records, data.origin);
        setDrawerOpen(false);
      } else {
        alert('Parse error: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Parse error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle File Upload from drawer
  const handleFileUpload = async (file: File) => {
    try {
      const data = await parseZoneFile(file, origin, true);
      if (data.success) {
        setRecords(data.records);
        setOrigin(data.origin);
        saveRecordsToStorage(data.records, data.origin);
        setDrawerOpen(false);
      }
    } catch (err: any) {
      console.log('Client-side file parse fallback active:', err.message);
    }
  };

  // Full concurrent scan with streaming
  const startScan = async () => {
    if (records.length === 0 || isScanning) return;

    setIsScanning(true);
    const newScanId = 'scan_' + Date.now();
    setScanId(newScanId);
    setScanProgress({ completed: 0, total: records.length, percent: 0 });

    try {
      const response = await fetch('/api/scan/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records,
          concurrency: 20,
          timeout: 2500,
          scanId: newScanId,
        }),
      });

      if (!response.body) throw new Error('ReadableStream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const currentRecords = [...records];
      let lastRenderTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split('\n');
          let event = '';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              event = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.substring(6).trim();
            }
          }

          if (event === 'item' && eventData) {
            try {
              const parsed = JSON.parse(eventData);
              const { index, result, completed, total } = parsed;

              if (currentRecords[index]) {
                currentRecords[index] = {
                  ...currentRecords[index],
                  protocol: result.protocol,
                  active: result.active,
                  ip: result.ip || currentRecords[index].ip,
                };
              }

              const now = Date.now();
              if (now - lastRenderTime > 80 || completed === total) {
                lastRenderTime = now;
                setRecords([...currentRecords]);
                setScanProgress({
                  completed,
                  total,
                  percent: Math.round((completed / total) * 100),
                });
              }
            } catch (e) {
              console.error('Parse error', e);
            }
          }
        }
      }

      setRecords([...currentRecords]);
      saveRecordsToStorage(currentRecords);
    } catch (err) {
      console.error('Scan stream error', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Stop running scan
  const stopScan = async () => {
    if (!isScanning || !scanId) return;
    await stopScanApi(scanId);
    setIsScanning(false);
  };

  // Single row re-check
  const checkSingleRow = async (index: number) => {
    const target = records[index];
    if (!target) return;

    setRecords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], _scanning: true };
      return updated;
    });

    try {
      const data = await checkSingleRecord(target);
      if (data.success) {
        setRecords((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            protocol: data.result.protocol,
            active: data.result.active,
            ip: data.result.ip || updated[index].ip,
            _scanning: false,
          };
          saveRecordsToStorage(updated);
          return updated;
        });
      }
    } catch (err) {
      console.error('Single check failed', err);
      setRecords((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], _scanning: false };
        return updated;
      });
    }
  };

  // Descriptor edit
  const handleDescriptorChange = (index: number, val: string) => {
    setRecords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], descriptor: val };
      saveRecordsToStorage(updated);
      return updated;
    });
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = async () => {
    if (records.length === 0) return;
    try {
      const domainName = origin || 'domain';
      const filename = `Subdomain_MasterSheet_${domainName}.xlsx`;
      await exportExcelFile(records, filename);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  // Export to CSV
  const handleExportCsv = async () => {
    if (records.length === 0) return;
    try {
      const domainName = origin || 'domain';
      const filename = `Subdomain_MasterSheet_${domainName}.csv`;
      await exportCsvFile(records, filename);
    } catch (err: any) {
      alert('CSV export failed: ' + err.message);
    }
  };

  // Batch Descriptor
  const handleApplyBatchDescriptor = (batchIp: string, batchDescriptor: string) => {
    setRecords((prev) => {
      const updated = prev.map((r) => {
        if (r.ip === batchIp) {
          return { ...r, descriptor: batchDescriptor };
        }
        return r;
      });
      saveRecordsToStorage(updated);
      return updated;
    });
  };

  // Clear all descriptors
  const handleClearDescriptors = () => {
    if (window.confirm('Clear all manual Descriptors?')) {
      const cleared = records.map((r) => ({ ...r, descriptor: '' }));
      setRecords(cleared);
      saveRecordsToStorage(cleared);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let pending = 0;
    records.forEach((r) => {
      if (r.active === 'Yes') active++;
      else if (r.active === 'No') inactive++;
      else pending++;
    });
    return { total: records.length, active, inactive, pending };
  }, [records]);

  // Unique IP options for batch tool
  const uniqueIps = useMemo<[string, number][]>(() => {
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      if (r.ip && r.ip.trim()) {
        counts[r.ip] = (counts[r.ip] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [records]);

  // Filtered & Sorted list
  const filteredRecords = useMemo(() => {
    let list = records.map((r, i) => ({ ...r, _originalIndex: i }));

    // 1. Tab filter
    if (activeFilter === 'active') {
      list = list.filter((r) => r.active === 'Yes');
    } else if (activeFilter === 'inactive') {
      list = list.filter((r) => r.active === 'No');
    } else if (activeFilter === 'pending') {
      list = list.filter((r) => !r.active);
    }

    // 2. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.subdomain && r.subdomain.toLowerCase().includes(q)) ||
          (r.ip && r.ip.toLowerCase().includes(q)) ||
          (r.fqdn && r.fqdn.toLowerCase().includes(q)) ||
          (r.protocol && r.protocol.toLowerCase().includes(q)) ||
          (r.descriptor && r.descriptor.toLowerCase().includes(q))
      );
    }

    // 3. Sort
    if (sortKey) {
      list.sort((a, b) => {
        const va = ((a as any)[sortKey] || '').toLowerCase();
        const vb = ((b as any)[sortKey] || '').toLowerCase();
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [records, activeFilter, searchQuery, sortKey, sortAsc]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className="flex flex-col w-full bg-black border border-[#27272a] rounded-xl shadow-sm overflow-hidden relative">
      {/* Subdomain Toolbar Header */}
      <header className="bg-[#09090b] border-b border-[#27272a] px-5 sm:px-6 py-3.5">
        <div className="w-full flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo, Status & Domain Tag */}
          <div className="flex items-center gap-3.5 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center text-white">
                <Radio className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-xs font-bold tracking-wider uppercase text-white font-mono">
                  SUBDOMAIN MASTER SHEET
                </h2>
                <span className="text-[11px] text-[#71717a] font-mono">
                  Multi-vector DNS resolution & HTTP/HTTPS probe suite
                </span>
              </div>
            </div>

            {origin && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-black text-[#e4e4e7] border border-[#27272a] font-mono font-medium flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#71717a]" />
                <span>Origin: {origin}</span>
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-black hover:bg-[#18181b] text-[#e4e4e7] border border-[#27272a] transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-[#a1a1aa]" />
              <span>Import Zone</span>
              {drawerOpen ? <ChevronUp className="w-3 h-3 ml-0.5 text-[#71717a]" /> : <ChevronDown className="w-3 h-3 ml-0.5 text-[#71717a]" />}
            </button>

            {!isScanning ? (
              <button
                onClick={startScan}
                disabled={records.length === 0}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-[#f4f4f5] disabled:opacity-40 text-black shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Full Scan</span>
              </button>
            ) : (
              <button
                onClick={stopScan}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-colors flex items-center gap-1.5 animate-pulse"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Scan</span>
              </button>
            )}

            <div className="h-4 w-px bg-[#27272a] mx-1" />

            <button
              onClick={handleExportExcel}
              disabled={records.length === 0}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#18181b] hover:bg-[#27272a] disabled:opacity-40 text-white border border-[#27272a] transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export .xlsx</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={records.length === 0}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-black hover:bg-[#18181b] disabled:opacity-40 text-[#a1a1aa] hover:text-white border border-[#27272a] transition-colors flex items-center gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5 text-[#71717a]" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Scanning Live Velocity & Progress Bar */}
        {isScanning && (
          <div className="mt-3 pt-3 border-t border-[#27272a] animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-mono text-[#a1a1aa] mb-1.5">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Streaming live probe responses:</span>
                <span className="text-white font-medium">{scanProgress.completed} of {scanProgress.total} finished</span>
              </span>
              <span className="text-white font-medium px-2 py-0.5 rounded bg-black border border-[#27272a]">
                {scanProgress.percent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#18181b] rounded-full overflow-hidden border border-[#27272a]">
              <div
                className="h-full bg-white transition-all duration-150"
                style={{ width: `${scanProgress.percent}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Collapsible Import Drawer */}
      <ImportDrawer
        isOpen={drawerOpen}
        onParse={handleParseContent}
        onFileUpload={handleFileUpload}
        isLoading={isLoading}
        defaultOrigin={origin}
      />

      {/* Filter and Utility Bar */}
      <SubdomainFilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        metrics={metrics}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenBatchModal={() => setBatchModalOpen(true)}
        onClearDescriptors={handleClearDescriptors}
        saveStatus={saveStatus}
      />

      {/* Main Full-Width Table */}
      <SubdomainTable
        records={filteredRecords}
        sortKey={sortKey}
        sortAsc={sortAsc}
        onSort={handleSort}
        onDescriptorChange={handleDescriptorChange}
        onCheckSingleRow={checkSingleRow}
      />

      {/* Batch Descriptor Modal */}
      <BatchDescriptorModal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        uniqueIps={uniqueIps}
        onApply={handleApplyBatchDescriptor}
      />
    </div>
  );
};
