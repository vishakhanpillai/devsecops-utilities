import React, { useState } from 'react';
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SonarIssue, SonarSeverity, QualityCategory } from '../../types/sonar';

interface IssueTableProps {
  issues: SonarIssue[];
}

const ITEMS_PER_PAGE_OPTIONS = [20, 40, 60, 100];

export const IssueTable: React.FC<IssueTableProps> = ({ issues }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const totalPages = Math.max(1, Math.ceil(issues.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const paginatedIssues = issues.slice(startIndex, startIndex + itemsPerPage);

  const getSeverityBadge = (sev: SonarSeverity) => {
    switch (sev) {
      case 'BLOCKER':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-rose-400">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] font-bold leading-none">
              −
            </span>
            <span>Blocker</span>
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-red-400">
            <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-bold leading-none">
              ▲
            </span>
            <span>High</span>
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-orange-400">
            <span className="w-3.5 h-3.5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[9px] font-bold leading-none">
              ▲
            </span>
            <span>Medium</span>
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-400">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[9px] font-bold leading-none">
              ▼
            </span>
            <span>Low</span>
          </span>
        );
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-sky-400">
            <span className="w-3.5 h-3.5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[9px] font-bold leading-none">
              i
            </span>
            <span>Info</span>
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: QualityCategory) => {
    switch (cat) {
      case 'SECURITY':
        return <span className="text-[11px] text-rose-300 font-medium">Security</span>;
      case 'RELIABILITY':
        return <span className="text-[11px] text-amber-300 font-medium">Reliability</span>;
      case 'MAINTAINABILITY':
        return <span className="text-[11px] text-zinc-400 font-medium">Maintainability</span>;
    }
  };

  if (issues.length === 0) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800/70 rounded-xl p-10 text-center text-xs text-zinc-500 font-sans">
        No issues match the current filter.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/70 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 text-[11px] tracking-wider uppercase font-mono">
              <th className="py-3 px-3.5 whitespace-nowrap">Issue Key</th>
              <th className="py-3 px-3 whitespace-nowrap">Category</th>
              <th className="py-3 px-3 whitespace-nowrap">Severity</th>
              <th className="py-3 px-4 min-w-[220px]">Vulnerability (What)</th>
              <th className="py-3 px-3 min-w-[200px]">File Path</th>
              <th className="py-3 px-3 text-center whitespace-nowrap">Line Number</th>
              <th className="py-3 px-4 min-w-[260px]">Code Snippet</th>
              <th className="py-3 px-4 min-w-[260px]">Root Cause (Why)</th>
              <th className="py-3 px-4 min-w-[280px]">How To Fix (Remediation Examples)</th>
              <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40">
            {paginatedIssues.map((issue) => {
              return (
                <tr key={issue.key} className="hover:bg-zinc-800/25 transition-colors align-top">
                  {/* 1. Issue Key */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap">
                    {issue.sonarUrl ? (
                      <a
                        href={issue.sonarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                        title="Open in SonarQube"
                      >
                        <span>{issue.key}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    ) : (
                      <span className="font-mono text-xs font-semibold text-zinc-300">{issue.key}</span>
                    )}
                  </td>

                  {/* 2. Category */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {getCategoryLabel(issue.category)}
                  </td>

                  {/* 3. Severity */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {getSeverityBadge(issue.severity)}
                  </td>

                  {/* 4. Vulnerability (What) */}
                  <td className="py-3.5 px-4 text-zinc-100 leading-snug">
                    <div className="font-medium text-xs">{issue.vulnerabilityWhat || issue.message}</div>
                    {issue.rule && (
                      <div className="font-mono text-[10px] text-zinc-400 mt-1">
                        {issue.rule}
                      </div>
                    )}
                  </td>

                  {/* 5. File Path */}
                  <td className="py-3.5 px-3 font-mono text-xs">
                    <div className="text-zinc-200 truncate max-w-[240px]" title={issue.component}>
                      {issue.component}
                    </div>
                  </td>

                  {/* 6. Line Number */}
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    <span className="font-mono text-sm font-bold text-zinc-100">
                      {issue.line !== undefined ? issue.line : '—'}
                    </span>
                  </td>

                  {/* 7. Code Snippet */}
                  <td className="py-3.5 px-4">
                    {issue.codeSnippet ? (
                      <pre className="bg-zinc-950/80 border border-zinc-800/80 rounded px-2.5 py-1.5 font-mono text-[11px] text-amber-200/90 whitespace-pre-wrap max-w-xs max-h-24 overflow-y-auto leading-relaxed select-all">
                        {issue.codeSnippet}
                      </pre>
                    ) : (
                      <span className="text-zinc-600 font-mono text-xs">—</span>
                    )}
                  </td>

                  {/* 8. Root Cause (Why) */}
                  <td className="py-3.5 px-4">
                    <div className="text-xs text-zinc-300 leading-relaxed max-w-xs">
                      {issue.rootCauseWhy || '—'}
                    </div>
                  </td>

                  {/* 9. How To Fix (Remediation Examples) */}
                  <td className="py-3.5 px-4">
                    <div className="text-[11px] text-emerald-300/90 bg-emerald-950/20 border border-emerald-900/30 rounded p-2 font-mono leading-relaxed max-w-xs">
                      {issue.howToFix || '—'}
                    </div>
                  </td>

                  {/* 10. Status */}
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                      {issue.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800/60 bg-zinc-950/40 text-xs text-zinc-500 font-mono">
        <div className="flex items-center gap-2 font-sans">
          <span>Rows per page:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-zinc-300 text-xs focus:outline-none font-mono"
          >
            {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span>
            {startIndex + 1}–{Math.min(startIndex + itemsPerPage, issues.length)} of {issues.length.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
