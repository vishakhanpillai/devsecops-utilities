import React from 'react';
import { Search, SlidersHorizontal, Trash2, Database } from 'lucide-react';
import { SubdomainFilterType, SubdomainMetrics } from '../../types/subdomain';

interface SubdomainFilterBarProps {
  activeFilter: SubdomainFilterType;
  onFilterChange: (filter: SubdomainFilterType) => void;
  metrics: SubdomainMetrics;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenBatchModal: () => void;
  onClearDescriptors: () => void;
  saveStatus: string;
}

export const SubdomainFilterBar: React.FC<SubdomainFilterBarProps> = ({
  activeFilter,
  onFilterChange,
  metrics,
  searchQuery,
  onSearchChange,
  onOpenBatchModal,
  onClearDescriptors,
  saveStatus,
}) => {
  return (
    <section className="bg-black border-b border-[#27272a] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1 font-mono flex-wrap bg-[#09090b] p-1 rounded-lg border border-[#27272a]">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
            activeFilter === 'all'
              ? 'bg-[#27272a] text-white'
              : 'text-[#a1a1aa] hover:text-white'
          }`}
        >
          All Records ({metrics.total})
        </button>

        <button
          onClick={() => onFilterChange('active')}
          className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
            activeFilter === 'active'
              ? 'bg-[#18181b] text-emerald-300 border border-emerald-500/30'
              : 'text-[#a1a1aa] hover:text-white'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Active: Yes ({metrics.active})</span>
        </button>

        <button
          onClick={() => onFilterChange('inactive')}
          className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
            activeFilter === 'inactive'
              ? 'bg-[#18181b] text-rose-300 border border-rose-500/30'
              : 'text-[#a1a1aa] hover:text-white'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span>Inactive: No ({metrics.inactive})</span>
        </button>

        <button
          onClick={() => onFilterChange('pending')}
          className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
            activeFilter === 'pending'
              ? 'bg-[#27272a] text-white'
              : 'text-[#a1a1aa] hover:text-white'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
          <span>Pending ({metrics.pending})</span>
        </button>
      </div>

      {/* Search & Batch Tools */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <input
            type="text"
            placeholder="Search subdomain, IP, FQDN..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-60 bg-[#09090b] border border-[#27272a] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#52525b] font-mono focus:outline-none focus:border-white transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-2.5 top-2" />
        </div>

        <button
          onClick={onOpenBatchModal}
          className="px-3 py-1.5 rounded-lg bg-[#09090b] hover:bg-[#18181b] text-[#e4e4e7] border border-[#27272a] transition-colors flex items-center gap-1.5 font-mono"
          title="Assign descriptors to all rows matching a target IP"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#a1a1aa]" />
          <span>Batch by IP</span>
        </button>

        <button
          onClick={onClearDescriptors}
          className="px-2.5 py-1.5 rounded-lg bg-[#09090b] hover:bg-[#18181b] text-[#a1a1aa] hover:text-white border border-[#27272a] transition-colors flex items-center gap-1 font-mono"
          title="Clear all manual descriptors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>

        <span className="text-[11px] text-[#71717a] font-mono select-none flex items-center gap-1 ml-1">
          <Database className="w-3 h-3 text-[#52525b]" />
          <span>{saveStatus}</span>
        </span>
      </div>
    </section>
  );
};
