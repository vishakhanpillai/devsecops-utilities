import React from 'react';
import { FileSpreadsheet, Globe, FileCode2, Radio } from 'lucide-react';
import { ActiveTool } from './Sidebar';

interface HeaderProps {
  activeTool: ActiveTool;
  sonarIssuesCount: number;
  subdomainCount: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTool }) => {
  const getToolMetadata = () => {
    switch (activeTool) {
      case 'sonar':
        return {
          title: 'SonarQube Exporter',
          category: 'Code Quality & Security Findings',
          icon: FileSpreadsheet,
        };
      case 'subdomain':
        return {
          title: 'Subdomain MasterSheet',
          category: 'DNS & Host Reconnaissance',
          icon: Globe,
        };
      case 'sbom':
        return {
          title: 'SBOM License Resolver',
          category: 'SPDX Compliance Normalizer',
          icon: FileCode2,
        };
      case 'ports':
        return {
          title: 'Port & Service Scanner',
          category: 'Network & Port Reconnaissance',
          icon: Radio,
        };
    }
  };

  const current = getToolMetadata();
  const Icon = current.icon;

  return (
    <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-20 flex items-center px-6 lg:px-8">
      {/* Left: Current Active Tool Breadcrumb */}
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-mono text-zinc-500 uppercase">DevSecOps</span>
          <span className="text-zinc-700 font-mono">/</span>
          <span className="font-semibold text-zinc-200 tracking-tight font-mono uppercase">
            {current.title}
          </span>
          <span className="text-zinc-700 hidden sm:inline font-mono">·</span>
          <span className="text-zinc-500 text-[11px] hidden sm:inline font-mono">
            {current.category}
          </span>
        </div>
      </div>
    </header>
  );
};
