import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';

interface ImportDrawerProps {
  isOpen: boolean;
  onParse: (text: string, origin: string, filterHostOnly: boolean) => Promise<void>;
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  defaultOrigin?: string;
}

export const ImportDrawer: React.FC<ImportDrawerProps> = ({
  isOpen,
  onParse,
  onFileUpload,
  isLoading,
  defaultOrigin = '',
}) => {
  const [zoneText, setZoneText] = useState('');
  const [originOverride, setOriginOverride] = useState(defaultOrigin);
  const [filterHostOnly, setFilterHostOnly] = useState(true);
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileUpload(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setZoneText(evt.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async () => {
    if (!zoneText.trim()) {
      alert('Please paste zone file content or upload a file.');
      return;
    }
    await onParse(zoneText, originOverride, filterHostOnly);
  };

  return (
    <section className="bg-[#09090b] border-b border-[#27272a] px-4 sm:px-6 py-4 transition-all animate-fadeIn">
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Textarea */}
        <div className="lg:col-span-8 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#a1a1aa]" />
              <span>Paste DNS Zone File or Subdomain List</span>
            </label>
            <span className="text-[11px] text-[#71717a] font-mono">
              Auto-detects BIND, GoDaddy, Route53, CSV, TSV, or plain list
            </span>
          </div>
          <textarea
            rows={7}
            value={zoneText}
            onChange={(e) => setZoneText(e.target.value)}
            className="w-full bg-black border border-[#27272a] rounded-lg p-3 text-xs font-mono text-white placeholder-[#52525b] focus:outline-none focus:border-white transition-colors leading-relaxed"
            placeholder="Paste zone records (e.g. $ORIGIN example.com. or absa 3600 IN A 101.53.157.178) or one subdomain per line..."
          />
        </div>

        {/* File Upload & Controls */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3 bg-black p-4 rounded-lg border border-[#27272a]">
          <div>
            <label className="text-xs font-semibold text-white uppercase tracking-wider block mb-2 font-mono">
              Or Upload Zone File (.txt, .zone, .csv)
            </label>
            <div className="border border-dashed border-[#27272a] hover:border-[#71717a] rounded-lg p-3.5 text-center transition-colors cursor-pointer relative group bg-[#09090b] hover:bg-[#18181b]">
              <input
                type="file"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                accept=".txt,.zone,.dns,.csv"
              />
              <Upload className="w-5 h-5 mx-auto text-[#71717a] group-hover:text-white mb-1 transition-colors" />
              <span className="text-xs font-medium text-[#d4d4d8] block truncate">
                {fileName ? fileName : 'Click or drop DNS file here'}
              </span>
              <span className="text-[10px] text-[#52525b] block mt-0.5 font-mono">
                Supports up to 10MB
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-medium text-[#71717a] mb-1">Domain Origin Override</label>
              <input
                type="text"
                placeholder="e.g. gieom.com"
                value={originOverride}
                onChange={(e) => setOriginOverride(e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="checkbox"
                id="filterHostOnly"
                checked={filterHostOnly}
                onChange={(e) => setFilterHostOnly(e.target.checked)}
                className="rounded bg-[#18181b] border-[#27272a] text-white focus:ring-0 cursor-pointer w-4 h-4"
              />
              <label htmlFor="filterHostOnly" className="text-xs text-[#a1a1aa] cursor-pointer select-none">
                Filter to Host Subdomains (A, AAAA, CNAME)
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg bg-white hover:bg-[#f4f4f5] text-black transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Parsing...' : 'Parse & Load Table'}</span>
            </button>
            <button
              onClick={() => {
                setZoneText('');
                setFileName('');
              }}
              className="py-1.5 px-3 text-xs font-medium rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition-colors border border-[#27272a]"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
