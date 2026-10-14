import React from 'react';
import { Search, X } from 'lucide-react';
import { QualityCategory, SonarSeverity } from '../../types/sonar';

interface IssueFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory?: QualityCategory;
  onCategoryChange: (cat?: QualityCategory) => void;
  selectedSeverity?: SonarSeverity;
  onSeverityChange: (sev?: SonarSeverity) => void;
  totalIssues: number;
  filteredCount: number;
  onClearFilters: () => void;
}

const CATEGORIES: { label: string; value: QualityCategory }[] = [
  { label: 'Security', value: 'SECURITY' },
  { label: 'Reliability', value: 'RELIABILITY' },
  { label: 'Maintainability', value: 'MAINTAINABILITY' },
];

const SEVERITIES: SonarSeverity[] = ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

export const IssueFilters: React.FC<IssueFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedSeverity,
  onSeverityChange,
  totalIssues,
  filteredCount,
  onClearFilters,
}) => {
  const hasActiveFilters = searchQuery.trim() !== '' || selectedCategory || selectedSeverity;

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/70 rounded-xl px-5 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Search Input */}
      <div className="relative flex-1 max-w-lg">
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter issues by message, rule, file path, author..."
          className="w-full pl-8 pr-8 py-1.5 text-xs bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors font-mono"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Pills Across Wide View */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1 bg-zinc-950/60 p-0.5 rounded-lg border border-zinc-800/80">
          <button
            onClick={() => onCategoryChange(undefined)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              !selectedCategory
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => onCategoryChange(selectedCategory === c.value ? undefined : c.value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                selectedCategory === c.value
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Severity Pills */}
        <div className="flex items-center gap-1 bg-zinc-950/60 p-0.5 rounded-lg border border-zinc-800/80">
          <button
            onClick={() => onSeverityChange(undefined)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
              !selectedSeverity ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All
          </button>
          {SEVERITIES.map((sev) => {
            const isSelected = selectedSeverity === sev;
            const label = sev === 'BLOCKER' ? 'Blocker' : sev === 'HIGH' ? 'High' : sev === 'MEDIUM' ? 'Medium' : sev === 'LOW' ? 'Low' : 'Info';
            const badgeBg = sev === 'BLOCKER' ? 'bg-rose-600' : sev === 'HIGH' ? 'bg-red-600' : sev === 'MEDIUM' ? 'bg-orange-600' : sev === 'LOW' ? 'bg-amber-600' : 'bg-sky-600';
            const iconSymbol = sev === 'BLOCKER' ? '−' : sev === 'HIGH' || sev === 'MEDIUM' ? '▲' : sev === 'LOW' ? '▼' : 'i';

            return (
              <button
                key={sev}
                onClick={() => onSeverityChange(isSelected ? undefined : sev)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${badgeBg} text-white flex items-center justify-center text-[8px] font-bold leading-none`}>
                  {iconSymbol}
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Counter & Reset */}
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-300 pl-2">
          <span>
            {filteredCount.toLocaleString()} / {totalIssues.toLocaleString()}
          </span>

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-xs text-zinc-500 hover:text-zinc-200 underline decoration-zinc-700 underline-offset-2 font-sans"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
