import React from 'react';
import {
  Globe,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Terminal,
  Radio,
} from 'lucide-react';

export type ActiveTool = 'sonar' | 'subdomain' | 'sbom' | 'ports';

interface SidebarProps {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  sonarIssuesCount: number;
  subdomainCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTool,
  onSelectTool,
  sonarIssuesCount,
  subdomainCount,
  isCollapsed,
  onToggleCollapse,
}) => {
  const navItems = [
    {
      id: 'sonar' as ActiveTool,
      name: 'SonarQube Exporter',
      shortName: 'SonarQube',
      category: 'Code Quality & Security',
      icon: ShieldAlert,
      count: sonarIssuesCount,
    },
    {
      id: 'subdomain' as ActiveTool,
      name: 'Subdomain MasterSheet',
      shortName: 'Subdomains',
      category: 'DNS & Host Recon',
      icon: Globe,
      count: subdomainCount,
    },
    {
      id: 'sbom' as ActiveTool,
      name: 'SBOM License Resolver',
      shortName: 'SBOM Resolver',
      category: 'SPDX Compliance',
      icon: FileCode2,
      count: 0,
    },
    {
      id: 'ports' as ActiveTool,
      name: 'Port & Service Scanner',
      shortName: 'Port Scanner',
      category: 'Network & Port Recon',
      icon: Radio,
      count: 0,
    },
  ];

  return (
    <aside
      className={`relative border-r border-zinc-800/80 bg-zinc-950 flex flex-col justify-between transition-all duration-200 shrink-0 z-30 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top: Brand Header */}
      <div>
        <div className="h-14 flex items-center px-3.5 border-b border-zinc-800/80">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <div className="truncate min-w-0">
                <span className="text-xs font-bold tracking-tight text-zinc-100 uppercase font-mono block truncate">
                  DevSecOps
                </span>
                <span className="text-[10px] text-zinc-500 font-mono tracking-widest block uppercase">
                  Utilities
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <div className="p-2 space-y-1">
          {!isCollapsed && (
            <div className="px-2 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Utilities
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTool === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTool(item.id)}
                className={`w-full flex items-center rounded-lg transition-all text-left relative group ${
                  isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 space-x-3'
                } ${
                  isActive
                    ? 'bg-zinc-900 text-zinc-100 border border-zinc-800/90 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-emerald-500 rounded-r" />
                )}

                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-300'
                  }`}
                />

                {!isCollapsed && (
                  <div className="flex-1 truncate min-w-0 text-xs">
                    <div className="font-medium text-zinc-200 truncate">{item.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono truncate">{item.category}</div>
                  </div>
                )}

                {!isCollapsed && item.count > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 shrink-0">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom: Collapse Toggle Button */}
      <div className="p-2 border-t border-zinc-800/80">
        <button
          onClick={onToggleCollapse}
          className={`w-full flex items-center rounded-lg py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70 transition-colors ${
            isCollapsed ? 'justify-center px-0' : 'px-2.5 space-x-2.5'
          }`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 shrink-0 text-zinc-400" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 shrink-0 text-zinc-400" />
              <span className="font-mono text-[11px] truncate">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
