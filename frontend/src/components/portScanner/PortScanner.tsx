import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Play,
  Square,
  FileSpreadsheet,
  Download,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import {
  PortResult,
  PortScanOptions,
  PortProfile,
  PortScanProgress,
  PortScanSummary,
} from '../../types/portScanner';
import {
  fetchPortScannerStatus,
  streamPortScan,
  stopPortScan,
} from '../../services/portScanner/portScannerApi';
import { exportPortScanToExcel } from '../../services/portScanner/portScannerExcelExporter';
import { PortTable } from './PortTable';

const PORT_PROFILES: PortProfile[] = [
  {
    id: 'web-devsecops',
    name: 'Web & DevSecOps',
    description: 'HTTP, HTTPS, Dev servers, SonarQube, Kube',
    ports: [80, 443, 3000, 8000, 8080, 8443, 9000, 6443],
  },
  {
    id: 'databases',
    name: 'Databases',
    description: 'MySQL, PostgreSQL, Redis, MongoDB, MSSQL, Elastic',
    ports: [1433, 3306, 5432, 6379, 9200, 27017],
  },
  {
    id: 'remote-mgmt',
    name: 'Remote & Admin',
    description: 'SSH, RDP, VNC, FTP, Telnet, SMTP, DNS',
    ports: [21, 22, 23, 25, 53, 3389, 5900],
  },
  {
    id: 'top-20',
    name: 'Top 20 Common',
    description: 'Most frequently targeted enterprise ports',
    ports: [21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 993, 995, 1723, 3306, 3389, 5900, 8080],
  },
  {
    id: 'custom',
    name: 'Custom Ports',
    description: 'Enter specific ports or ranges (e.g. 80-90, 8080)',
    ports: [],
  },
];

