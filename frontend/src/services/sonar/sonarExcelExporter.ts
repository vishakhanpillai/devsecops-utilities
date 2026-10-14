import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  SonarIssue,
  SonarProject,
  SonarSeverity,
  QualityCategory,
  ExportOptions,
} from '../../types/sonar';

const SEVERITIES: SonarSeverity[] = ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const CATEGORIES: QualityCategory[] = ['SECURITY', 'RELIABILITY', 'MAINTAINABILITY'];

// Color palettes for tabs and cells (ARGB format for ExcelJS)
const TAB_COLORS: Record<string, string> = {
  SUMMARY: 'FF059669', // Emerald
  SECURITY: 'FFDC2626', // Red
  RELIABILITY: 'FFD97706', // Amber / Orange
  MAINTAINABILITY: 'FF4F46E5', // Indigo
  MASTER: 'FF0284C7', // Sky blue
};

const SEVERITY_COLORS: Record<
  SonarSeverity,
  { bg: string; fg: string; label: string }
> = {
  BLOCKER: { bg: 'FFFEE2E2', fg: 'FF991B1B', label: 'BLOCKER' },
  HIGH: { bg: 'FFFFE4E6', fg: 'FFE11D48', label: 'HIGH' },
  MEDIUM: { bg: 'FFFFEDD5', fg: 'FFEA580C', label: 'MEDIUM' },
  LOW: { bg: 'FFFEF3C7', fg: 'FFD97706', label: 'LOW' },
  INFO: { bg: 'FFE0F2FE', fg: 'FF0284C7', label: 'INFO' },
};

/**
 * Format category name nicely for sheet titles and display
 */
function formatCategory(cat: QualityCategory): string {
  switch (cat) {
    case 'SECURITY':
      return 'Security';
    case 'RELIABILITY':
      return 'Reliability';
    case 'MAINTAINABILITY':
      return 'Maintainability';
  }
}

/**
 * Capitalize severity name for tab title
 */
function formatSeverity(sev: SonarSeverity): string {
  return sev.charAt(0) + sev.slice(1).toLowerCase();
}

/**
 * Sanitizes worksheet name to comply with Excel's 31-character limit and forbidden characters
 */
function sanitizeSheetName(name: string): string {
  // Forbidden characters: \ / ? * [ ] :
  const clean = name.replace(/[\\/?*[\]:]/g, '_').trim();
  return clean.slice(0, 31);
}

/**
 * Generates the professional Excel report with sub-sheets for Security, Reliability, and Maintainability for each severity
 */
