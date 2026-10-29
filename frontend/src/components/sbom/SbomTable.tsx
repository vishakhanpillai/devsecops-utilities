import React, { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Filter,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ResolvedComponent } from '../../types/sbom';

interface SbomTableProps {
  components: ResolvedComponent[];
  onManualOverride: (componentId: string, spdxId: string) => void;
}

export const SbomTable: React.FC<SbomTableProps> = ({ components, onManualOverride }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'resolved' | 'valid' | 'unresolved'>('all');
  const [licenseFilter, setLicenseFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Inline editing state: componentId -> newSpdx
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState('');

  // Extract all unique licenses for dropdown
  const uniqueLicenses = useMemo(() => {
    const set = new Set<string>();
    components.forEach((c) => {
      const val = c.resolvedSpdxId || c.resolvedLicenseName;
      if (val && c.isResolved) set.add(val);
    });
    return Array.from(set).sort();
  }, [components]);

  // Filtered components
  const filteredComponents = useMemo(() => {
    return components.filter((comp) => {
      // Status filter
      if (statusFilter === 'resolved' && !(comp.isResolved && comp.wasUnknown)) return false;
      if (statusFilter === 'valid' && !(comp.isResolved && !comp.wasUnknown)) return false;
      if (statusFilter === 'unresolved' && comp.isResolved) return false;

      // License filter
      if (licenseFilter !== 'all') {
        const val = comp.resolvedSpdxId || comp.resolvedLicenseName;
        if (val !== licenseFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = comp.name.toLowerCase().includes(query);
        const matchesVer = comp.version.toLowerCase().includes(query);
        const matchesOrig = comp.originalLicenseText.toLowerCase().includes(query);
        const matchesResolved = (comp.resolvedSpdxId || comp.resolvedLicenseName || '')
          .toLowerCase()
          .includes(query);
        const matchesUrl = (comp.originalLicenseUrl || '').toLowerCase().includes(query);
        const matchesPurl = (comp.purl || '').toLowerCase().includes(query);
        if (!matchesName && !matchesVer && !matchesOrig && !matchesResolved && !matchesUrl && !matchesPurl) {
          return false;
        }
      }

      return true;
    });
  }, [components, statusFilter, licenseFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredComponents.length / pageSize) || 1;
  const paginatedComponents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredComponents.slice(start, start + pageSize);
  }, [filteredComponents, currentPage, pageSize]);

  const handleStartEdit = (comp: ResolvedComponent) => {
    setEditingId(comp.id);
    setOverrideValue(comp.resolvedSpdxId || comp.resolvedLicenseName || '');
  };

  const handleSaveEdit = (comp: ResolvedComponent) => {
    if (overrideValue.trim()) {
      onManualOverride(comp.id, overrideValue.trim());
    }
    setEditingId(null);
  };

  const getSpdxBadgeClass = (spdx?: string) => {
    if (!spdx) return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    const s = spdx.toUpperCase();
    if (s.includes('MIT')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (s.includes('APACHE')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (s.includes('BSD')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (s.includes('GPL') || s.includes('AGPL')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (s.includes('MS-PL') || s.includes('OFL')) return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
    if (s.includes('MICROSOFT') || s.includes('EULA')) return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    return 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60';
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'exact_url':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">URL Match</span>;
      case 'heuristic_pattern':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">Heuristic</span>;
      case 'package_rule':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20">Package Rule</span>;
      case 'custom_rule':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">User Rule</span>;
      case 'name_normalization':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-500/10 text-teal-400 border border-teal-500/20">Normalized</span>;
      case 'manual_override':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20">Manual Override</span>;
      case 'already_valid':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60">Standard</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">Unresolved</span>;
    }
  };

  return (
    <div className="space-y-3">
      {/* Search & Filter Toolbar */}
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
            placeholder="Search component, license, URL, or PURL..."
            className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 font-mono"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Status Pills */}
          <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800/80 text-xs">
            <button
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              All ({components.length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('resolved');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                statusFilter === 'resolved' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Resolved ({components.filter((c) => c.isResolved && c.wasUnknown).length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('valid');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                statusFilter === 'valid' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Standard ({components.filter((c) => c.isResolved && !c.wasUnknown).length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('unresolved');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                statusFilter === 'unresolved' ? 'bg-zinc-800 text-rose-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Unresolved ({components.filter((c) => !c.isResolved).length})
            </button>
          </div>

          {/* License Dropdown */}
          {uniqueLicenses.length > 0 && (
            <div className="relative">
              <select
                value={licenseFilter}
                onChange={(e) => {
                  setLicenseFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-zinc-950 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 font-mono pr-7 appearance-none cursor-pointer"
              >
                <option value="all">All Licenses</option>
                {uniqueLicenses.map((lic) => (
                  <option key={lic} value={lic}>
                    {lic}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
            </div>
          )}

          {/* Clear Filters */}
          {(searchQuery || statusFilter !== 'all' || licenseFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setLicenseFilter('all');
                setCurrentPage(1);
              }}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-900/50 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <th className="py-2.5 px-4 font-semibold w-12 text-center">Status</th>
                <th className="py-2.5 px-4 font-semibold">Component</th>
                <th className="py-2.5 px-4 font-semibold">Version</th>
                <th className="py-2.5 px-4 font-semibold">Resolved License (SPDX)</th>
                <th className="py-2.5 px-4 font-semibold">Resolution Method</th>
                <th className="py-2.5 px-4 font-semibold">Original License / URL</th>
                <th className="py-2.5 px-4 font-semibold text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-sans">
              {paginatedComponents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500 text-xs">
                    No components found matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedComponents.map((comp) => {
                  const isEditing = editingId === comp.id;
                  const finalSpdx = comp.resolvedSpdxId || comp.resolvedLicenseName;

                  return (
                    <tr
                      key={comp.id}
                      className="hover:bg-zinc-900/40 transition-colors group"
                    >
                      {/* Status Icon */}
                      <td className="py-2.5 px-4 text-center">
                        {comp.isResolved ? (
                          comp.wasUnknown ? (
                            <span title="Resolved from Unknown">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                            </span>
                          ) : (
                            <span title="Standard License">
                              <CheckCircle2 className="w-4 h-4 text-zinc-500 mx-auto" />
                            </span>
                          )
                        ) : (
                          <span title="Unresolved - Action Needed">
                            <AlertCircle className="w-4 h-4 text-rose-400 mx-auto" />
                          </span>
                        )}
                      </td>

                      {/* Component Name */}
                      <td className="py-2.5 px-4 font-medium text-zinc-200">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-zinc-100">{comp.name}</span>
                          {comp.type && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 uppercase">
                              {comp.type}
                            </span>
                          )}
                        </div>
                        {comp.purl && (
                          <div className="text-[10px] font-mono text-zinc-500 truncate max-w-xs mt-0.5" title={comp.purl}>
                            {comp.purl}
                          </div>
                        )}
                      </td>

                      {/* Version */}
                      <td className="py-2.5 px-4 font-mono text-zinc-400 text-[11px]">
                        {comp.version || '—'}
                      </td>

                      {/* Resolved License */}
                      <td className="py-2.5 px-4">
                        {isEditing ? (
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="text"
                              value={overrideValue}
                              onChange={(e) => setOverrideValue(e.target.value)}
                              placeholder="e.g. MIT, Apache-2.0"
                              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(comp)}
                              className="p-1 text-emerald-400 hover:text-emerald-300"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-zinc-500 hover:text-zinc-400"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            {finalSpdx ? (
                              <span
                                className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${getSpdxBadgeClass(
                                  finalSpdx
                                )}`}
                              >
                                {finalSpdx}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded font-mono text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Unresolved
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Method */}
                      <td className="py-2.5 px-4">
                        {getMethodBadge(comp.method)}
                      </td>

                      {/* Original License & URL */}
                      <td className="py-2.5 px-4 max-w-sm">
                        <div className="text-[11px] text-zinc-400 truncate" title={comp.originalLicenseText}>
                          {comp.originalLicenseText}
                        </div>
                        {comp.originalLicenseUrl && (
                          <a
                            href={comp.originalLicenseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[10px] font-mono text-sky-400 hover:underline mt-0.5 truncate max-w-xs"
                            title={comp.originalLicenseUrl}
                          >
                            <span className="truncate">{comp.originalLicenseUrl}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleStartEdit(comp)}
                          className="p-1 text-zinc-500 hover:text-zinc-300 opacity-60 group-hover:opacity-100 transition-opacity"
                          title="Override or edit license"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800/80 bg-zinc-900/30 text-xs text-zinc-400">
          <div className="flex items-center space-x-2">
            <span>
              Showing {filteredComponents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredComponents.length)} of {filteredComponents.length} components
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
