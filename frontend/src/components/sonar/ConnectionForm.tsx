import React, { useState, useEffect } from 'react';
import {
  Globe,
  Key,
  FolderGit2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { SonarConnectionConfig, FetchProgress } from '../../types/sonar';

interface ConnectionFormProps {
  onFetch: (config: SonarConnectionConfig) => void;
  onTestConnection: (config: SonarConnectionConfig) => void;
  onReset: () => void;
  isLoading: boolean;
  isTesting: boolean;
  progress: FetchProgress | null;
  hasData: boolean;
}

const PRESETS = [
  { label: 'SonarCloud', url: 'https://sonarcloud.io' },
  { label: 'Localhost:9000', url: 'http://localhost:9000' },
];

export const ConnectionForm: React.FC<ConnectionFormProps> = ({
  onFetch,
  onTestConnection,
  onReset,
  isLoading,
  isTesting,
  progress,
  hasData,
}) => {
  const [serverUrl, setServerUrl] = useState('https://sonarcloud.io');
  const [projectKey, setProjectKey] = useState('');
  const [token, setToken] = useState('');
  const [organization, setOrganization] = useState('');
  const [branch, setBranch] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const savedUrl = localStorage.getItem('sonar_server_url');
      const savedKey = localStorage.getItem('sonar_project_key');
      const savedOrg = localStorage.getItem('sonar_organization');
      if (savedUrl) setServerUrl(savedUrl);
      if (savedKey) setProjectKey(savedKey);
      if (savedOrg) setOrganization(savedOrg);
    } catch {
      // Ignore
    }
  }, []);

  const handleSave = () => {
    try {
      if (serverUrl) localStorage.setItem('sonar_server_url', serverUrl);
      if (projectKey) localStorage.setItem('sonar_project_key', projectKey);
      if (organization) localStorage.setItem('sonar_organization', organization);
    } catch {
      // Ignore
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrl.trim() || !projectKey.trim()) return;
    handleSave();
    onFetch({
      serverUrl: serverUrl.trim(),
      projectKey: projectKey.trim(),
      token: token.trim(),
      organization: organization.trim() || undefined,
      branch: branch.trim() || undefined,
    });
  };

  const handleTest = () => {
    if (!serverUrl.trim() || !projectKey.trim()) return;
    handleSave();
    onTestConnection({
      serverUrl: serverUrl.trim(),
      projectKey: projectKey.trim(),
      token: token.trim(),
      organization: organization.trim() || undefined,
      branch: branch.trim() || undefined,
    });
  };

  // If data is loaded and user collapsed the connection form
  if (hasData && isCollapsed) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-5 py-3 flex items-center justify-between text-xs transition-all">
        <div className="flex items-center gap-3 font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-zinc-200 font-semibold">{projectKey}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400 truncate max-w-xs">{serverUrl}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(false)}
            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
          >
            Edit Connection
          </button>
          <button
            onClick={onReset}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/70 rounded-xl p-5 shadow-sm space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Top Strip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-zinc-300 tracking-wide uppercase font-mono">
              SonarQube Target
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setServerUrl(preset.url)}
                  className={`px-2 py-0.5 text-xs rounded font-medium transition-all ${
                    serverUrl === preset.url
                      ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {hasData && (
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="text-xs text-zinc-500 hover:text-zinc-300 ml-2"
              >
                Hide
              </button>
            )}
          </div>
        </div>

        {/* Wide Responsive Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Server URL */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">Server URL</label>
            <div className="relative">
              <Globe className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://sonarcloud.io"
                className="w-full pl-8 pr-3 py-2 text-xs bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono transition-colors"
              />
            </div>
          </div>

          {/* Project Key */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">Project Key</label>
            <div className="relative">
              <FolderGit2 className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value)}
                placeholder="org.myorg:project"
                className="w-full pl-8 pr-3 py-2 text-xs bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono transition-colors"
              />
            </div>
          </div>

          {/* Token */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">User Token</label>
            <div className="relative">
              <Key className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="squ_..."
                className="w-full pl-8 pr-8 py-2 text-xs bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={isLoading || isTesting || !projectKey.trim() || !serverUrl.trim()}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-center"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Loading</span>
                </span>
              ) : (
                'Fetch Issues'
              )}
            </button>

            <button
              type="button"
              onClick={handleTest}
              disabled={isLoading || isTesting || !projectKey.trim() || !serverUrl.trim()}
              className="py-2 px-3 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-800 hover:text-white border border-zinc-700/60 disabled:opacity-40 transition-colors"
              title="Verify project existence without loading issues"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Test'}
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Parameters */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Parameters {organization || branch ? '(configured)' : ''}</span>
            {showAdvanced ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-2.5 pt-2.5 border-t border-zinc-800/50">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Organization (SonarCloud)</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="org-key"
                  className="w-full px-3 py-1.5 text-xs bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Target Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3 py-1.5 text-xs bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar (during fetch) */}
        {isLoading && progress && (
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                {progress.message || 'Fetching issues...'}
              </span>
              <span className="text-zinc-400 font-mono text-[11px]">
                {progress.fetchedIssues.toLocaleString()} / {progress.totalIssues.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-zinc-100 h-1.5 rounded-full transition-all duration-200"
                style={{
                  width: `${
                    progress.totalIssues > 0
                      ? Math.min(100, Math.round((progress.fetchedIssues / progress.totalIssues) * 100))
                      : 20
                  }%`,
                }}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
