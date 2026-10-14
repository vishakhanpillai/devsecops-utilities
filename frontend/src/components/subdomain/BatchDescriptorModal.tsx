import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, Check } from 'lucide-react';

interface BatchDescriptorModalProps {
  isOpen: boolean;
  onClose: () => void;
  uniqueIps: [string, number][];
  onApply: (ip: string, descriptor: string) => void;
}

export const BatchDescriptorModal: React.FC<BatchDescriptorModalProps> = ({
  isOpen,
  onClose,
  uniqueIps,
  onApply,
}) => {
  const [selectedIp, setSelectedIp] = useState('');
  const [descriptor, setDescriptor] = useState('');

  useEffect(() => {
    if (uniqueIps.length > 0 && !selectedIp) {
      setSelectedIp(uniqueIps[0][0]);
    }
  }, [uniqueIps, selectedIp]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIp) return;
    onApply(selectedIp, descriptor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2 text-white">
            <div className="p-1.5 rounded-md bg-[#18181b] border border-[#27272a] text-white">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-semibold font-mono tracking-wide uppercase">Batch Descriptor by Target IP</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717a] hover:text-white p-1 rounded-md hover:bg-[#18181b] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[#a1a1aa] mb-1 font-medium">Select Target IP Address:</label>
            <select
              value={selectedIp}
              onChange={(e) => setSelectedIp(e.target.value)}
              className="w-full bg-black border border-[#27272a] rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-white transition-colors cursor-pointer"
            >
              {uniqueIps.map(([ip, count]) => (
                <option key={ip} value={ip}>
                  {ip} ({count} {count === 1 ? 'subdomain' : 'subdomains'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#a1a1aa] mb-1 font-medium">Descriptor Label Value:</label>
            <input
              type="text"
              placeholder="e.g. Production Gateway, Staging Cluster, Internal API"
              value={descriptor}
              onChange={(e) => setDescriptor(e.target.value)}
              className="w-full bg-black border border-[#27272a] rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-white transition-colors"
              autoFocus
            />
            <p className="text-[11px] text-[#71717a] mt-1">
              Updates descriptor column for all subdomains resolving to <span className="text-white font-mono">{selectedIp}</span>.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#27272a]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#18181b] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] border border-[#27272a] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedIp}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-[#f4f4f5] text-black transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply to Matching Rows</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
