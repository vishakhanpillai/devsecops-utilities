import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { SbomResolutionResult } from '../../types/sbom';

export async function exportSbomToExcel(result: SbomResolutionResult, filenamePrefix = 'sbom-license-report'): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DevSecOps Utilities Suite';
  workbook.created = new Date();

  // Colors
  const darkHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF18181B' }, // Zinc-900
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Segoe UI',
    size: 10,
    bold: true,
    color: { argb: 'FFF4F4F5' }, // Zinc-100
  };

  const borderStyle: Partial<ExcelJS.Border> = {
    style: 'thin',
    color: { argb: 'FF27272A' }, // Zinc-800
  };

  const cellBorders: Partial<ExcelJS.Borders> = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
  };

  // ==========================================
  // SHEET 1: Executive Summary
  // ==========================================
  const summarySheet = workbook.addWorksheet('Executive Summary', {
    views: [{ showGridLines: true }],
  });

  // Title banner
  summarySheet.mergeCells('B2:F2');
  const titleCell = summarySheet.getCell('B2');
  titleCell.value = 'SBOM License Compliance & Resolution Report';
  titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFF4F4F5' } };
  titleCell.fill = darkHeaderFill;
  titleCell.alignment = { vertical: 'middle', indent: 1 };
  summarySheet.getRow(2).height = 36;

  // Metadata block
  summarySheet.getCell('B4').value = 'Report Generated:';
  summarySheet.getCell('C4').value = new Date().toLocaleString();
  summarySheet.getCell('B5').value = 'SBOM Standard:';
  summarySheet.getCell('C5').value = `${result.bomFormat} ${result.specVersion || ''}`.trim();
  summarySheet.getCell('B6').value = 'Resolution Rate:';
  summarySheet.getCell('C6').value = `${result.stats.resolutionRate}%`;

  ['B4', 'B5', 'B6'].forEach((cell) => {
    summarySheet.getCell(cell).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFA1A1AA' } };
  });

  // KPI Metrics Table
  const metricHeaders = ['Metric', 'Count', 'Status / Notes'];
  const metricRow = summarySheet.getRow(8);
  metricHeaders.forEach((h, idx) => {
    const c = metricRow.getCell(idx + 2);
    c.value = h;
    c.fill = darkHeaderFill;
    c.font = headerFont;
    c.border = cellBorders;
  });
  metricRow.height = 24;

  const kpis = [
    ['Total Components Analyzed', result.stats.totalComponents, 'Inventory inspected'],
    ['Successfully Resolved "Unknown" Licenses', result.stats.resolvedUnknowns, 'Legacy URLs mapped to SPDX'],
    ['Previously Recognized Standard Licenses', result.stats.alreadyValid, 'Valid out-of-the-box'],
    ['Unresolved Licenses (Action Needed)', result.stats.unresolved, 'Requires manual mapping or override'],
  ];

  kpis.forEach((kpi, idx) => {
    const row = summarySheet.getRow(9 + idx);
    row.getCell(2).value = kpi[0];
    row.getCell(3).value = kpi[1];
    row.getCell(4).value = kpi[2];
    row.getCell(2).font = { name: 'Segoe UI', size: 9.5 };
    row.getCell(3).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: idx === 1 ? 'FF10B981' : idx === 3 && result.stats.unresolved > 0 ? 'FFF43F5E' : 'FFF4F4F5' } };
    row.getCell(4).font = { name: 'Segoe UI', size: 9, color: { argb: 'FFA1A1AA' } };
    [2, 3, 4].forEach((c) => (row.getCell(c).border = cellBorders));
    row.height = 20;
  });

  // Top Licenses distribution
  const topStartRow = 15;
  summarySheet.getCell(`B${topStartRow}`).value = 'Top License Distribution';
  summarySheet.getCell(`B${topStartRow}`).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFF4F4F5' } };

  summarySheet.getRow(topStartRow + 1).getCell(2).value = 'SPDX License Identifier';
  summarySheet.getRow(topStartRow + 1).getCell(3).value = 'Package Count';
  summarySheet.getRow(topStartRow + 1).getCell(4).value = 'Share %';
  [2, 3, 4].forEach((c) => {
    const cell = summarySheet.getRow(topStartRow + 1).getCell(c);
    cell.fill = darkHeaderFill;
    cell.font = headerFont;
    cell.border = cellBorders;
  });

  result.stats.topLicenses.forEach((lic, idx) => {
    const r = summarySheet.getRow(topStartRow + 2 + idx);
    const pct = result.stats.totalComponents > 0 ? Math.round((lic.count / result.stats.totalComponents) * 1000) / 10 : 0;
    r.getCell(2).value = lic.spdx;
    r.getCell(3).value = lic.count;
    r.getCell(4).value = `${pct}%`;
    r.getCell(2).font = { name: 'Consolas', size: 9.5, bold: true };
    r.getCell(3).font = { name: 'Segoe UI', size: 9.5 };
    r.getCell(4).font = { name: 'Segoe UI', size: 9, color: { argb: 'FFA1A1AA' } };
    [2, 3, 4].forEach((c) => (r.getCell(c).border = cellBorders));
    r.height = 19;
  });

  summarySheet.getColumn(2).width = 44;
  summarySheet.getColumn(3).width = 18;
  summarySheet.getColumn(4).width = 40;

  // ==========================================
  // SHEET 2: All Components & Resolved Licenses
  // ==========================================
  const compsSheet = workbook.addWorksheet('Component Inventory', {
    views: [{ showGridLines: true }],
  });

  const compHeaders = [
    'Component Name',
    'Version',
    'Resolved SPDX ID',
    'Official License Name',
    'Resolution Method',
    'Original License Text',
    'Original License URL',
    'Package URL (PURL)',
    'Status',
  ];

  const cHeaderRow = compsSheet.getRow(1);
  compHeaders.forEach((h, idx) => {
    const cell = cHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.fill = darkHeaderFill;
    cell.font = headerFont;
    cell.border = cellBorders;
  });
  cHeaderRow.height = 24;

  result.components.forEach((comp, idx) => {
    const row = compsSheet.getRow(idx + 2);
    row.getCell(1).value = comp.name;
    row.getCell(2).value = comp.version;
    row.getCell(3).value = comp.resolvedSpdxId || '—';
    row.getCell(4).value = comp.resolvedLicenseName || comp.resolvedSpdxId || '—';
    row.getCell(5).value = comp.method.replace('_', ' ').toUpperCase();
    row.getCell(6).value = comp.originalLicenseText;
    row.getCell(7).value = comp.originalLicenseUrl || '—';
    row.getCell(8).value = comp.purl || '—';
    row.getCell(9).value = comp.isResolved ? 'RESOLVED' : 'UNRESOLVED';

    // Fonts
    row.getCell(1).font = { name: 'Segoe UI', size: 9.5, bold: true };
    row.getCell(2).font = { name: 'Consolas', size: 9 };
    row.getCell(3).font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: comp.isResolved ? 'FF10B981' : 'FFF43F5E' } };
    row.getCell(4).font = { name: 'Segoe UI', size: 9 };
    row.getCell(5).font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FFA1A1AA' } };
    row.getCell(6).font = { name: 'Segoe UI', size: 9, color: { argb: 'FFA1A1AA' } };
    row.getCell(7).font = { name: 'Consolas', size: 8.5, color: { argb: 'FF38BDF8' } };
    row.getCell(8).font = { name: 'Consolas', size: 8.5, color: { argb: 'FF71717A' } };
    row.getCell(9).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: comp.isResolved ? 'FF10B981' : 'FFF43F5E' } };

    // Zebra striping
    if (idx % 2 === 1) {
      for (let c = 1; c <= 9; c++) {
        row.getCell(c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      }
    }

    for (let c = 1; c <= 9; c++) {
      row.getCell(c).border = cellBorders;
    }
    row.height = 20;
  });

  compsSheet.getColumn(1).width = 34;
  compsSheet.getColumn(2).width = 14;
  compsSheet.getColumn(3).width = 18;
  compsSheet.getColumn(4).width = 36;
  compsSheet.getColumn(5).width = 20;
  compsSheet.getColumn(6).width = 28;
  compsSheet.getColumn(7).width = 45;
  compsSheet.getColumn(8).width = 35;
  compsSheet.getColumn(9).width = 14;

  // ==========================================
  // SHEET 3: Unresolved Action Items
  // ==========================================
  const unresolvedComponents = result.components.filter((c) => !c.isResolved);
  if (unresolvedComponents.length > 0) {
    const unresSheet = workbook.addWorksheet('Unresolved Action Items', {
      views: [{ showGridLines: true }],
    });

    const unresHeaderRow = unresSheet.getRow(1);
    ['Component Name', 'Version', 'Declared License Text', 'License URL', 'Suggested Action'].forEach((h, idx) => {
      const cell = unresHeaderRow.getCell(idx + 1);
      cell.value = h;
      cell.fill = darkHeaderFill;
      cell.font = headerFont;
      cell.border = cellBorders;
    });
    unresHeaderRow.height = 24;

    unresolvedComponents.forEach((comp, idx) => {
      const row = unresSheet.getRow(idx + 2);
      row.getCell(1).value = comp.name;
      row.getCell(2).value = comp.version;
      row.getCell(3).value = comp.originalLicenseText;
      row.getCell(4).value = comp.originalLicenseUrl || '—';
      row.getCell(5).value = comp.originalLicenseUrl ? 'Map URL to SPDX in DevSecOps Suite' : 'Inspect package repository for license';

      row.getCell(1).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFF43F5E' } };
      row.getCell(2).font = { name: 'Consolas', size: 9 };
      row.getCell(3).font = { name: 'Segoe UI', size: 9 };
      row.getCell(4).font = { name: 'Consolas', size: 8.5, color: { argb: 'FF38BDF8' } };
      row.getCell(5).font = { name: 'Segoe UI', size: 9, color: { argb: 'FFA1A1AA' } };

      for (let c = 1; c <= 5; c++) {
        row.getCell(c).border = cellBorders;
      }
      row.height = 20;
    });

    unresSheet.getColumn(1).width = 34;
    unresSheet.getColumn(2).width = 14;
    unresSheet.getColumn(3).width = 32;
    unresSheet.getColumn(4).width = 45;
    unresSheet.getColumn(5).width = 40;
  }

  // Export buffer & trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `${filenamePrefix}-${new Date().toISOString().split('T')[0]}.xlsx`);
}