export async function exportSonarIssuesToExcel(
  project: SonarProject,
  issues: SonarIssue[],
  serverUrl: string,
  options: ExportOptions
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SonarQube Excel Exporter';
  workbook.lastModifiedBy = 'SonarQube Excel Exporter';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Filter issues based on export options
  let filteredIssues = issues;
  if (options.onlyUnresolved) {
    filteredIssues = filteredIssues.filter((i) => !i.resolution && i.status !== 'CLOSED');
  }
  if (options.selectedSeverities && options.selectedSeverities.length > 0) {
    filteredIssues = filteredIssues.filter((i) => options.selectedSeverities.includes(i.severity));
  }
  if (options.selectedCategories && options.selectedCategories.length > 0) {
    filteredIssues = filteredIssues.filter((i) => options.selectedCategories.includes(i.category));
  }
  if (options.authorFilter && options.authorFilter.trim() !== '') {
    const filter = options.authorFilter.toLowerCase().trim();
    filteredIssues = filteredIssues.filter((i) => i.author?.toLowerCase().includes(filter));
  }

  // Pre-calculate statistics
  const stats: Record<QualityCategory, Record<SonarSeverity, number>> = {
    SECURITY: { BLOCKER: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
    RELIABILITY: { BLOCKER: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
    MAINTAINABILITY: { BLOCKER: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
  };

  filteredIssues.forEach((issue) => {
    if (stats[issue.category] && stats[issue.category][issue.severity] !== undefined) {
      stats[issue.category][issue.severity]++;
    }
  });

  const categoryTotals = {
    SECURITY: Object.values(stats.SECURITY).reduce((a, b) => a + b, 0),
    RELIABILITY: Object.values(stats.RELIABILITY).reduce((a, b) => a + b, 0),
    MAINTAINABILITY: Object.values(stats.MAINTAINABILITY).reduce((a, b) => a + b, 0),
  };

  const severityTotals: Record<SonarSeverity, number> = {
    BLOCKER: stats.SECURITY.BLOCKER + stats.RELIABILITY.BLOCKER + stats.MAINTAINABILITY.BLOCKER,
    HIGH: stats.SECURITY.HIGH + stats.RELIABILITY.HIGH + stats.MAINTAINABILITY.HIGH,
    MEDIUM: stats.SECURITY.MEDIUM + stats.RELIABILITY.MEDIUM + stats.MAINTAINABILITY.MEDIUM,
    LOW: stats.SECURITY.LOW + stats.RELIABILITY.LOW + stats.MAINTAINABILITY.LOW,
    INFO: stats.SECURITY.INFO + stats.RELIABILITY.INFO + stats.MAINTAINABILITY.INFO,
  };

  // 1. SUMMARY SHEET
  if (options.includeSummarySheet) {
    buildSummarySheet(workbook, project, filteredIssues, stats, categoryTotals, severityTotals, serverUrl);
  }

  // 2. MASTER CATEGORY SHEETS (Optional, e.g. "All Security", "All Reliability")
  if (options.includeMasterSheet) {
    for (const cat of CATEGORIES) {
      const catIssues = filteredIssues.filter((i) => i.category === cat);
      if (catIssues.length > 0) {
        const sheetName = sanitizeSheetName(`All ${formatCategory(cat)}`);
        buildIssueSubSheet(workbook, sheetName, catIssues, TAB_COLORS[cat], serverUrl, `${formatCategory(cat)} — All Severities`);
      }
    }
  }

  // 3. SUB-SHEETS FOR EACH CATEGORY AND SEVERITY
  // As requested: "each sub sheets for security reliability and maintainabiity for each severity"
  if (options.splitBySeverity) {
    for (const cat of CATEGORIES) {
      for (const sev of SEVERITIES) {
        const subIssues = filteredIssues.filter((i) => i.category === cat && i.severity === sev);
        // We create the sheet if there are issues, or if user selected this severity/category
        const sheetName = sanitizeSheetName(`${formatCategory(cat)} - ${formatSeverity(sev)}`);
        
        buildIssueSubSheet(
          workbook,
          sheetName,
          subIssues,
          TAB_COLORS[cat],
          serverUrl,
          `${formatCategory(cat)} Issues (${formatSeverity(sev)} Severity)`
        );
      }
    }
  }

  // Write and trigger download in browser
  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().split('T')[0];
  const safeProjectKey = project.key.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeProjectKey}_SonarQube_Report_${dateStr}.xlsx`;

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename);
}

/**
 * Builds the Executive Summary sheet with Project metadata, KPI counters, and Severity-Category matrix
 */
function buildSummarySheet(
  workbook: ExcelJS.Workbook,
  project: SonarProject,
  issues: SonarIssue[],
  stats: Record<QualityCategory, Record<SonarSeverity, number>>,
  catTotals: Record<QualityCategory, number>,
  sevTotals: Record<SonarSeverity, number>,
  serverUrl: string
) {
  const sheet = workbook.addWorksheet('Overview & Summary', {
    properties: { tabColor: { argb: TAB_COLORS.SUMMARY } },
    views: [{ showGridLines: true }],
  });

  sheet.columns = [
    { width: 5 },  // A (padding)
    { width: 26 }, // B
    { width: 16 }, // C
    { width: 16 }, // D
    { width: 16 }, // E
    { width: 16 }, // F
    { width: 16 }, // G
    { width: 18 }, // H
    { width: 5 },  // I (padding)
  ];

  // Title Banner
  sheet.mergeCells('B2:H3');
  const titleCell = sheet.getCell('B2');
  titleCell.value = 'SonarQube Quality & Security Analysis Report';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }, // Deep Slate Navy
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Project Info Card
  sheet.mergeCells('B5:H5');
  const infoHeader = sheet.getCell('B5');
  infoHeader.value = 'PROJECT DETAILS & SCAN METADATA';
  infoHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  infoHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  infoHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const infoRows = [
    ['Project Name:', project.name || project.key, 'Quality Gate:', project.qualityGateStatus || 'N/A'],
    ['Project Key:', project.key, 'Scan Date:', project.lastAnalysisDate ? new Date(project.lastAnalysisDate).toLocaleString() : 'N/A'],
    ['SonarQube Host:', serverUrl, 'Export Date:', new Date().toLocaleString()],
    ['Total Issues Exported:', `${issues.length.toLocaleString()} issues`, 'Project Version:', project.version || 'Latest'],
  ];

  let currRow = 6;
  infoRows.forEach((row) => {
    sheet.getCell(`B${currRow}`).value = row[0];
    sheet.getCell(`B${currRow}`).font = { bold: true, color: { argb: 'FF475569' } };
    sheet.getCell(`C${currRow}`).value = row[1];
    sheet.mergeCells(`C${currRow}:E${currRow}`);

    sheet.getCell(`F${currRow}`).value = row[2];
    sheet.getCell(`F${currRow}`).font = { bold: true, color: { argb: 'FF475569' } };
    
    const statusCell = sheet.getCell(`G${currRow}`);
    statusCell.value = row[3];
    sheet.mergeCells(`G${currRow}:H${currRow}`);

    if (row[2] === 'Quality Gate:') {
      if (row[3] === 'OK') {
        statusCell.font = { bold: true, color: { argb: 'FF059669' } }; // Green
        statusCell.value = '✓ PASSED (OK)';
      } else if (row[3] === 'ERROR') {
        statusCell.font = { bold: true, color: { argb: 'FFDC2626' } }; // Red
        statusCell.value = '✗ FAILED (ERROR)';
      }
    }

    currRow++;
  });

  // MATRIX SECTION
  currRow += 2;
  sheet.mergeCells(`B${currRow}:H${currRow}`);
  const matrixHeader = sheet.getCell(`B${currRow}`);
  matrixHeader.value = 'ISSUES BREAKDOWN MATRIX (CATEGORY × SEVERITY)';
  matrixHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  matrixHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  matrixHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  currRow++;
  const tableHeaderRow = currRow;
  const matrixCols = ['Quality Category', 'Blocker', 'High', 'Medium', 'Low', 'Info', 'Category Total'];
  matrixCols.forEach((colTitle, idx) => {
    const colLetter = String.fromCharCode(66 + idx); // B, C, D, E, F, G, H
    const cell = sheet.getCell(`${colLetter}${tableHeaderRow}`);
    cell.value = colTitle;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'left' : 'center' };
  });

  currRow++;
  const categoriesList: QualityCategory[] = ['SECURITY', 'RELIABILITY', 'MAINTAINABILITY'];
  categoriesList.forEach((cat) => {
    const r = currRow;
    const catLabel = formatCategory(cat);
    
    // Category Name cell
    const nameCell = sheet.getCell(`B${r}`);
    nameCell.value = catLabel;
    nameCell.font = { bold: true, color: { argb: 'FF0F172A' } };
    nameCell.alignment = { vertical: 'middle', horizontal: 'left' };

    // Fill severities
    SEVERITIES.forEach((sev, sIdx) => {
      const colLetter = String.fromCharCode(67 + sIdx); // C..G
      const cell = sheet.getCell(`${colLetter}${r}`);
      const count = stats[cat][sev];
      cell.value = count;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Soft highlight if issues exist
      if (count > 0) {
        if (sev === 'BLOCKER') {
          cell.font = { bold: true, color: { argb: 'FF991B1B' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        } else if (sev === 'HIGH') {
          cell.font = { bold: true, color: { argb: 'FFE11D48' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
        } else if (sev === 'MEDIUM') {
          cell.font = { color: { argb: 'FFEA580C' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
        }
      }
    });

    // Total for this category
    const totCell = sheet.getCell(`H${r}`);
    totCell.value = catTotals[cat];
    totCell.font = { bold: true, color: { argb: 'FF0F172A' } };
    totCell.alignment = { vertical: 'middle', horizontal: 'center' };
    totCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

    currRow++;
  });

  // Grand Totals row
  const grandTotalRow = currRow;
  sheet.getCell(`B${grandTotalRow}`).value = 'GRAND TOTAL';
  sheet.getCell(`B${grandTotalRow}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell(`B${grandTotalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

  SEVERITIES.forEach((sev, sIdx) => {
    const colLetter = String.fromCharCode(67 + sIdx);
    const cell = sheet.getCell(`${colLetter}${grandTotalRow}`);
    cell.value = sevTotals[sev];
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const allSumCell = sheet.getCell(`H${grandTotalRow}`);
  allSumCell.value = issues.length;
  allSumCell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  allSumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  allSumCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Border formatting for table
  for (let rowIdx = tableHeaderRow; rowIdx <= grandTotalRow; rowIdx++) {
    for (let c = 2; c <= 8; c++) {
      const colLetter = String.fromCharCode(64 + c);
      sheet.getCell(`${colLetter}${rowIdx}`).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }
  }

  // Quick Navigation Guide
  currRow += 3;
  sheet.mergeCells(`B${currRow}:H${currRow}`);
  const navHeader = sheet.getCell(`B${currRow}`);
  navHeader.value = 'QUICK SUB-SHEET DIRECTORY';
  navHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  navHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  currRow++;
  const noteCell = sheet.getCell(`B${currRow}`);
  noteCell.value = 'Navigate using the tabs at the bottom of Excel to view detailed issue lists partitioned by Quality Category and Severity.';
  noteCell.font = { italic: true, color: { argb: 'FF64748B' } };
  sheet.mergeCells(`B${currRow}:H${currRow}`);
}

/**
 * Builds a dedicated sub-sheet for a specific category and severity
 */
function buildIssueSubSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  issues: SonarIssue[],
  tabColor: string,
  serverUrl: string,
  subTitle: string
) {
  const sheet = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: tabColor } },
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
  });

  // Setup columns strictly matching the user-requested 10-column template:
  // Issue Key | Category | Severity | Vulnerability (What) | File Path | Line Number | Code Snippet | Root Cause (Why) | How To Fix (Remediation Examples) | Status
  sheet.columns = [
    { header: 'Issue Key', key: 'key', width: 18 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Severity', key: 'severity', width: 14 },
    { header: 'Vulnerability (What)', key: 'vulnerabilityWhat', width: 44 },
    { header: 'File Path', key: 'component', width: 38 },
    { header: 'Line Number', key: 'line', width: 14 },
    { header: 'Code Snippet', key: 'codeSnippet', width: 48 },
    { header: 'Root Cause (Why)', key: 'rootCauseWhy', width: 50 },
    { header: 'How To Fix (Remediation Examples)', key: 'howToFix', width: 52 },
    { header: 'Status', key: 'status', width: 14 },
  ];

  // Header row formatting
  const headerRow = sheet.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }, // Slate Navy
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
    };
  });

  // If no issues found in this category/severity
  if (issues.length === 0) {
    const emptyRow = sheet.addRow({
      key: '-',
      category: '-',
      severity: '-',
      vulnerabilityWhat: `✓ Clean! No issues found for ${subTitle}.`,
      component: '-',
      line: '-',
      codeSnippet: '-',
      rootCauseWhy: '-',
      howToFix: '-',
      status: 'RESOLVED',
    });
    emptyRow.height = 26;
    const msgCell = emptyRow.getCell('vulnerabilityWhat');
    msgCell.font = { italic: true, bold: true, color: { argb: 'FF059669' } };
    return;
  }

  // Helper to prevent Excel from interpreting code or strings starting with =, +, -, @ as broken formulas
  const sanitizeExcelText = (str?: string): string => {
    if (!str) return '-';
    const trimmed = str.trim();
    if (/^[=\+\-@]/.test(trimmed)) {
      return `'${trimmed}`;
    }
    return trimmed;
  };

  // Populate data rows
  issues.forEach((issue, idx) => {
    const row = sheet.addRow({
      key: issue.key,
      category: formatCategory(issue.category),
      severity: issue.severity,
      vulnerabilityWhat: sanitizeExcelText(issue.vulnerabilityWhat || issue.message),
      component: issue.component,
      line: issue.line !== undefined ? issue.line : '-',
      codeSnippet: sanitizeExcelText(issue.codeSnippet),
      rootCauseWhy: sanitizeExcelText(issue.rootCauseWhy),
      howToFix: sanitizeExcelText(issue.howToFix),
      status: issue.status,
    });

    row.height = 40;

    // Alternating zebra row background
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBg },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    });

    // Formatting category, line & status
    row.getCell('category').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('line').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('line').font = { name: 'Consolas', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    row.getCell('status').alignment = { vertical: 'middle', horizontal: 'center' };

    // Format Issue Key with direct clickable hyperlink to SonarQube
    const keyCell = row.getCell('key');
    const linkUrl = issue.sonarUrl || `${serverUrl.replace(/\/+$/, '')}/project/issues?id=${encodeURIComponent(issue.project)}&open=${encodeURIComponent(issue.key)}`;
    if (linkUrl) {
      keyCell.value = {
        text: issue.key,
        hyperlink: linkUrl,
        tooltip: 'Click to open issue in SonarQube',
      };
      keyCell.font = {
        name: 'Consolas',
        size: 10,
        bold: true,
        color: { argb: 'FF2563EB' }, // Blue
        underline: true,
      };
      keyCell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // Format Severity Badge
    const sevConfig = SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.INFO;
    const sevCell = row.getCell('severity');
    sevCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sevCell.font = { bold: true, color: { argb: sevConfig.fg } };
    sevCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: sevConfig.bg },
    };

    // Monospace styling for Code Snippet
    const snippetCell = row.getCell('codeSnippet');
    snippetCell.font = { name: 'Consolas', size: 9.5, color: { argb: 'FF334155' } };
  });

  // Apply auto-filter across all 10 columns
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 10 },
  };
}
