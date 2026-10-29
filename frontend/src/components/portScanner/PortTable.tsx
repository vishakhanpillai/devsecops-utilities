import React, { useState, useMemo } from 'react';
import {
  Search,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PortResult, PortState } from '../../types/portScanner';

interface PortTableProps {
  results: PortResult[];
}

export const PortTable: React.FC<PortTableProps> = ({ results }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | PortState>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [copied, setCopied] = useState(false);

  const openPorts = useMemo(() => {
    return results.filter((r) => r.state === 'open');
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (stateFilter !== 'all' && r.state !== stateFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesHost = r.host.toLowerCase().includes(query);
        const matchesIp = (r.ip || '').toLowerCase().includes(query);
        const matchesPort = r.port.toString().includes(query);
        const matchesService = (r.service || '').toLowerCase().includes(query);
        const matchesBanner = (r.banner || r.product || '').toLowerCase().includes(query);
        if (!matchesHost && !matchesIp && !matchesPort && !matchesService && !matchesBanner) {
          return false;
        }
      }
      return true;
    });
  }, [results, stateFilter, searchQuery]);

  const totalPages = Math.ceil(filteredResults.length / pageSize) || 1;
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResults.slice(start, start + pageSize);
  }, [filteredResults, currentPage, pageSize]);

  const handleCopyOpenPorts = () => {
    const portsStr = Array.from(new Set(openPorts.map((r) => r.port)))
      .sort((a, b) => a - b)
      .join(', ');
    navigator.clipboard.writeText(portsStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStateBadge = (state: PortState) => {
    switch (state) {
      case 'open':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>OPEN</span>
          </span>
        );
      case 'filtered':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>FILTERED</span>
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded font-mono text-[10px] font-medium bg-zinc-800 text-zinc-500 border border-zinc-700/50">
            <span>CLOSED</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search host, port, service, or banner..."
            className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 font-mono"
          />
        </div>

        {/* State Filter Pills & Copy */}
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800/80 text-xs">
            <button
              onClick={() => {
                setStateFilter('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                stateFilter === 'all' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              All ({results.length})
            </button>
            <button
              onClick={() => {
                setStateFilter('open');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                stateFilter === 'open' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Open ({openPorts.length})
            </button>
            <button
              onClick={() => {
                setStateFilter('filtered');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                stateFilter === 'filtered' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Filtered ({results.filter((r) => r.state === 'filtered').length})
            </button>
            <button
              onClick={() => {
                setStateFilter('closed');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                stateFilter === 'closed' ? 'bg-zinc-800 text-zinc-300' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Closed ({results.filter((r) => r.state === 'closed').length})
            </button>
          </div>

          {openPorts.length > 0 && (
            <button
              onClick={handleCopyOpenPorts}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 transition-colors"
              title="Copy open port numbers as comma-separated list"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copied ? 'Copied!' : 'Copy Open Ports'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-900/50 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <th className="py-2.5 px-4 font-semibold">Target Host / IP</th>
                <th className="py-2.5 px-4 font-semibold w-24">Port</th>
                <th className="py-2.5 px-4 font-semibold w-24">Protocol</th>
                <th className="py-2.5 px-4 font-semibold w-28">State</th>
                <th className="py-2.5 px-4 font-semibold w-36">Service</th>
                <th className="py-2.5 px-4 font-semibold">Service Banner / Version</th>
                <th className="py-2.5 px-4 font-semibold text-right w-24">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-sans">
              {paginatedResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500 text-xs">
                    No ports match current search or filters.
                  </td>
                </tr>
              ) : (
                paginatedResults.map((r, idx) => (
                  <tr key={`${r.host}-${r.port}-${idx}`} className="hover:bg-zinc-900/40 transition-colors">
                    {/* Host */}
                    <td className="py-2.5 px-4">
                      <div className="font-mono text-zinc-200 font-medium">{r.host}</div>
                      {r.ip && r.ip !== r.host && (
                        <div className="text-[10px] font-mono text-zinc-500">{r.ip}</div>
                      )}
                    </td>

                    {/* Port */}
                    <td className="py-2.5 px-4 font-mono text-zinc-100 font-semibold text-[13px]">
                      {r.port}
                    </td>

                    {/* Protocol */}
                    <td className="py-2.5 px-4 font-mono text-zinc-400 uppercase text-[11px]">
                      {r.protocol}
                    </td>

                    {/* State */}
                    <td className="py-2.5 px-4">
                      {getStateBadge(r.state)}
                    </td>

                    {/* Service */}
                    <td className="py-2.5 px-4 font-mono text-sky-400 font-medium">
                      {r.service || 'unknown'}
                    </td>

                    {/* Banner / Product */}
                    <td className="py-2.5 px-4 text-zinc-300 font-mono text-[11px] truncate max-w-md" title={r.banner || r.product}>
                      {r.banner || r.product || '—'}
                    </td>

                    {/* Latency */}
                    <td className="py-2.5 px-4 text-right font-mono text-zinc-400 text-[11px]">
                      {r.latencyMs !== undefined ? `${r.latencyMs}ms` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800/80 bg-zinc-900/30 text-xs text-zinc-400">
          <div className="flex items-center space-x-2">
            <span>
              Showing {filteredResults.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredResults.length)} of {filteredResults.length} ports
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-zinc-300 font-mono text-[11px] focus:outline-none"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-zinc-300 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
