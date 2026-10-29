import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PortResult } from '../../types/portScanner';

export async function exportPortScanToExcel(
  results: PortResult[],
  targets: string[],
  engineUsed: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DevSecOps Utilities Suite';
  workbook.created = new Date();

  const darkHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF18181B' }, // Zinc-900
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Segoe UI',
    size: 10,
    bold: true,
    color: { argb: 'FFF4F4F5' },
  };

  const cellBorders: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF27272A' } },
    bottom: { style: 'thin', color: { argb: 'FF27272A' } },
    left: { style: 'thin', color: { argb: 'FF27272A' } },
    right: { style: 'thin', color: { argb: 'FF27272A' } },
  };

  const sheet = workbook.addWorksheet('Port Scan Results', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  sheet.mergeCells('A1:H1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'Port & Service Reconnaissance Audit';
  titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFF4F4F5' } };
  titleCell.fill = darkHeaderFill;
  titleCell.alignment = { vertical: 'middle', indent: 1 };
  sheet.getRow(1).height = 36;

  // Metadata Block
  sheet.getCell('A3').value = 'Targets:';
  sheet.getCell('B3').value = targets.join(', ');
  sheet.getCell('A4').value = 'Scan Date:';
  sheet.getCell('B4').value = new Date().toLocaleString();
  sheet.getCell('A5').value = 'Engine:';
  sheet.getCell('B5').value = engineUsed === 'nmap' ? 'Nmap Service Scanner (-sV)' : 'Native TCP Sockets';

  const openCount = results.filter((r) => r.state === 'open').length;
  sheet.getCell('A6').value = 'Open Ports Found:';
  sheet.getCell('B6').value = openCount;

  ['A3', 'A4', 'A5', 'A6'].forEach((cell) => {
    sheet.getCell(cell).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFA1A1AA' } };
  });
  sheet.getCell('B6').font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF10B981' } };

  // Data Headers
  const headers = [
    'Target Host',
    'IP Address',
    'Port',
    'Protocol',
    'State',
    'Service',
    'Product / Banner',
    'Latency (ms)',
  ];

  const headerRow = sheet.getRow(8);
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.fill = darkHeaderFill;
    cell.font = headerFont;
    cell.border = cellBorders;
  });
  headerRow.height = 24;

  results.forEach((r, idx) => {
    const row = sheet.getRow(9 + idx);
    row.getCell(1).value = r.host;
    row.getCell(2).value = r.ip || r.host;
    row.getCell(3).value = r.port;
    row.getCell(4).value = r.protocol.toUpperCase();
    row.getCell(5).value = r.state.toUpperCase();
    row.getCell(6).value = r.service || 'unknown';
    row.getCell(7).value = r.banner || r.product || '—';
    row.getCell(8).value = r.latencyMs !== undefined ? r.latencyMs : '—';

    // Fonts
    row.getCell(1).font = { name: 'Segoe UI', size: 9.5, bold: true };
    row.getCell(2).font = { name: 'Consolas', size: 9, color: { argb: 'FF71717A' } };
    row.getCell(3).font = { name: 'Consolas', size: 10, bold: true };
    row.getCell(4).font = { name: 'Consolas', size: 9 };
    row.getCell(5).font = {
      name: 'Segoe UI',
      size: 9.5,
      bold: true,
      color: {
        argb: r.state === 'open' ? 'FF10B981' : r.state === 'filtered' ? 'FFF59E0B' : 'FF71717A',
      },
    };
    row.getCell(6).font = { name: 'Consolas', size: 9.5, color: { argb: 'FF38BDF8' } };
    row.getCell(7).font = { name: 'Segoe UI', size: 9, color: { argb: 'FFA1A1AA' } };
    row.getCell(8).font = { name: 'Consolas', size: 9 };

    if (idx % 2 === 1) {
      for (let c = 1; c <= 8; c++) {
        row.getCell(c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      }
    }

    for (let c = 1; c <= 8; c++) {
      row.getCell(c).border = cellBorders;
    }
    row.height = 20;
  });

  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 20;
  sheet.getColumn(3).width = 10;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 14;
  sheet.getColumn(6).width = 18;
  sheet.getColumn(7).width = 40;
  sheet.getColumn(8).width = 14;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `port-scan-${targets[0] || 'results'}-${new Date().toISOString().split('T')[0]}.xlsx`);
}
