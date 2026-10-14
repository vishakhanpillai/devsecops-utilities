import {
  SonarConnectionConfig,
  SonarProject,
  SonarIssue,
  FetchProgress,
  QualityCategory,
  SonarSeverity,
  SonarType
} from '../../types/sonar';
import { parseSonarRule, cleanCodeSnippet, ParsedSonarRule } from './sonarKnowledge';

export class SonarApiError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'SonarApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Normalizes SonarQube URL by trimming and removing trailing slash
 */
export function normalizeSonarUrl(url: string): string {
  let clean = url.trim();
  if (!clean) return '';
  // Add protocol if missing
  if (!/^https?:\/\//i.test(clean)) {
    if (clean.startsWith('localhost') || clean.startsWith('127.0.0.1')) {
      clean = `http://${clean}`;
    } else {
      clean = `https://${clean}`;
    }
  }
  return clean.replace(/\/+$/, '');
}

/**
 * Helper to dispatch requests via proxy (to avoid CORS) with direct fetch fallback
 */
async function callSonarEndpoint<T = any>(
  targetUrl: string,
  token: string,
  signal?: AbortSignal
): Promise<T> {
  // First try the built-in server proxy
  try {
    const proxyResp = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        token: token.trim(),
      }),
      signal,
    });

    if (proxyResp.ok) {
      return await proxyResp.json();
    }

    if (proxyResp.status === 401) {
      throw new SonarApiError('Authentication failed: Invalid SonarQube token or insufficient permissions.', 401);
    }
    if (proxyResp.status === 403) {
      throw new SonarApiError('Access denied: You do not have permission to view this project or resource.', 403);
    }
    if (proxyResp.status === 404) {
      throw new SonarApiError('Not found: Project key or requested API endpoint does not exist.', 404);
    }

    const errJson = await proxyResp.json().catch(() => ({}));
    const message = errJson.errors?.[0]?.msg || errJson.error || `Server responded with HTTP ${proxyResp.status}`;
    throw new SonarApiError(message, proxyResp.status);
  } catch (proxyError: any) {
    if (proxyError instanceof SonarApiError) {
      throw proxyError;
    }

    // If proxy failed with network error, try direct browser fetch
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (token.trim()) {
        const base64Auth = btoa(`${token.trim()}:`);
        headers['Authorization'] = `Basic ${base64Auth}`;
      }

      const directResp = await fetch(targetUrl, {
        method: 'GET',
        headers,
        signal,
      });

      if (!directResp.ok) {
        if (directResp.status === 401) throw new SonarApiError('Authentication failed: Invalid token.', 401);
        if (directResp.status === 404) throw new SonarApiError('Project not found at specified URL.', 404);
        throw new SonarApiError(`SonarQube returned status ${directResp.status}`, directResp.status);
      }

      return await directResp.json();
    } catch (directError: any) {
      if (directError instanceof SonarApiError) throw directError;
      throw new SonarApiError(
        `Failed to reach SonarQube at ${targetUrl}. Check server URL and network connection. (Details: ${proxyError.message || directError.message})`
      );
    }
  }
}

/**
 * Helper to dispatch requests via proxy returning raw text (used by api/sources/raw)
 */
async function callSonarRawTextEndpoint(
  targetUrl: string,
  token: string,
  signal?: AbortSignal
): Promise<string> {
  try {
    const proxyResp = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        token: token.trim(),
      }),
      signal,
    });

    if (proxyResp.ok) {
      return await proxyResp.text();
    }
    throw new SonarApiError(`Failed to fetch raw text: ${proxyResp.status}`, proxyResp.status);
  } catch (proxyError: any) {
    if (proxyError instanceof SonarApiError) {
      throw proxyError;
    }
    const headers: Record<string, string> = {};
    if (token.trim()) {
      headers['Authorization'] = `Basic ${btoa(`${token.trim()}:`)}`;
    }
    const directResp = await fetch(targetUrl, {
      method: 'GET',
      headers,
      signal,
    });
    if (!directResp.ok) {
      throw new SonarApiError(`Status ${directResp.status}`, directResp.status);
    }
    return await directResp.text();
  }
}

