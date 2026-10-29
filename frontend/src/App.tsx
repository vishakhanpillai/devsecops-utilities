import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar, ActiveTool } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { AlertBanner, AlertMessage } from './components/common/AlertBanner';
import { ConnectionForm } from './components/sonar/ConnectionForm';
import { ProjectCard } from './components/sonar/ProjectCard';
import { MetricsOverview } from './components/sonar/MetricsOverview';
import { IssueFilters } from './components/sonar/IssueFilters';
import { IssueTable } from './components/sonar/IssueTable';
import { ExportModal } from './components/sonar/ExportModal';
import { SubdomainScanner } from './components/subdomain/SubdomainScanner';
import { SbomResolver } from './components/sbom/SbomResolver';
import { PortScanner } from './components/portScanner/PortScanner';
import {
  SonarProject,
  SonarIssue,
  SonarConnectionConfig,
  FetchProgress,
  ExportOptions,
  QualityCategory,
  SonarSeverity,
} from './types/sonar';
import { testConnection, fetchAllProjectIssues } from './services/sonar/sonarApi';
import { exportSonarIssuesToExcel } from './services/sonar/sonarExcelExporter';

export const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ActiveTool>(() => {
    return (localStorage.getItem('devsecops_active_tool') as ActiveTool) || 'sonar';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('devsecops_sidebar_collapsed') === 'true';
  });

  const handleSelectTool = (tool: ActiveTool) => {
    setActiveTool(tool);
    localStorage.setItem('devsecops_active_tool', tool);
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('devsecops_sidebar_collapsed', String(next));
      return next;
    });
  };

  // SonarQube state
  const [serverUrl, setServerUrl] = useState('https://sonarcloud.io');
  const [project, setProject] = useState<SonarProject | null>(null);
  const [issues, setIssues] = useState<SonarIssue[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<FetchProgress | null>(null);
  const [alert, setAlert] = useState<AlertMessage | null>(null);

  // Sonar Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<QualityCategory | undefined>(undefined);
  const [selectedSeverity, setSelectedSeverity] = useState<SonarSeverity | undefined>(undefined);

  // Subdomain count helper for sidebar badge
  const [subdomainCount, setSubdomainCount] = useState<number>(0);

  // Track subdomain count changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('subdomain_react_records');
        if (saved) {
          const parsed = JSON.parse(saved);
          setSubdomainCount(Array.isArray(parsed) ? parsed.length : 0);
        } else {
          setSubdomainCount(0);
        }
      } catch {
        setSubdomainCount(0);
      }
    };

    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 2000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Sonar - Test Connection (Only checks if project exists; does NOT load project card or table)
  const handleTestConnection = async (config: SonarConnectionConfig) => {
    setIsTesting(true);
    setAlert(null);
    try {
      const proj = await testConnection(config);
      setAlert({
        type: 'success',
        title: 'Test Successful',
        message: `Project "${proj.name || proj.key}" exists and is accessible.`,
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        title: 'Test Failed',
        message: err.message || 'Project does not exist or SonarQube server is unreachable.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Sonar - Fetch All Issues
  const handleFetchIssues = async (config: SonarConnectionConfig) => {
    setIsLoading(true);
    setAlert(null);
    setServerUrl(config.serverUrl);
    try {
      const proj = await testConnection(config);
      const allIssues = await fetchAllProjectIssues(config, (prog) => {
        setProgress(prog);
      });

      setProject(proj);
      setIssues(allIssues);
      setHasFetched(true);
      const uniqueCount = new Set(allIssues.map((i) => i.key)).size;
      setAlert({
        type: 'success',
        title: 'Issues Loaded',
        message: `${uniqueCount.toLocaleString()} issues retrieved. Ready to export.`,
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        title: 'Fetch Error',
        message: err.message || 'An error occurred while fetching issues.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Sonar - Reset Data
  const handleReset = () => {
    setProject(null);
    setIssues([]);
    setHasFetched(false);
    setProgress(null);
    setAlert(null);
    setSelectedCategory(undefined);
    setSelectedSeverity(undefined);
    setSearchQuery('');
  };

  // Sonar - Export to Excel
  const handleExport = async (options: ExportOptions) => {
    if (!project) return;
    setIsExporting(true);
    try {
      await exportSonarIssuesToExcel(project, issues, serverUrl, options);
    } catch (err: any) {
      setAlert({
        type: 'error',
        title: 'Export Failed',
        message: err.message || 'Could not generate Excel export.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectFilter = (category?: QualityCategory, severity?: SonarSeverity) => {
    setSelectedCategory(category);
    setSelectedSeverity(severity);
  };

  // Sonar - Filtered Issues
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (selectedCategory && issue.category !== selectedCategory) return false;
      if (selectedSeverity && issue.severity !== selectedSeverity) return false;
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const inMessage = issue.message.toLowerCase().includes(query);
        const inRule =
          issue.rule.toLowerCase().includes(query) ||
          (issue.ruleName ? issue.ruleName.toLowerCase().includes(query) : false);
        const inComponent = issue.component.toLowerCase().includes(query);
        const inAuthor = issue.author ? issue.author.toLowerCase().includes(query) : false;
        const inTags = issue.tags ? issue.tags.some((t) => t.toLowerCase().includes(query)) : false;
        const inKey = issue.key.toLowerCase().includes(query);
        const inWhat = issue.vulnerabilityWhat ? issue.vulnerabilityWhat.toLowerCase().includes(query) : false;
        const inWhy = issue.rootCauseWhy ? issue.rootCauseWhy.toLowerCase().includes(query) : false;
        const inHow = issue.howToFix ? issue.howToFix.toLowerCase().includes(query) : false;
        const inRemarks = issue.remarks ? issue.remarks.toLowerCase().includes(query) : false;

        if (
          !inMessage &&
          !inRule &&
          !inComponent &&
          !inAuthor &&
          !inTags &&
          !inKey &&
          !inWhat &&
          !inWhy &&
          !inHow &&
          !inRemarks
        ) {
          return false;
        }
      }
      return true;
    });
  }, [issues, selectedCategory, selectedSeverity, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-row font-sans selection:bg-zinc-800 selection:text-white">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        activeTool={activeTool}
        onSelectTool={handleSelectTool}
        sonarIssuesCount={issues.length}
        subdomainCount={subdomainCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <Header
          activeTool={activeTool}
          sonarIssuesCount={issues.length}
          subdomainCount={subdomainCount}
        />

        {/* Dynamic Tool Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1720px] w-full mx-auto space-y-4">
          {/* Status Toast / Alert */}
          <AlertBanner alert={alert} onDismiss={() => setAlert(null)} />

          {/* Tab 1: SonarQube Excel Exporter */}
          {activeTool === 'sonar' && (
            <div className="space-y-4">
              <ConnectionForm
                onFetch={handleFetchIssues}
                onTestConnection={handleTestConnection}
                onReset={handleReset}
                isLoading={isLoading}
                isTesting={isTesting}
                progress={progress}
                hasData={hasFetched}
              />

              {/* Loaded Project & Issues Section - ONLY shown when Fetch Issues succeeds */}
              {hasFetched && project && (
                <div className="space-y-4 pt-1">
                  {/* Project Header Bar */}
                  <ProjectCard project={project} serverUrl={serverUrl} />

                  {/* Export Toolbar */}
                  <ExportModal
                    issues={issues}
                    onExport={handleExport}
                    isExporting={isExporting}
                  />

                  {/* Metrics Breakdown */}
                  <MetricsOverview
                    issues={issues}
                    onSelectFilter={handleSelectFilter}
                    activeCategory={selectedCategory}
                    activeSeverity={selectedSeverity}
                  />

                  {/* Issues Filters Toolbar */}
                  <IssueFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    selectedSeverity={selectedSeverity}
                    onSeverityChange={setSelectedSeverity}
                    totalIssues={new Set(issues.map((i) => i.key)).size}
                    filteredCount={new Set(filteredIssues.map((i) => i.key)).size}
                    onClearFilters={() => {
                      setSelectedCategory(undefined);
                      setSelectedSeverity(undefined);
                      setSearchQuery('');
                    }}
                  />

                  {/* Issues Table */}
                  <IssueTable issues={filteredIssues} />
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Subdomain MasterSheet */}
          {activeTool === 'subdomain' && (
            <div>
              <SubdomainScanner />
            </div>
          )}

          {/* Tab 3: SBOM License Resolver */}
          {activeTool === 'sbom' && (
            <div>
              <SbomResolver />
            </div>
          )}

          {/* Tab 4: Port & Service Scanner */}
          {activeTool === 'ports' && (
            <div>
              <PortScanner />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
