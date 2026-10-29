import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  SlidersHorizontal,
  RotateCcw,
  AlertCircle,
  FileCode2,
} from 'lucide-react';
import { SbomResolutionResult, LicenseRule } from '../../types/sbom';
import { resolveSbom } from '../../services/sbom/sbomEngine';
import { exportSbomToExcel } from '../../services/sbom/sbomExcelExporter';
import { SbomTable } from './SbomTable';
import { CustomRulesModal } from './CustomRulesModal';

export const SbomResolver: React.FC = () => {
  const [result, setResult] = useState<SbomResolutionResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rawJson, setRawJson] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load custom rules from localStorage
  const [customRules, setCustomRules] = useState<LicenseRule[]>(() => {
    try {
      const saved = localStorage.getItem('devsecops_custom_license_rules');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save custom rules to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('devsecops_custom_license_rules', JSON.stringify(customRules));
    } catch {
      // Ignore
    }
  }, [customRules]);

  // Re-run resolution if custom rules change while a file is loaded
  const handleProcessJson = (jsonObj: any, name: string) => {
    try {
      setErrorMsg(null);
      const res = resolveSbom(jsonObj, customRules);
      setRawJson(jsonObj);
      setFileName(name);
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse SBOM file. Ensure it is a valid CycloneDX or SPDX JSON.');
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        handleProcessJson(parsed, file.name);
      } catch (err) {
        setErrorMsg('Invalid JSON file. Please upload a valid JSON format SBOM.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleAddRule = (rule: LicenseRule) => {
    const updated = [...customRules, rule];
    setCustomRules(updated);
    if (rawJson) {
      setResult(resolveSbom(rawJson, updated));
    }
  };

  const handleDeleteRule = (id: string) => {
    const updated = customRules.filter((r) => r.id !== id);
    setCustomRules(updated);
    if (rawJson) {
      setResult(resolveSbom(rawJson, updated));
    }
  };

  const handleImportRules = (imported: LicenseRule[]) => {
    const updated = [...customRules, ...imported];
    setCustomRules(updated);
    if (rawJson) {
      setResult(resolveSbom(rawJson, updated));
    }
  };

  // Manual inline override for a component
  const handleManualOverride = (componentId: string, spdxId: string) => {
    if (!result) return;
    const updatedComponents = result.components.map((comp) => {
      if (comp.id === componentId) {
        return {
          ...comp,
          resolvedSpdxId: spdxId,
          resolvedLicenseName: spdxId,
          method: 'manual_override' as const,
          isResolved: true,
        };
      }
      return comp;
    });

    // Also update raw JSON if bom-ref is found
    const updatedBom = JSON.parse(JSON.stringify(result.resolvedBom));
    if (Array.isArray(updatedBom.components)) {
      for (const c of updatedBom.components) {
        const cId = c['bom-ref'] || `${c.name}@${c.version}`;
        if (componentId.startsWith(cId)) {
          c.licenses = [{ license: { id: spdxId } }];
        }
      }
    }

    const resolvedUnknowns = updatedComponents.filter((c) => c.isResolved && c.wasUnknown).length;
    const unresolved = updatedComponents.filter((c) => !c.isResolved).length;
    const compliant = updatedComponents.filter((c) => c.isResolved).length;
    const rate = updatedComponents.length > 0 ? (compliant / updatedComponents.length) * 100 : 100;

    setResult({
      ...result,
      components: updatedComponents,
      resolvedBom: updatedBom,
      stats: {
        ...result.stats,
        resolvedUnknowns,
        unresolved,
        resolutionRate: Math.round(rate * 10) / 10,
      },
    });
  };

  const handleDownloadCleanedJson = () => {
    if (!result) return;
    const cleanBom = result.resolvedBom;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanBom, null, 2));
    const downloadAnchor = document.createElement('a');
    const baseName = fileName.replace(/\.json$/i, '') || 'bom';
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${baseName}_resolved.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportExcel = async () => {
    if (!result) return;
    const baseName = fileName.replace(/\.json$/i, '') || 'sbom-license-audit';
    await exportSbomToExcel(result, baseName);
  };

  const handleReset = () => {
    setResult(null);
    setRawJson(null);
    setFileName('');
    setErrorMsg(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
            <FileCode2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">SBOM License Resolver</h2>
              {result && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {result.bomFormat} {result.specVersion || ''}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono truncate max-w-md">
              {fileName ? fileName : 'Maps legacy "Unknown - See URL" licenses to standard SPDX identifiers'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Custom Rules Button */}
          <button
            type="button"
            onClick={() => setIsRulesModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
            <span>Rules ({customRules.length})</span>
          </button>

          {result ? (
            <>
              {/* Download Cleaned JSON */}
              <button
                type="button"
                onClick={handleDownloadCleanedJson}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors"
                title="Download resolved CycloneDX JSON for Dependency-Track"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Cleaned SBOM JSON</span>
              </button>

              {/* Export Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-colors"
                title="Export executive license audit workbook"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Excel</span>
              </button>

              {/* Reset */}
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800/80 transition-colors"
                title="Clear current SBOM"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          ) : (
            <label className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Upload SBOM</span>
              <input
                type="file"
                accept=".json,.cdx.json,.spdx.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main View: Upload Zone or Results Dashboard */}
      {!result ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed transition-all duration-200 bg-zinc-950/40 ${
            isDragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800/80 hover:border-zinc-700'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4 shadow-sm">
            <Upload className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-100 tracking-tight mb-1">
            Drop your CycloneDX or SPDX SBOM JSON here
          </h3>
          <p className="text-xs text-zinc-400 max-w-md font-sans mb-6">
            Supports any SBOM generated from NuGet (.NET), npm, Maven, PyPI, Go, or container scanners. Resolves
            legacy license URLs to verified SPDX identifiers.
          </p>

          <label className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 shadow-sm cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Select SBOM JSON File</span>
            <input
              type="file"
              accept=".json,.cdx.json,.spdx.json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Total Components */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 shadow-sm">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Total Components</span>
              <div className="text-xl font-bold font-mono text-zinc-100 mt-1">{result.stats.totalComponents}</div>
              <span className="text-[11px] text-zinc-400 mt-0.5 block font-mono">Inventory items</span>
            </div>

            {/* Resolved Unknowns */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-500/20 shadow-sm">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">Resolved "Unknown"</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                +{result.stats.resolvedUnknowns}
              </div>
              <span className="text-[11px] text-zinc-400 mt-0.5 block font-mono">Mapped to standard SPDX</span>
            </div>

            {/* Already Valid */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 shadow-sm">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Standard SPDX</span>
              <div className="text-xl font-bold font-mono text-zinc-200 mt-1">{result.stats.alreadyValid}</div>
              <span className="text-[11px] text-zinc-400 mt-0.5 block font-mono">Pre-identified licenses</span>
            </div>

            {/* Unresolved */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-rose-500/20 shadow-sm">
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400">Unresolved</span>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">{result.stats.unresolved}</div>
              <span className="text-[11px] text-zinc-400 mt-0.5 block font-mono">
                {result.stats.unresolved === 0 ? 'All resolved' : 'Action needed'}
              </span>
            </div>

            {/* Compliance Resolution Rate */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-sky-500/20 shadow-sm col-span-2 sm:col-span-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400">Resolution Rate</span>
              <div className="text-xl font-bold font-mono text-sky-400 mt-1">{result.stats.resolutionRate}%</div>
              <span className="text-[11px] text-zinc-400 mt-0.5 block font-mono">SPDX compliant</span>
            </div>
          </div>

          {/* Component Inventory Table */}
          <SbomTable components={result.components} onManualOverride={handleManualOverride} />
        </div>
      )}

      {/* Custom Rules Modal */}
      <CustomRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        rules={customRules}
        onAddRule={handleAddRule}
        onDeleteRule={handleDeleteRule}
        onImportRules={handleImportRules}
      />
    </div>
  );
};