export const SEVERITY_RANK: Record<string, number> = {
  BLOCKER: 5,
  CRITICAL: 4,
  HIGH: 4,
  MAJOR: 3,
  MEDIUM: 3,
  MINOR: 2,
  LOW: 2,
  INFO: 1,
};

export const NORMALIZED_SEVERITY_MAP: Record<string, SonarSeverity> = {
  BLOCKER: 'BLOCKER',
  CRITICAL: 'HIGH',
  HIGH: 'HIGH',
  MAJOR: 'MEDIUM',
  MEDIUM: 'MEDIUM',
  MINOR: 'LOW',
  LOW: 'LOW',
  INFO: 'INFO',
};

/**
 * Resolves the issue severity prioritizing the target quality pillar in SonarQube 10+ MQR mode,
 * matching SonarQube's dashboard cards.
 */
export function resolveIssueSeverity(
  issue: any,
  targetQuality?: string
): SonarSeverity {
  // 1. Map modern UI Impact (SonarQube 10.x+ Clean Code MQR mode)
  if (Array.isArray(issue.impacts) && issue.impacts.length > 0) {
    let chosenImpact: any = null;

    // Prioritize the impact corresponding to this finding's specific quality pillar
    if (targetQuality) {
      const match = issue.impacts.find(
        (imp: any) => imp.softwareQuality?.toUpperCase() === targetQuality.toUpperCase()
      );
      if (match) chosenImpact = match;
    }

    // Fallback to the impact with the highest severity
    if (!chosenImpact) {
      chosenImpact = issue.impacts.reduce((prev: any, curr: any) => {
        const prevRank = SEVERITY_RANK[prev.severity?.toUpperCase() || ''] || 0;
        const currRank = SEVERITY_RANK[curr.severity?.toUpperCase() || ''] || 0;
        return currRank > prevRank ? curr : prev;
      }, issue.impacts[0]);
    }

    if (chosenImpact?.severity) {
      const mapped = NORMALIZED_SEVERITY_MAP[chosenImpact.severity.toUpperCase()];
      if (mapped) return mapped;
    }
  }

  // 2. Fallback to classic severity
  const raw = (issue.severity || 'MEDIUM').toUpperCase();
  return NORMALIZED_SEVERITY_MAP[raw] || 'MEDIUM';
}

/**
 * Maps SonarQube issue type/impact to standard Quality Category
 */
export function categorizeIssue(type: string, impacts?: Array<{ softwareQuality: string }>): QualityCategory {
  const normalizedType = (type || '').toUpperCase();

  if (normalizedType === 'VULNERABILITY' || normalizedType === 'SECURITY_HOTSPOT') {
    return 'SECURITY';
  }
  if (normalizedType === 'BUG') {
    return 'RELIABILITY';
  }
  if (normalizedType === 'CODE_SMELL') {
    return 'MAINTAINABILITY';
  }

  // Fallback to SonarQube 10+ Clean Code impacts
  if (impacts && impacts.length > 0) {
    const quality = impacts[0].softwareQuality?.toUpperCase();
    if (quality === 'SECURITY') return 'SECURITY';
    if (quality === 'RELIABILITY') return 'RELIABILITY';
    if (quality === 'MAINTAINABILITY') return 'MAINTAINABILITY';
  }

  return 'MAINTAINABILITY';
}

/**
 * Normalizes component file path for display
 */
export function cleanFilePath(component: string, projectKey: string): string {
  if (!component) return '';
  if (component === projectKey) return '[Project Root]';
  // Strip projectKey: prefix
  const prefix = `${projectKey}:`;
  if (component.startsWith(prefix)) {
    return component.slice(prefix.length);
  }
  return component;
}

/**
 * Tests connection to SonarQube and retrieves project summary metadata
 */
