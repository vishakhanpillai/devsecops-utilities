import React from 'react';
import { FileSpreadsheet, Globe } from 'lucide-react';

export type ActiveTool = 'sonar' | 'subdomain';

interface HeaderProps {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  sonarIssuesCount: number;
  subdomainCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTool,
  onSelectTool,
  sonarIssuesCount,
  subdomainCount,
}) => {
  return (
    <header className="border-b border-zinc-800/70 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1720px] w-full mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
        {/* Left: Brand & Tool Switcher */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-100">
              {activeTool === 'sonar' ? (
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </div>
            <span className="text-xs font-semibold tracking-tight text-zinc-200 uppercase font-mono">
              {activeTool === 'sonar' ? (
                <>
                  SonarQube <span className="text-zinc-500 font-normal">/</span> Exporter
                </>
              ) : (
                <>
                  Subdomain <span className="text-zinc-500 font-normal">/</span> MasterSheet
                </>
              )}
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Tool Switcher */}
          <nav className="flex items-center gap-1 bg-zinc-950/60 p-0.5 rounded-lg border border-zinc-800/80">
            <button
              onClick={() => onSelectTool('sonar')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                activeTool === 'sonar'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span>SonarQube Exporter</span>
              {sonarIssuesCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-300">
                  {sonarIssuesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onSelectTool('subdomain')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                activeTool === 'subdomain'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span>Subdomain MasterSheet</span>
              {subdomainCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-300">
                  {subdomainCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-3">
          {activeTool === 'sonar' ? (
            <a
              href="https://docs.sonarsource.com/sonarqube/latest/user-guide/user-account/generating-and-using-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Token Docs
            </a>
          ) : (
            <a
              href="https://www.ietf.org/rfc/rfc1035.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              DNS RFC 1035
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
