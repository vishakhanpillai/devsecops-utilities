import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Settings2,
  Loader2,
  X,
} from 'lucide-react';
import { ExportOptions, SonarIssue } from '../../types/sonar';

interface ExportModalProps {
  issues: SonarIssue[];
  onExport: (options: ExportOptions) => Promise<void>;
  isExporting: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  issues,
  onExport,
  isExporting,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    splitBySeverity: true,
    includeSummarySheet: true,
    includeMasterSheet: false,
    includeDirectLinks: true,
    selectedSeverities: ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
    selectedCategories: ['SECURITY', 'RELIABILITY', 'MAINTAINABILITY'],
    onlyUnresolved: true,
  });

  const handleExportNow = async () => {
    await onExport(options);
    setIsOpen(false);
  };

  let sheetCount = 0;
  if (options.includeSummarySheet) sheetCount += 1;
  if (options.includeMasterSheet) sheetCount += options.selectedCategories.length;
  if (options.splitBySeverity) {
    sheetCount += options.selectedCategories.length * options.selectedSeverities.length;
  }

  return (
    <>
      {/* Sleek Export Action Bar */}
      <div className="bg-zinc-900/40 border border-zinc-800/70 rounded-xl px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-100">Excel Export</span>
              <span className="text-[11px] font-mono font-medium px-2 py-0.2 rounded bg-zinc-800 text-zinc-300">
                {sheetCount} sub-sheets
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Security, Reliability & Maintainability separated by severity with clickable issue links
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />
            Configure
          </button>

          <button
            type="button"
            onClick={handleExportNow}
            disabled={isExporting || issues.length === 0}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download .xlsx</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Clean Config Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-100">Export Options</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Options list */}
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.splitBySeverity}
                  onChange={(e) => setOptions({ ...options, splitBySeverity: e.target.checked })}
                  className="rounded text-zinc-900 bg-zinc-800 border-zinc-700 focus:ring-0"
                />
                <div>
                  <div className="font-medium text-zinc-200">Separate sub-sheet for each severity</div>
                  <div className="text-[11px] text-zinc-500">Security - Blocker, Reliability - High, etc.</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeSummarySheet}
                  onChange={(e) => setOptions({ ...options, includeSummarySheet: e.target.checked })}
                  className="rounded text-zinc-900 bg-zinc-800 border-zinc-700 focus:ring-0"
                />
                <div>
                  <div className="font-medium text-zinc-200">Include summary overview sheet</div>
                  <div className="text-[11px] text-zinc-500">Overview tab with KPI matrix and project metadata</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeDirectLinks}
                  onChange={(e) => setOptions({ ...options, includeDirectLinks: e.target.checked })}
                  className="rounded text-zinc-900 bg-zinc-800 border-zinc-700 focus:ring-0"
                />
                <div>
                  <div className="font-medium text-zinc-200">Clickable issue links</div>
                  <div className="text-[11px] text-zinc-500">Hyperlinks each issue key directly to SonarQube web UI</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.onlyUnresolved}
                  onChange={(e) => setOptions({ ...options, onlyUnresolved: e.target.checked })}
                  className="rounded text-zinc-900 bg-zinc-800 border-zinc-700 focus:ring-0"
                />
                <div>
                  <div className="font-medium text-zinc-200">Exclude resolved issues</div>
                  <div className="text-[11px] text-zinc-500">Only export active, open issues</div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800">
              <span>{sheetCount} worksheets will be created</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExportNow}
                  disabled={isExporting}
                  className="px-4 py-1.5 rounded-lg font-semibold text-zinc-950 bg-white hover:bg-zinc-200 transition-colors"
                >
                  Export Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
