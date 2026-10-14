export type SonarSeverity = 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type SonarType = 'BUG' | 'VULNERABILITY' | 'CODE_SMELL' | 'SECURITY_HOTSPOT';

export type QualityCategory = 'SECURITY' | 'RELIABILITY' | 'MAINTAINABILITY';

export interface SonarIssue {
  key: string;
  rule: string;
  ruleName?: string;
  severity: SonarSeverity;
  type: SonarType;
  category: QualityCategory;
  vulnerabilityWhat: string;        // Vulnerability (What)
  component: string;                // File Path
  line?: number;                    // Line Number
  codeSnippet: string;              // Code Snippet
  rootCauseWhy: string;             // Root Cause (Why)
  howToFix: string;                 // How To Fix (Remediation Examples)
  status: string;                   // Status
  remarks?: string;                 // Optional legacy remarks
  effort?: string;
  debt?: string;
  resolution?: string;
  author?: string;
  tags?: string[];
  project: string;
  message: string;
  creationDate: string;
  updateDate?: string;
  sonarUrl?: string;                // Direct link to issue in SonarQube
  textRange?: {
    startLine: number;
    endLine: number;
    startOffset?: number;
    endOffset?: number;
  };
}

export interface SonarProject {
  key: string;
  name: string;
  qualifier?: string;
  visibility?: string;
  lastAnalysisDate?: string;
  version?: string;
  qualityGateStatus?: 'OK' | 'ERROR' | 'WARN' | 'NONE';
  totalIssuesCount?: number;
  metrics?: {
    bugs?: number;
    vulnerabilities?: number;
    codeSmells?: number;
    securityHotspots?: number;
    coverage?: string;
    duplications?: string;
    ncloc?: number;
  };
}

export interface SonarConnectionConfig {
  serverUrl: string;
  projectKey: string;
  token: string;
  organization?: string;
  branch?: string;
}

export interface FetchProgress {
  status: 'idle' | 'testing' | 'fetching' | 'completed' | 'error';
  totalIssues: number;
  fetchedIssues: number;
  currentPage: number;
  totalPages: number;
  message: string;
}

export interface ExportOptions {
  splitBySeverity: boolean;
  includeSummarySheet: boolean;
  includeMasterSheet: boolean;
  includeDirectLinks: boolean;
  selectedSeverities: SonarSeverity[];
  selectedCategories: QualityCategory[];
  onlyUnresolved: boolean;
  authorFilter?: string;
}