export const PortScanner: React.FC = () => {
  const [targetInput, setTargetInput] = useState('localhost');
  const [selectedProfile, setSelectedProfile] = useState<string>('web-devsecops');
  const [customPortsInput, setCustomPortsInput] = useState('80, 443, 8080');
  const [selectedEngine, setSelectedEngine] = useState<'auto' | 'nmap' | 'native_socket'>('auto');

  // Scanner status
  const [nmapStatus, setNmapStatus] = useState<{ nmapAvailable: boolean; nmapVersion?: string }>({
    nmapAvailable: false,
  });

  // Scan execution state
  const [isScanning, setIsScanning] = useState(false);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    scanned: number;
    total: number;
    open: number;
    currentHost?: string;
    message?: string;
  } | null>(null);

  // Results state
  const [results, setResults] = useState<PortResult[]>([]);
  const [summary, setSummary] = useState<PortScanSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cancelStreamRef = useRef<(() => void) | null>(null);

  // Check Nmap binary availability on mount
  useEffect(() => {
    fetchPortScannerStatus().then((status) => {
      setNmapStatus({
        nmapAvailable: status.nmapAvailable,
        nmapVersion: status.nmapVersion,
      });
    });
  }, []);

  const parsePortsFromCustomInput = (input: string): number[] => {
    const ports = new Set<number>();
    const tokens = input.split(',').map((t) => t.trim()).filter(Boolean);

    for (const token of tokens) {
      if (token.includes('-')) {
        const [startStr, endStr] = token.split('-').map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end <= 65535) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          // Limit custom range to max 1000 ports for safety
          const rangeLimit = Math.min(max, min + 1000);
          for (let p = min; p <= rangeLimit; p++) {
            ports.add(p);
          }
        }
      } else {
        const port = parseInt(token, 10);
        if (!isNaN(port) && port > 0 && port <= 65535) {
          ports.add(port);
        }
      }
    }

    return Array.from(ports).sort((a, b) => a - b);
  };

  const getPortsToScan = (): number[] => {
    if (selectedProfile === 'custom') {
      return parsePortsFromCustomInput(customPortsInput);
    }
    const profile = PORT_PROFILES.find((p) => p.id === selectedProfile);
    return profile ? profile.ports : [80, 443];
  };

  const handleStartScan = async () => {
    const targets = targetInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (targets.length === 0) {
      setErrorMsg('Please specify at least one target host or IP.');
      return;
    }

    const ports = getPortsToScan();
    if (ports.length === 0) {
      setErrorMsg('Please select or specify at least one valid port number.');
      return;
    }

    setErrorMsg(null);
    setIsScanning(true);
    setResults([]);
    setSummary(null);
    setProgress({ scanned: 0, total: targets.length * ports.length, open: 0 });

    const options: PortScanOptions = {
      targets,
      ports,
      engine: selectedEngine,
      timeoutMs: 1500,
      concurrency: 25,
      serviceDetection: true,
    };

    const cancelFn = await streamPortScan(
      options,
      (prog: PortScanProgress) => {
        if (prog.type === 'init') {
          setProgress({ scanned: 0, total: prog.totalPorts, open: 0 });
        } else if (prog.type === 'heartbeat') {
          setProgress((prev) => ({
            scanned: prev?.scanned || 0,
            total: prev?.total || prog.totalPorts,
            open: prev?.open || 0,
            currentHost: prog.currentHost,
            message: prog.message,
          }));
        } else if (prog.type === 'port' && prog.result) {
          setResults((prev) => [prog.result!, ...prev]);
          setProgress({
            scanned: prog.scannedPorts,
            total: prog.totalPorts,
            open: prog.openPortsCount,
            currentHost: prog.currentHost,
          });
        }
      },
      (completeSummary: PortScanSummary) => {
        setIsScanning(false);
        setSummary(completeSummary);
        setActiveScanId(null);
        cancelStreamRef.current = null;
      },
      (err: string) => {
        setIsScanning(false);
        setErrorMsg(err);
        setActiveScanId(null);
        cancelStreamRef.current = null;
      },
      (scanId: string) => {
        setActiveScanId(scanId);
      }
    );

    cancelStreamRef.current = cancelFn;
  };

  const handleStopScan = async () => {
    if (activeScanId) {
      await stopPortScan(activeScanId);
    }
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
    }
    setIsScanning(false);
  };

  const handleExportExcel = async () => {
    if (results.length === 0) return;
    const targets = targetInput.split(',').map((t) => t.trim()).filter(Boolean);
    const engine = summary?.engineUsed || selectedEngine;
    await exportPortScanToExcel(results, targets, engine);
  };

  const handleExportJson = () => {
    if (results.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(results, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `port-scan-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleReset = () => {
    setResults([]);
    setSummary(null);
    setProgress(null);
    setErrorMsg(null);
  };

  const openCount = results.filter((r) => r.state === 'open').length;
  const filteredCount = results.filter((r) => r.state === 'filtered').length;
  const closedCount = results.filter((r) => r.state === 'closed').length;

  return (
    <div className="space-y-6">
      {/* Top Controls Box */}
      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 shadow-sm space-y-4">
        {/* Header Title & Engine Status */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Port & Service Scanner</h2>
                {nmapStatus.nmapAvailable ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Nmap {nmapStatus.nmapVersion || 'Detected'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-900 border border-zinc-800 text-zinc-400">
                    Native Socket Engine
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Concurrent TCP socket probing with banner grabbing and Nmap service detection
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {results.length > 0 && !isScanning && (
              <>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800/80 transition-colors"
                  title="Clear results"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}

            {isScanning ? (
              <button
                type="button"
                onClick={handleStopScan}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Scan</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartScan}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Port Scan</span>
              </button>
            )}
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Target Input */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
              Target Hostnames or IP Addresses
            </label>
            <input
              type="text"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              disabled={isScanning}
              placeholder="e.g. scanme.nmap.org, 192.168.1.1, localhost"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Engine Selector */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
              Scan Engine
            </label>
            <select
              value={selectedEngine}
              onChange={(e) => setSelectedEngine(e.target.value as any)}
              disabled={isScanning}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500/50"
            >
              <option value="auto">
                Auto ({nmapStatus.nmapAvailable ? 'Nmap Active' : 'Native Sockets Active'})
              </option>
              <option value="nmap">
                Real Nmap (-sV Version Detection) {nmapStatus.nmapAvailable ? '✓' : '(Not installed)'}
              </option>
              <option value="native_socket">Native Node TCP Sockets (Fast)</option>
            </select>
            {!nmapStatus.nmapAvailable && selectedEngine === 'nmap' && (
              <p className="text-[10px] text-amber-400/90 font-mono mt-1">
                Notice: Nmap binary was not found on host PATH. Install Nmap (or run via Docker) for Nmap scanning.
              </p>
            )}
          </div>
        </div>

        {/* Port Profiles Pills */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
            Port Selection Profiles
          </label>
          <div className="flex flex-wrap gap-2">
            {PORT_PROFILES.map((prof) => (
              <button
                key={prof.id}
                type="button"
                onClick={() => setSelectedProfile(prof.id)}
                disabled={isScanning}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left border ${
                  selectedProfile === prof.id
                    ? 'bg-zinc-900 text-emerald-400 border-emerald-500/40 shadow-sm'
                    : 'bg-zinc-900/40 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <div className="font-semibold">{prof.name}</div>
                <div className="text-[10px] text-zinc-500 font-mono">{prof.description}</div>
              </button>
            ))}
          </div>

          {/* Custom Ports Input */}
          {selectedProfile === 'custom' && (
            <div className="mt-3">
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                Custom Ports or Ranges (comma-separated):
              </label>
              <input
                type="text"
                value={customPortsInput}
                onChange={(e) => setCustomPortsInput(e.target.value)}
                disabled={isScanning}
                placeholder="e.g. 21, 22, 80-90, 3000, 8080-8090"
                className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          )}
        </div>

        {/* Live Progress Bar (when scanning) */}
        {isScanning && progress && (
          <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{progress.message || `Scanning ${progress.currentHost || targetInput}...`}</span>
              </div>
              <span>
                {progress.scanned} / {progress.total} ports ({Math.round((progress.scanned / (progress.total || 1)) * 100)}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-150"
                style={{
                  width: `${Math.max(
                    progress.scanned > 0 ? (progress.scanned / (progress.total || 1)) * 100 : 0,
                    progress.message ? 20 : 5
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Stats (Shown when results exist) */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Tested */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 shadow-sm">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Total Probed</span>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-1">{results.length}</div>
            <span className="text-[11px] text-zinc-400 mt-0.5 block font-mono">Ports tested</span>
          </div>

          {/* Open Ports */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-500/20 shadow-sm">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">Open Ports</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{openCount}</div>
            <span className="text-[11px] text-zinc-400 mt-0.5 block font-mono">Accessible services</span>
          </div>

          {/* Filtered Ports */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/20 shadow-sm">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">Filtered</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">{filteredCount}</div>
            <span className="text-[11px] text-zinc-400 mt-0.5 block font-mono">Firewall timeout</span>
          </div>

          {/* Closed Ports */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 shadow-sm">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Closed</span>
            <div className="text-xl font-bold font-mono text-zinc-400 mt-1">{closedCount}</div>
            <span className="text-[11px] text-zinc-400 mt-0.5 block font-mono">Refused / inactive</span>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 ? (
        <PortTable results={results} />
      ) : summary ? (
        <div className="p-8 text-center rounded-2xl border border-zinc-800/80 bg-zinc-950/60">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mx-auto mb-2.5">
            <Radio className="w-5 h-5 text-zinc-500" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">Scan Completed</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 font-mono">
            Probed {summary.totalPortsScanned} ports on {summary.targets.join(', ')} using {summary.engineUsed} engine. 0 open services detected.
          </p>
        </div>
      ) : (
        !isScanning && (
          <div className="p-12 text-center rounded-2xl border-2 border-dashed border-zinc-800/80 bg-zinc-950/40">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto mb-3">
              <Radio className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">No port scans executed yet</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 font-mono">
              Enter target hostnames or IPs above and click "Start Port Scan" to begin reconnaissance.
            </p>
          </div>
        )
      )}
    </div>
  );
};
