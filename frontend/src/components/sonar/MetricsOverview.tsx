import React from 'react';
import {
  ShieldAlert,
  Bug,
  Wrench,
  Filter,
} from 'lucide-react';
import { SonarIssue, SonarSeverity, QualityCategory } from '../../types/sonar';

interface MetricsOverviewProps {
  issues: SonarIssue[];
  onSelectFilter: (category?: QualityCategory, severity?: SonarSeverity) => void;
  activeCategory?: QualityCategory;
  activeSeverity?: SonarSeverity;
}

const SEVERITIES: SonarSeverity[] = ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

const SEVERITY_CONFIG: Record<
  SonarSeverity,
  { label: string; iconSymbol: string; color: string; bgBadge: string }
> = {
  BLOCKER: { label: 'Blocker', iconSymbol: '−', color: 'text-rose-400', bgBadge: 'bg-rose-600' },
  HIGH: { label: 'High', iconSymbol: '▲', color: 'text-red-400', bgBadge: 'bg-red-600' },
  MEDIUM: { label: 'Medium', iconSymbol: '▲', color: 'text-orange-400', bgBadge: 'bg-orange-600' },
  LOW: { label: 'Low', iconSymbol: '▼', color: 'text-amber-400', bgBadge: 'bg-amber-600' },
  INFO: { label: 'Info', iconSymbol: 'i', color: 'text-sky-400', bgBadge: 'bg-sky-600' },
};

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  issues,
  onSelectFilter,
  activeCategory,
  activeSeverity,
}) => {
  const stats: Record<QualityCategory, Record<SonarSeverity, number>> = {
    SECURITY: { BLOCKER: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
    RELIABILITY: { BLOCKER: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
    MAINTAINABILITY: { BLOCKER: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
  };

  const SEVERITY_RANK: Record<string, number> = {
    BLOCKER: 5,
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    INFO: 1,
  };

  const uniqueIssues = new Map<string, SonarSeverity>();

  issues.forEach((issue) => {
    // 1. Matrix stats (allows multi-counting if issue spans multiple pillars)
    if (stats[issue.category] && stats[issue.category][issue.severity] !== undefined) {
      stats[issue.category][issue.severity]++;
    }

    // 2. Global deduplication for overall severity totals
    const currentRank = SEVERITY_RANK[issue.severity] || 0;
    const existingSeverity = uniqueIssues.get(issue.key);
    const existingRank = existingSeverity ? (SEVERITY_RANK[existingSeverity] || 0) : 0;

    if (currentRank > existingRank) {
      uniqueIssues.set(issue.key, issue.severity);
    }
  });

  const securityTotal = Object.values(stats.SECURITY).reduce((a, b) => a + b, 0);
  const reliabilityTotal = Object.values(stats.RELIABILITY).reduce((a, b) => a + b, 0);
  const maintainabilityTotal = Object.values(stats.MAINTAINABILITY).reduce((a, b) => a + b, 0);

  const severityTotals: Record<SonarSeverity, number> = {
    BLOCKER: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };

  uniqueIssues.forEach((severity) => {
    if (severityTotals[severity] !== undefined) {
      severityTotals[severity]++;
    }
  });

  const totalUniqueIssues = uniqueIssues.size;

  const categories: { key: QualityCategory; label: string; icon: React.ReactNode; total: number }[] = [
    { key: 'SECURITY', label: 'Security', icon: <ShieldAlert className="w-4 h-4 text-rose-400" />, total: securityTotal },
    { key: 'RELIABILITY', label: 'Reliability', icon: <Bug className="w-4 h-4 text-amber-400" />, total: reliabilityTotal },
    { key: 'MAINTAINABILITY', label: 'Maintainability', icon: <Wrench className="w-4 h-4 text-indigo-400" />, total: maintainabilityTotal },
  ];

  return (
    <div className="space-y-4">
      {/* 3 Metric Tiles Across the Width */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((c) => {
          const isSelected = activeCategory === c.key && !activeSeverity;
          return (
            <div
              key={c.key}
              onClick={() => onSelectFilter(isSelected ? undefined : c.key, undefined)}
              className={`p-5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-zinc-800/90 border-zinc-500 shadow-sm'
                  : 'bg-zinc-900/40 border-zinc-800/70 hover:bg-zinc-900/70 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  {c.icon}
                  <span className="text-xs font-semibold text-zinc-200 tracking-wide uppercase font-mono">
                    {c.label}
                  </span>
                </div>
                <span className="text-2xl font-mono font-bold text-zinc-100">
                  {c.total.toLocaleString()}
                </span>
              </div>

              {/* Sub-severity pills */}
              <div className="grid grid-cols-5 gap-1.5 mt-4 pt-3 border-t border-zinc-800/60 font-mono text-center">
                {SEVERITIES.map((sev) => {
                  const count = stats[c.key][sev];
                  const cfg = SEVERITY_CONFIG[sev];
                  const activeSub = activeCategory === c.key && activeSeverity === sev;
                  return (
                    <button
                      key={sev}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFilter(c.key, activeSub ? undefined : sev);
                      }}
                      className={`py-1.5 rounded-md transition-all ${
                        activeSub
                          ? 'bg-zinc-700 text-white font-bold'
                          : count > 0
                          ? 'text-zinc-200 hover:bg-zinc-800/80'
                          : 'text-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className={`w-3 h-3 rounded-full ${cfg.bgBadge} text-white flex items-center justify-center text-[8px] font-bold leading-none`}>
                          {cfg.iconSymbol}
                        </span>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{cfg.label.slice(0, 3)}</span>
                      </div>
                      <div className="text-sm font-bold font-mono mt-1">{count}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Wide Sub-Sheet Matrix Grid */}
      <div className="bg-zinc-900/40 border border-zinc-800/70 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
              Worksheet Matrix Breakdown
            </span>
            <span className="text-[11px] text-zinc-500 font-sans">
              (Click any cell to filter issues)
            </span>
          </div>
          {(activeCategory || activeSeverity) && (
            <button
              onClick={() => onSelectFilter(undefined, undefined)}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded bg-zinc-800 font-sans"
            >
              <Filter className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-xs tracking-wider">
                <th className="py-3 px-4 text-left font-sans font-medium text-zinc-400">Quality Category</th>
                {SEVERITIES.map((sev) => {
                  const cfg = SEVERITY_CONFIG[sev];
                  return (
                    <th key={sev} className="py-3 px-3 text-center uppercase tracking-wider font-semibold">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`w-3.5 h-3.5 rounded-full ${cfg.bgBadge} text-white flex items-center justify-center text-[9px] font-bold leading-none`}>
                          {cfg.iconSymbol}
                        </span>
                        <span>{cfg.label}</span>
                      </div>
                    </th>
                  );
                })}
                <th className="py-3 px-4 text-center font-sans font-semibold text-zinc-200 text-xs">Category Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {categories.map((c) => (
                <tr key={c.key} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3.5 px-4 font-sans text-zinc-200 font-medium text-sm">
                    {c.label}
                  </td>
                  {SEVERITIES.map((sev) => {
                    const count = stats[c.key][sev];
                    const isSelected = activeCategory === c.key && activeSeverity === sev;
                    return (
                      <td key={sev} className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onSelectFilter(c.key, isSelected ? undefined : sev)}
                          className={`w-full py-2 rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-zinc-200 text-zinc-950 font-black text-base shadow-sm ring-2 ring-white/20'
                              : count > 0
                              ? 'text-zinc-100 hover:bg-zinc-800 font-bold text-base'
                              : 'text-zinc-600 text-sm'
                          }`}
                        >
                          {count}
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-3.5 px-4 text-center text-zinc-100 font-bold text-base">
                    {c.total}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-zinc-800 text-zinc-300 font-semibold bg-zinc-950/40">
                <td className="py-3.5 px-4 font-sans text-zinc-300 font-medium text-sm">Total</td>
                {SEVERITIES.map((sev) => (
                  <td key={sev} className="py-3.5 px-3 text-center text-base font-bold text-zinc-100 font-mono">
                    {severityTotals[sev]}
                  </td>
                ))}
                <td className="py-3.5 px-4 text-center text-white font-extrabold text-lg font-mono">
                  {totalUniqueIssues.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
