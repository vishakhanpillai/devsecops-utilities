import ExcelJS from 'exceljs';
import { DnsRecord } from '../types/subdomain.types';

export interface ExportExcelOptions {
  useDoubleClassHeader?: boolean;
}

/**
 * Builds an ExcelJS Workbook matching the exact formatting of the user's spreadsheet.
 *
 * Columns:
 * A: Subdomain
 * B: TTL
 * C: Class
 * D: Type (or Class)
 * E: IP
 * F: FQDN
 * G: Protocol
 * H: Active
 * I: Descriptor
 */
export async function generateExcelBuffer(
  rows: DnsRecord[],
  options: ExportExcelOptions = {}
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Subdomain MasterSheet';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Subdomain Master', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = [
    { header: 'Subdomain', key: 'subdomain', width: 24 },
    { header: 'TTL', key: 'ttl', width: 14 },
    { header: 'Class', key: 'class', width: 10 },
    { header: options.useDoubleClassHeader ? 'Class' : 'Type', key: 'type', width: 10 },
    { header: 'IP', key: 'ip', width: 18 },
    { header: 'FQDN', key: 'fqdn', width: 34 },
    { header: 'Protocol', key: 'protocol', width: 18 },
    { header: 'Active', key: 'active', width: 12 },
    { header: 'Descriptor', key: 'descriptor', width: 38 },
  ];

  // Header row styling (Black/Dark Charcoal background, White Bold text, Centered)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F1F1F' },
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF404040' } },
      bottom: { style: 'thin', color: { argb: 'FF404040' } },
      left: { style: 'thin', color: { argb: 'FF404040' } },
      right: { style: 'thin', color: { argb: 'FF404040' } },
    };
  });

  // Palette matching the user's Excel sheet
  const coralFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2DCDB' }, // Soft coral / peach
  };
  const coralFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 10,
    color: { argb: 'FF9C0006' }, // Red text
  };

  const activeGreenFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC6EFCE' }, // Soft green
  };
  const activeGreenFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 10,
    bold: true,
    color: { argb: 'FF006100' }, // Dark green
  };

  const inactiveRedFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC7CE' }, // Soft red
  };
  const inactiveRedFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 10,
    bold: true,
    color: { argb: 'FF9C0006' },
  };

  const cellBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE6D5D5' } },
    bottom: { style: 'thin', color: { argb: 'FFE6D5D5' } },
    left: { style: 'thin', color: { argb: 'FFE6D5D5' } },
    right: { style: 'thin', color: { argb: 'FFE6D5D5' } },
  };

  // Populate data rows
  rows.forEach((item) => {
    const row = worksheet.addRow({
      subdomain: item.subdomain || '',
      ttl: item.ttl || '3600 IN',
      class: item.class || 'IN',
      type: item.type || 'A',
      ip: item.ip || '',
      fqdn: item.fqdn || '',
      protocol: item.protocol || '',
      active: item.active || 'No',
      descriptor: item.descriptor || '',
    });

    row.height = 20;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = cellBorder;

      if (colNumber === 8) {
        // Active column
        const isActive = (item.active || '').toLowerCase() === 'yes';
        cell.fill = isActive ? activeGreenFill : inactiveRedFill;
        cell.font = isActive ? activeGreenFont : inactiveRedFont;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNumber === 9) {
        // Descriptor column
        cell.fill = coralFill;
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1A1A1A' } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else {
        // DNS data columns
        cell.fill = coralFill;
        cell.font = coralFont;
        const isLeftAlign = colNumber === 1 || colNumber === 6;
        cell.alignment = { vertical: 'middle', horizontal: isLeftAlign ? 'left' : 'center' };
      }
    });
  });

  // Enable AutoFilter
  if (rows.length > 0) {
    worksheet.autoFilter = {
      from: 'A1',
      to: 'I' + (rows.length + 1),
    };
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Builds a clean CSV string
 */
export function generateCsv(rows: DnsRecord[]): string {
  const headers = ['Subdomain', 'TTL', 'Class', 'Type', 'IP', 'FQDN', 'Protocol', 'Active', 'Descriptor'];
  const lines = [headers.join(',')];

  for (const r of rows) {
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    lines.push(
      [
        escapeCsv(r.subdomain),
        escapeCsv(r.ttl || '3600 IN'),
        escapeCsv(r.class || 'IN'),
        escapeCsv(r.type || 'A'),
        escapeCsv(r.ip),
        escapeCsv(r.fqdn),
        escapeCsv(r.protocol),
        escapeCsv(r.active),
        escapeCsv(r.descriptor),
      ].join(',')
    );
  }

  return lines.join('\r\n');
}