export async function testConnection(
  config: SonarConnectionConfig,
  signal?: AbortSignal
): Promise<SonarProject> {
  const baseUrl = normalizeSonarUrl(config.serverUrl);
  if (!baseUrl) {
    throw new SonarApiError('Please provide a valid SonarQube server URL.');
  }
  if (!config.projectKey.trim()) {
    throw new SonarApiError('Please enter a SonarQube project key.');
  }

  const projectKey = config.projectKey.trim();

  // 1. Fetch project component
  const componentUrl = `${baseUrl}/api/components/show?component=${encodeURIComponent(projectKey)}`;
  const compData = await callSonarEndpoint<{ component: any }>(componentUrl, config.token, signal);

  if (!compData?.component) {
    throw new SonarApiError(`Project "${projectKey}" was not found on ${baseUrl}.`);
  }

  const component = compData.component;

  // 2. Fetch quality gate status (optional)
  let qualityGateStatus: 'OK' | 'ERROR' | 'WARN' | 'NONE' = 'NONE';
  try {
    const qgUrl = `${baseUrl}/api/qualitygates/project_status?projectKey=${encodeURIComponent(projectKey)}${
      config.branch ? `&branch=${encodeURIComponent(config.branch)}` : ''
    }`;
    const qgData = await callSonarEndpoint<{ projectStatus?: { status: string } }>(qgUrl, config.token, signal);
    const rawStatus = qgData.projectStatus?.status?.toUpperCase();
    if (rawStatus === 'OK') qualityGateStatus = 'OK';
    else if (rawStatus === 'ERROR') qualityGateStatus = 'ERROR';
    else if (rawStatus === 'WARN') qualityGateStatus = 'WARN';
  } catch {
    // Quality gate status might fail if not analyzed or missing permissions
    qualityGateStatus = 'NONE';
  }

  // 3. Fetch measures (metrics: bugs, vulnerabilities, code_smells, hotspots, ncloc)
  const metricsData: SonarProject['metrics'] = {};
  let totalIssuesCount = 0;
  try {
    const measuresUrl = `${baseUrl}/api/measures/component?component=${encodeURIComponent(
      projectKey
    )}&metricKeys=bugs,vulnerabilities,code_smells,security_hotspots,coverage,duplicated_lines_density,ncloc${
      config.branch ? `&branch=${encodeURIComponent(config.branch)}` : ''
    }`;
    const measuresResp = await callSonarEndpoint<{ component?: { measures?: Array<{ metric: string; value: string }> } }>(
      measuresUrl,
      config.token,
      signal
    );

    const measures = measuresResp.component?.measures || [];
    measures.forEach((m) => {
      const val = parseFloat(m.value) || 0;
      if (m.metric === 'bugs') metricsData.bugs = val;
      if (m.metric === 'vulnerabilities') metricsData.vulnerabilities = val;
      if (m.metric === 'code_smells') metricsData.codeSmells = val;
      if (m.metric === 'security_hotspots') metricsData.securityHotspots = val;
      if (m.metric === 'coverage') metricsData.coverage = `${m.value}%`;
      if (m.metric === 'duplicated_lines_density') metricsData.duplications = `${m.value}%`;
      if (m.metric === 'ncloc') metricsData.ncloc = val;
    });

    totalIssuesCount = (metricsData.bugs || 0) + (metricsData.vulnerabilities || 0) + (metricsData.codeSmells || 0);
  } catch {
    // Measures are optional
  }

  return {
    key: component.key,
    name: component.name || component.key,
    qualifier: component.qualifier,
    visibility: component.visibility,
    lastAnalysisDate: component.analysisDate,
    version: component.version,
    qualityGateStatus,
    metrics: metricsData,
    totalIssuesCount,
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch {
        // Fallback gracefully on individual item failures
      }
    }
  });

  await Promise.all(workers);
  return results;
}

interface RawIssueItem {
  key: string;
  rule: string;
  ruleName?: string;
  severity: SonarSeverity;
  type: SonarType;
  category: QualityCategory;
  targetQuality?: string;
  rawComponent: string;
  cleanComponent: string;
  line?: number;
  message: string;
  status: string;
  effort?: string;
  debt?: string;
  resolution?: string;
  author?: string;
  tags?: string[];
  creationDate: string;
  updateDate?: string;
  sonarUrl: string;
  rawIssue: any;
  textRange?: {
    startLine: number;
    endLine: number;
    startOffset?: number;
    endOffset?: number;
  };
}

/**
 * Fetches all issues for the project with MQR (Clean Code) 3-pillar support,
 * fast file-level raw caching, parallel rule resolution, and authentic SonarQube documentation.
 */
