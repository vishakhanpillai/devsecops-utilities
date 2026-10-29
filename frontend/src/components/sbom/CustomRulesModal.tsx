import React, { useState } from 'react';
import { X, Plus, Trash2, Download, Upload, ShieldCheck, Link2, Box } from 'lucide-react';
import { LicenseRule } from '../../types/sbom';

interface CustomRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: LicenseRule[];
  onAddRule: (rule: LicenseRule) => void;
  onDeleteRule: (id: string) => void;
  onImportRules: (rules: LicenseRule[]) => void;
}

export const CustomRulesModal: React.FC<CustomRulesModalProps> = ({
  isOpen,
  onClose,
  rules,
  onAddRule,
  onDeleteRule,
  onImportRules,
}) => {
  const [ruleType, setRuleType] = useState<'url' | 'package'>('url');
  const [pattern, setPattern] = useState('');
  const [version, setVersion] = useState('');
  const [targetType, setTargetType] = useState<'id' | 'name'>('id');
  const [targetValue, setTargetValue] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern.trim() || !targetValue.trim()) return;

    const newRule: LicenseRule = {
      id: `custom-${Date.now()}`,
      type: ruleType,
      pattern: pattern.trim(),
      version: version.trim() || undefined,
      targetType,
      targetValue: targetValue.trim(),
      description: description.trim() || undefined,
      isCustom: true,
    };

    onAddRule(newRule);
    setPattern('');
    setVersion('');
    setTargetValue('');
    setDescription('');
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rules, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'custom-license-rules.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportRules(parsed);
        }
      } catch (err) {
        alert('Invalid JSON file format for custom rules.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Custom License Mapping Rules</h3>
              <p className="text-xs text-zinc-400">Define custom URL or package name mappings for unresolved SBOM licenses</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add Rule Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/60 space-y-3">
            <div className="text-xs font-medium text-zinc-300">Add New Mapping Rule</div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Rule Type</label>
                <div className="flex rounded-md bg-zinc-900 p-0.5 border border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setRuleType('url')}
                    className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                      ruleType === 'url' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    Exact URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleType('package')}
                    className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                      ruleType === 'package' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    Package Name
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Target Type</label>
                <div className="flex rounded-md bg-zinc-900 p-0.5 border border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setTargetType('id')}
                    className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                      targetType === 'id' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    SPDX ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('name')}
                    className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                      targetType === 'name' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    License Name
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className={ruleType === 'package' ? 'col-span-2' : 'col-span-2'}>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  {ruleType === 'url' ? 'License URL to Match' : 'Package Name (e.g. MyLib)'}
                </label>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder={ruleType === 'url' ? 'https://example.com/license.txt' : 'MyCompany.Security.Core'}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  {targetType === 'id' ? 'SPDX ID (e.g. MIT)' : 'License Title'}
                </label>
                <input
                  type="text"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={targetType === 'id' ? 'MIT' : 'Custom EULA'}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 font-mono"
                  required
                />
              </div>
            </div>

            {ruleType === 'package' && (
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Version (Optional — leave blank for any version)
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g. 1.0.0"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 font-mono"
                />
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Rule</span>
              </button>
            </div>
          </form>

          {/* Active Rules List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                Active Custom Rules ({rules.length})
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={rules.length === 0}
                  className="inline-flex items-center space-x-1 text-[11px] text-zinc-400 hover:text-zinc-200 disabled:opacity-40 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>
                <label className="inline-flex items-center space-x-1 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors">
                  <Upload className="w-3 h-3" />
                  <span>Import</span>
                  <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                </label>
              </div>
            </div>

            {rules.length === 0 ? (
              <div className="text-center py-8 rounded-lg border border-dashed border-zinc-800/80 text-zinc-500 text-xs">
                No custom rules defined yet. Use the form above to add custom URL or package mappings.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-2.5 rounded-md bg-zinc-900/50 border border-zinc-800/60 text-xs"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-3">
                      {rule.type === 'url' ? (
                        <Link2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      ) : (
                        <Box className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <div className="truncate min-w-0 font-mono text-[11px] text-zinc-300">
                        <span className="text-zinc-500 uppercase text-[9px] mr-1.5">{rule.type}:</span>
                        <span className="truncate">{rule.pattern}</span>
                        {rule.version && <span className="text-zinc-500">@{rule.version}</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {rule.targetValue}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteRule(rule.id)}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-zinc-800/80 bg-zinc-900/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
