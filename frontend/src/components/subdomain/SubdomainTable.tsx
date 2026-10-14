import React, { useState } from 'react';
import {
  RefreshCw,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Globe2,
} from 'lucide-react';
import { SubdomainRecord } from '../../types/subdomain';

interface SubdomainTableProps {
  records: SubdomainRecord[];
  sortKey: string;
  sortAsc: boolean;
  onSort: (key: string) => void;
  onDescriptorChange: (originalIndex: number, value: string) => void;
  onCheckSingleRow: (originalIndex: number) => void;
}

export const SubdomainTable: React.FC<SubdomainTableProps> = ({
  records,
  sortKey,
  sortAsc,
  onSort,
  onDescriptorChange,
  onCheckSingleRow,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, targetIndex: number) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.querySelector<HTMLInputElement>(`input[data-index="${targetIndex + 1}"]`);
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.querySelector<HTMLInputElement>(`input[data-index="${targetIndex - 1}"]`);
      if (prevInput) prevInput.focus();
    }
  };

  const renderSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1 inline" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-cyan-400 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-400 ml-1 inline" />
    );
  };

  return (
    <main className="flex-1 w-full overflow-x-auto relative">
      <table className="subdomain-table w-full border-collapse text-left font-mono text-xs select-text">
        {/* Header Row matching spreadsheet styling */}
        <thead className="bg-[#09090b] text-[#71717a] uppercase text-[11px] sticky top-0 z-20 border-b border-[#27272a] shadow-sm">
          <tr>
            <th className="py-2.5 px-3 text-center border-r border-[#18181b] w-12 font-medium text-[#71717a]">#</th>
            <th
              onClick={() => onSort('subdomain')}
              className="py-2.5 px-3.5 border-r border-[#18181b] font-medium tracking-wider cursor-pointer hover:text-white group transition-colors select-none"
            >
              <span>Subdomain</span>
              {renderSortIcon('subdomain')}
            </th>
            <th className="py-2.5 px-3 text-center border-r border-[#18181b] font-medium tracking-wider w-24 select-none">TTL</th>
            <th className="py-2.5 px-2.5 text-center border-r border-[#18181b] font-medium tracking-wider w-16 select-none">Class</th>
            <th className="py-2.5 px-2.5 text-center border-r border-[#18181b] font-medium tracking-wider w-16 select-none">Type</th>
            <th
              onClick={() => onSort('ip')}
              className="py-2.5 px-3.5 border-r border-[#18181b] font-medium tracking-wider cursor-pointer hover:text-white group transition-colors select-none"
            >
              <span>IP Address</span>
              {renderSortIcon('ip')}
            </th>
            <th
              onClick={() => onSort('fqdn')}
              className="py-2.5 px-3.5 border-r border-[#18181b] font-medium tracking-wider cursor-pointer hover:text-white group transition-colors select-none"
            >
              <span>FQDN</span>
              {renderSortIcon('fqdn')}
            </th>
            <th className="py-2.5 px-3 text-center border-r border-[#18181b] font-medium tracking-wider w-36 select-none">
              Protocol
            </th>
            <th
              onClick={() => onSort('active')}
              className="py-2.5 px-3 text-center border-r border-[#18181b] font-medium tracking-wider w-24 cursor-pointer hover:text-white group transition-colors select-none"
            >
              <span>Active</span>
              {renderSortIcon('active')}
            </th>
            <th className="py-2.5 px-4 border-r border-[#18181b] font-medium tracking-wider min-w-[280px] select-none">
              Descriptor (Editable)
            </th>
            <th className="py-2.5 px-2.5 text-center w-24 font-medium tracking-wider select-none">
              Action
            </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-[#18181b]">
          {records.map((item, index) => {
            const origIndex = item._originalIndex ?? index;
            const isScanningRow = item._scanning;
            const rowKey = `${item.fqdn}-${origIndex}`;

            return (
              <tr
                key={rowKey}
                className={`transition-colors group ${
                  isScanningRow
                    ? 'bg-[#18181b] border-l-2 border-white'
                    : 'hover:bg-[#09090b]'
                }`}
              >
                {/* 1. Index */}
                <td className="py-2 px-3 text-center text-[#52525b] border-r border-[#18181b] text-[11px]">
                  {index + 1}
                </td>

                {/* 2. Subdomain */}
                <td className="py-2 px-3.5 font-medium text-rose-300 border-r border-[#18181b] select-all">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold">{item.subdomain}</span>
                    <button
                      onClick={() => copyToClipboard(item.subdomain, `sub-${origIndex}`)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-[#71717a] hover:text-white transition-opacity"
                      title="Copy subdomain"
                    >
                      {copiedKey === `sub-${origIndex}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </td>

                {/* 3. TTL */}
                <td className="py-2 px-3 text-center text-[#71717a] border-r border-[#18181b] text-[11px]">
                  {item.ttl || '3600 IN'}
                </td>

                {/* 4. Class */}
                <td className="py-2 px-2.5 text-center text-[#71717a] border-r border-[#18181b] text-[11px]">
                  {item.class || 'IN'}
                </td>

                {/* 5. Type */}
                <td className="py-2 px-2.5 text-center text-[#d4d4d8] border-r border-[#18181b] text-[11px]">
                  <span className="px-1.5 py-0.5 rounded bg-[#09090b] border border-[#27272a]">
                    {item.type || 'A'}
                  </span>
                </td>

                {/* 6. IP */}
                <td className="py-2 px-3.5 text-[#e4e4e7] border-r border-[#18181b] select-all">
                  <div className="flex items-center justify-between gap-1 font-mono">
                    <span>{item.ip || '—'}</span>
                    {item.ip && (
                      <button
                        onClick={() => copyToClipboard(item.ip, `ip-${origIndex}`)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[#71717a] hover:text-white transition-opacity"
                        title="Copy IP"
                      >
                        {copiedKey === `ip-${origIndex}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </td>

                {/* 7. FQDN */}
                <td className="py-2 px-3.5 text-rose-200/90 border-r border-[#18181b] select-all font-medium">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate max-w-[280px]" title={item.fqdn}>{item.fqdn || '—'}</span>
                    {item.fqdn && (
                      <button
                        onClick={() => copyToClipboard(item.fqdn, `fqdn-${origIndex}`)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[#71717a] hover:text-white transition-opacity"
                        title="Copy FQDN"
                      >
                        {copiedKey === `fqdn-${origIndex}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </td>

                {/* 8. Protocol */}
                <td className="py-2 px-3 text-center text-[#d4d4d8] border-r border-[#18181b] text-[11px]">
                  {item.protocol && item.protocol !== '-' ? (
                    <span className="px-2 py-0.5 rounded bg-[#09090b] text-white border border-[#27272a]">
                      {item.protocol}
                    </span>
                  ) : (
                    <span className="text-[#52525b]">—</span>
                  )}
                </td>

                {/* 9. Active */}
                <td className="py-2 px-3 text-center border-r border-[#18181b]">
                  {item.active === 'Yes' && (
                    <span className="badge-active-yes">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Yes</span>
                    </span>
                  )}
                  {item.active === 'No' && (
                    <span className="badge-active-no">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span>No</span>
                    </span>
                  )}
                  {!item.active && (
                    <span className="badge-active-pending">
                      <span>Pending</span>
                    </span>
                  )}
                </td>

                {/* 10. Descriptor (Editable) */}
                <td className="py-1 px-2 border-r border-[#18181b]">
                  <input
                    type="text"
                    className="descriptor-input"
                    value={item.descriptor || ''}
                    placeholder="Click to edit descriptor..."
                    data-index={origIndex}
                    onChange={(e) => onDescriptorChange(origIndex, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, origIndex)}
                  />
                </td>

                {/* 11. Actions */}
                <td className="py-1.5 px-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onCheckSingleRow(origIndex)}
                      title="Probe host live"
                      className="p-1 rounded-md hover:bg-[#18181b] text-[#71717a] hover:text-white transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${item._scanning ? 'animate-spin text-white' : ''}`} />
                    </button>
                    {item.fqdn && (
                      <a
                        href={`https://${item.fqdn}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in browser"
                        className="p-1 rounded-md hover:bg-[#18181b] text-[#71717a] hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {records.length === 0 && (
        <div className="py-20 text-center bg-black">
          <div className="w-10 h-10 rounded-xl bg-[#18181b] border border-[#27272a] mx-auto flex items-center justify-center text-[#71717a] mb-2">
            <Globe2 className="w-5 h-5" />
          </div>
          <div className="text-white font-mono text-xs font-semibold mb-1">No subdomain records loaded</div>
          <div className="text-[#71717a] text-xs">Click &ldquo;Import Zone&rdquo; in the toolbar above to paste or upload a DNS zone file.</div>
        </div>
      )}
    </main>
  );
};