export async function fetchAllProjectIssues(
  config: SonarConnectionConfig,
  onProgress?: (progress: FetchProgress) => void,
  signal?: AbortSignal
): Promise<SonarIssue[]> {
  const baseUrl = normalizeSonarUrl(config.serverUrl);
  const projectKey = config.projectKey.trim();

  const ruleDetailsMap = new Map<string, ParsedSonarRule>();
  const ruleNameMap = new Map<string, string>();
  const rawIssuesList: RawIssueItem[] = [];
  const seenPillarKeys = new Set<string>();

  const pageSize = 500;

  onProgress?.({
    status: 'fetching',
    totalIssues: 0,
    fetchedIssues: 0,
    currentPage: 1,
    totalPages: 1,
    message: 'Analyzing SonarQube project and query capabilities...',
  });

  const qualityPillars: Array<{ code: string; category: QualityCategory; name: string }> = [
    { code: 'SECURITY', category: 'SECURITY', name: 'Security' },
    { code: 'RELIABILITY', category: 'RELIABILITY', name: 'Reliability' },
    { code: 'MAINTAINABILITY', category: 'MAINTAINABILITY', name: 'Maintainability' },
  ];

  const legacyTypes: Array<{ type: string; category: QualityCategory; name: string }> = [
    { type: 'VULNERABILITY', category: 'SECURITY', name: 'Security' },
    { type: 'BUG', category: 'RELIABILITY', name: 'Reliability' },
    { type: 'CODE_SMELL', category: 'MAINTAINABILITY', name: 'Maintainability' },
  ];

  const processIssuesBatch = (
    data: any,
    assignedCategory: QualityCategory,
    targetQuality: string
  ) => {
    if (Array.isArray(data.rules)) {
      data.rules.forEach((r: any) => {
        if (r.key) {
          if (r.name) ruleNameMap.set(r.key, r.name);
          const parsed = parseSonarRule(r);
          if (parsed.rootCauseWhy && !parsed.rootCauseWhy.startsWith('Refer to SonarQube')) {
            ruleDetailsMap.set(r.key, parsed);
          }
        }
      });
    }

    if (Array.isArray(data.issues)) {
      data.issues.forEach((raw: any) => {
        const dedupKey = `${raw.key}:${assignedCategory}`;
        if (seenPillarKeys.has(dedupKey)) return;
        seenPillarKeys.add(dedupKey);

        const type: SonarType = raw.type || 'CODE_SMELL';
        const severity: SonarSeverity = resolveIssueSeverity(raw, targetQuality);
        const cleanComponent = cleanFilePath(raw.component, projectKey);
        const ruleName = ruleNameMap.get(raw.rule) || raw.rule;
        const line = raw.line || raw.textRange?.startLine;
        const message = raw.message || 'No description provided';

        rawIssuesList.push({
          key: raw.key,
          rule: raw.rule,
          ruleName,
          severity,
          type,
          category: assignedCategory,
          targetQuality,
          rawComponent: raw.component || '',
          cleanComponent,
          line,
          message,
          status: raw.status || 'OPEN',
          effort: raw.effort,
          debt: raw.debt || raw.effort,
          resolution: raw.resolution,
          author: raw.author,
          tags: raw.tags || [],
          creationDate: raw.creationDate,
          updateDate: raw.updateDate,
          sonarUrl: `${baseUrl}/project/issues?id=${encodeURIComponent(projectKey)}&open=${encodeURIComponent(raw.key)}`,
          textRange: raw.textRange,
          rawIssue: raw,
        });
      });
    }
  };

  // Helper to paginate a single search query safely up to SonarQube's 10k window limit
  const paginateQuery = async (
    baseParams: string,
    assignedCategory: QualityCategory,
    targetQuality: string,
    label: string
  ) => {
    let page = 1;
    while (page <= 20) {
      if (signal?.aborted) throw new SonarApiError('Issue fetch cancelled by user.');

      const url = `${baseUrl}/api/issues/search?${baseParams}&p=${page}&ps=${pageSize}&additionalFields=_all`;
      let data: any;
      try {
        data = await callSonarEndpoint<any>(url, config.token, signal);
      } catch (err: any) {
        if (page === 1) throw err;
        break;
      }

      processIssuesBatch(data, assignedCategory, targetQuality);

      const total = data.total ?? data.paging?.total ?? 0;
      onProgress?.({
        status: 'fetching',
        totalIssues: Math.max(total, rawIssuesList.length),
        fetchedIssues: rawIssuesList.length,
        currentPage: page,
        totalPages: Math.min(20, Math.ceil(total / pageSize)),
        message: `Fetched ${rawIssuesList.length} findings (${label}, Page ${page})...`,
      });

      if (page * pageSize >= total || !data.issues || data.issues.length < pageSize) {
        break;
      }
      page++;
    }
  };

  // 1. Check if Modern Clean Code (MQR) impactSoftwareQualities is supported
  let mqrSupported = true;
  let testQuery = `componentKeys=${encodeURIComponent(projectKey)}&resolved=false&impactSoftwareQualities=SECURITY&ps=1`;
  if (config.branch) testQuery += `&branch=${encodeURIComponent(config.branch)}`;
  if (config.organization) testQuery += `&organization=${encodeURIComponent(config.organization)}`;

  try {
    await callSonarEndpoint<any>(`${baseUrl}/api/issues/search?${testQuery}`, config.token, signal);
  } catch {
    mqrSupported = false;
  }

  // 2. Fetch issues according to detected SonarQube version
  if (mqrSupported) {
    // Modern SonarQube 10.x+ Clean Code MQR mode: fetch Security, Reliability, and Maintainability pillars
    for (const pillar of qualityPillars) {
      if (signal?.aborted) throw new SonarApiError('Issue fetch cancelled by user.');

      let baseParams = `componentKeys=${encodeURIComponent(projectKey)}&resolved=false&impactSoftwareQualities=${pillar.code}`;
      if (config.branch) baseParams += `&branch=${encodeURIComponent(config.branch)}`;
      if (config.organization) baseParams += `&organization=${encodeURIComponent(config.organization)}`;

      // Check total count for this pillar
      const firstUrl = `${baseUrl}/api/issues/search?${baseParams}&p=1&ps=${pageSize}&additionalFields=_all`;
      const firstData = await callSonarEndpoint<any>(firstUrl, config.token, signal);
      const pillarTotal = firstData.total ?? firstData.paging?.total ?? 0;

      processIssuesBatch(firstData, pillar.category, pillar.code);

      if (pillarTotal <= 10000) {
        // Safe to paginate normally
        if (pillarTotal > pageSize) {
          for (let p = 2; p <= Math.ceil(pillarTotal / pageSize); p++) {
            if (signal?.aborted) throw new SonarApiError('Issue fetch cancelled by user.');
            const pUrl = `${baseUrl}/api/issues/search?${baseParams}&p=${p}&ps=${pageSize}&additionalFields=_all`;
            const pData = await callSonarEndpoint<any>(pUrl, config.token, signal);
            processIssuesBatch(pData, pillar.category, pillar.code);

            onProgress?.({
              status: 'fetching',
              totalIssues: rawIssuesList.length,
              fetchedIssues: rawIssuesList.length,
              currentPage: p,
              totalPages: Math.ceil(pillarTotal / pageSize),
              message: `Fetched ${rawIssuesList.length} findings (${pillar.name} Pillar, Page ${p})...`,
            });
          }
        }
      } else {
        // Exceeds 10,000 issues for single quality: partition by impactSeverities to bypass 10k window limit
        const severities = ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
        for (const sev of severities) {
          const partitionedBase = `${baseParams}&impactSeverities=${sev}`;
          await paginateQuery(partitionedBase, pillar.category, pillar.code, `${pillar.name} - ${sev}`);
        }
      }
    }
  } else {
    // Fallback for older SonarQube instances (<10.2) using legacy types
    for (const legacy of legacyTypes) {
      if (signal?.aborted) throw new SonarApiError('Issue fetch cancelled by user.');

      let baseParams = `componentKeys=${encodeURIComponent(projectKey)}&resolved=false&types=${legacy.type}`;
      if (config.branch) baseParams += `&branch=${encodeURIComponent(config.branch)}`;
      if (config.organization) baseParams += `&organization=${encodeURIComponent(config.organization)}`;

      const firstUrl = `${baseUrl}/api/issues/search?${baseParams}&p=1&ps=${pageSize}&additionalFields=_all`;
      const firstData = await callSonarEndpoint<any>(firstUrl, config.token, signal);
      const legacyTotal = firstData.total ?? firstData.paging?.total ?? 0;

      processIssuesBatch(firstData, legacy.category, legacy.type);

      if (legacyTotal <= 10000) {
        if (legacyTotal > pageSize) {
          for (let p = 2; p <= Math.ceil(legacyTotal / pageSize); p++) {
            if (signal?.aborted) throw new SonarApiError('Issue fetch cancelled by user.');
            const pUrl = `${baseUrl}/api/issues/search?${baseParams}&p=${p}&ps=${pageSize}&additionalFields=_all`;
            const pData = await callSonarEndpoint<any>(pUrl, config.token, signal);
            processIssuesBatch(pData, legacy.category, legacy.type);

            onProgress?.({
              status: 'fetching',
              totalIssues: rawIssuesList.length,
              fetchedIssues: rawIssuesList.length,
              currentPage: p,
              totalPages: Math.ceil(legacyTotal / pageSize),
              message: `Fetched ${rawIssuesList.length} findings (${legacy.name}, Page ${p})...`,
            });
          }
        }
      } else {
        const severities = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'];
        for (const sev of severities) {
          const partitionedBase = `${baseParams}&severities=${sev}`;
          await paginateQuery(partitionedBase, legacy.category, legacy.type, `${legacy.name} - ${sev}`);
        }
      }
    }
  }

  // 3. Query Security Hotspots (if supported) - REMOVED
  // SonarQube's MQR dashboard natively keeps "Security Hotspots" completely separate
  // from "Software Quality: Security". Fetching hotspots and artificially categorizing them
  // as "SECURITY" causes the dashboard counts to mismatch significantly.

  // 4. Pre-fetch official SonarQube rule documentation in parallel
  const uniqueRuleKeys = Array.from(new Set(rawIssuesList.map((i) => i.rule).filter(Boolean)));
  const rulesToFetch = uniqueRuleKeys.filter((key) => {
    const details = ruleDetailsMap.get(key);
    return !details || details.rootCauseWhy.startsWith('Refer to SonarQube');
  });

  if (rulesToFetch.length > 0) {
    onProgress?.({
      status: 'fetching',
      totalIssues: rawIssuesList.length,
      fetchedIssues: rawIssuesList.length,
      currentPage: 1,
      totalPages: 1,
      message: `Fetching official SonarQube rule documentation (${rulesToFetch.length} rules)...`,
    });

    await runWithConcurrency(rulesToFetch, 10, async (ruleKey) => {
      if (signal?.aborted) return;
      try {
        const ruleUrl = `${baseUrl}/api/rules/show?key=${encodeURIComponent(ruleKey)}`;
        const ruleResp = await callSonarEndpoint<{ rule?: any }>(ruleUrl, config.token, signal);
        if (ruleResp?.rule) {
          const parsed = parseSonarRule(ruleResp.rule);
          ruleDetailsMap.set(ruleKey, parsed);
          if (ruleResp.rule.name) {
            ruleNameMap.set(ruleKey, ruleResp.rule.name);
          }
        }
      } catch {
        // Skip on individual rule error
      }
    });
  }

  // 5. Fast source code line retrieval using file_cache + api/sources/raw (fast path)
  const fileLinesCache = new Map<string, string[] | null>();
  const sourceCache = new Map<string, string>(); // `${compKey}:${line}` -> cleaned snippet

  const uniqueComponents = Array.from(
    new Set(rawIssuesList.map((i) => i.rawComponent).filter(Boolean))
  );

  onProgress?.({
    status: 'fetching',
    totalIssues: rawIssuesList.length,
    fetchedIssues: rawIssuesList.length,
    currentPage: 1,
    totalPages: 1,
    message: `Fetching source files from SonarQube (${uniqueComponents.length} files)...`,
  });

  // Pre-fetch raw files concurrently in batches of 8
  await runWithConcurrency(uniqueComponents, 8, async (compKey) => {
    if (signal?.aborted) return;
    try {
      const rawUrl = `${baseUrl}/api/sources/raw?key=${encodeURIComponent(compKey)}`;
      const rawText = await callSonarRawTextEndpoint(rawUrl, config.token, signal);
      if (rawText && typeof rawText === 'string') {
        fileLinesCache.set(compKey, rawText.split(/\r?\n/));
      } else {
        fileLinesCache.set(compKey, null);
      }
    } catch {
      fileLinesCache.set(compKey, null);
    }
  });

  // Resolve code snippets for all issues
  onProgress?.({
    status: 'fetching',
    totalIssues: rawIssuesList.length,
    fetchedIssues: rawIssuesList.length,
    currentPage: 1,
    totalPages: 1,
    message: `Mapping code snippets to findings...`,
  });

  const snippets = await runWithConcurrency(rawIssuesList, 8, async (raw) => {
    if (signal?.aborted) return 'N/A';
    const compKey = raw.rawComponent;
    const line = raw.line || raw.textRange?.startLine;
    if (!compKey || !line) return 'N/A';

    const cacheKey = `${compKey}:${line}`;
    if (sourceCache.has(cacheKey)) {
      return sourceCache.get(cacheKey)!;
    }

    // Fast path: read from cached file lines
    const cachedLines = fileLinesCache.get(compKey);
    if (cachedLines && line >= 1 && line <= cachedLines.length) {
      const cleaned = cleanCodeSnippet(cachedLines[line - 1]);
      sourceCache.set(cacheKey, cleaned);
      return cleaned;
    }

    // Fallback: query api/sources/lines if raw file was unavailable
    try {
      const lineUrl = `${baseUrl}/api/sources/lines?key=${encodeURIComponent(compKey)}&from=${line}&to=${line}`;
      const lineResp = await callSonarEndpoint<{ sources?: Array<{ line: number; code: string }> }>(
        lineUrl,
        config.token,
        signal
      );
      if (Array.isArray(lineResp?.sources) && lineResp.sources.length > 0) {
        const cleaned = cleanCodeSnippet(lineResp.sources[0].code);
        sourceCache.set(cacheKey, cleaned);
        return cleaned;
      }
    } catch {
      // Line could not be fetched
    }

    return 'Source line could not be fetched.';
  });

  // 6. Build final SonarIssue models strictly containing what SonarQube says
  const allIssues: SonarIssue[] = rawIssuesList.map((raw, idx) => {
    const resolvedRuleName = ruleNameMap.get(raw.rule) || raw.ruleName || raw.rule;
    const ruleDetails = ruleDetailsMap.get(raw.rule);

    let vulnerabilityWhat = raw.message;
    if (resolvedRuleName && resolvedRuleName !== raw.rule && resolvedRuleName !== raw.message) {
      vulnerabilityWhat = `${resolvedRuleName}: ${raw.message}`;
    }

    const codeSnippet = snippets[idx] || 'N/A';
    const rootCauseWhy =
      ruleDetails?.rootCauseWhy || 'Refer to SonarQube rule description for root cause analysis.';
    const howToFix =
      ruleDetails?.howToFix || 'Refer to SonarQube rule remediation guidelines for code fixes.';

    return {
      key: raw.key,
      rule: raw.rule,
      ruleName: resolvedRuleName,
      severity: raw.severity,
      type: raw.type,
      category: raw.category,
      vulnerabilityWhat,
      component: raw.cleanComponent,
      line: raw.line,
      codeSnippet,
      rootCauseWhy,
      howToFix,
      status: raw.status,
      effort: raw.effort,
      debt: raw.debt,
      resolution: raw.resolution,
      author: raw.author,
      tags: raw.tags,
      project: projectKey,
      message: raw.message,
      creationDate: raw.creationDate,
      updateDate: raw.updateDate,
      sonarUrl: raw.sonarUrl,
      textRange: raw.textRange,
    };
  });

  onProgress?.({
    status: 'completed',
    totalIssues: allIssues.length,
    fetchedIssues: allIssues.length,
    currentPage: 1,
    totalPages: 1,
    message: `Successfully loaded all ${allIssues.length} issues with official SonarQube documentation!`,
  });

  return allIssues;
}
