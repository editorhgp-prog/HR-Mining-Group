/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { CompanySummary, EmployeeRaw } from '../types';

/**
 * Parses values to JavaScript Date objects for native Excel representation
 */
function parseToDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) return val;
    return null;
  }
  
  const s = String(val).trim();
  if (!s) return null;

  // If it matches YYYY-MM-DD
  const m1 = s.match(/^(\d{4})[./-](\d{2})[./-](\d{2})/);
  if (m1) {
    const y = parseInt(m1[1], 10);
    const m = parseInt(m1[2], 10) - 1;
    const d = parseInt(m1[3], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }

  // If it matches DD-MM-YYYY or DD/MM/YYYY
  const m2 = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m2) {
    const d = parseInt(m2[1], 10);
    const m = parseInt(m2[2], 10) - 1;
    const y = parseInt(m2[3], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }

  // If it is an Excel serial date number
  if (typeof val === 'number') {
    try {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) return date;
    } catch {
      // ignore
    }
  }

  // General fallback parsing
  const dParsed = new Date(s);
  if (!isNaN(dParsed.getTime())) {
    return dParsed;
  }

  return null;
}

/**
 * Writes value to cell converting to date type when possible
 */
export function writeDateCell(cell: ExcelJS.Cell, val: any) {
  const dateObj = parseToDate(val);
  if (dateObj) {
    cell.value = dateObj;
    cell.numFmt = 'yyyy-mm-dd';
  } else {
    cell.value = val;
  }
}

/**
 * Styles a cell with corporate font, alignment, thin borders, and optional fill.
 */
function styleCell(
  cell: ExcelJS.Cell,
  options: {
    bold?: boolean;
    size?: number;
    color?: string;
    bgColor?: string;
    align?: 'left' | 'center' | 'right';
    wrapText?: boolean;
    borderTop?: boolean;
    borderBottom?: boolean;
    borderLeft?: boolean;
    borderRight?: boolean;
  }
) {
  cell.font = {
    name: 'Segoe UI',
    size: options.size || 10,
    bold: !!options.bold,
    color: options.color ? { argb: options.color } : undefined,
  };

  cell.alignment = {
    vertical: 'middle',
    horizontal: options.align || 'left',
    wrapText: options.wrapText !== false,
  };

  if (options.bgColor) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: options.bgColor },
    };
  }

  const borderStyle: ExcelJS.Border = { style: 'thin', color: { argb: '94A3B8' } }; // Soft slate gray border
  
  cell.border = {
    top: options.borderTop !== false ? borderStyle : undefined,
    bottom: options.borderBottom !== false ? borderStyle : undefined,
    left: options.borderLeft !== false ? borderStyle : undefined,
    right: options.borderRight !== false ? borderStyle : undefined,
  };
}

/**
 * Generates an Excel file (Workbook) buffer for a single target company.
 */
export async function generateCompanyExcel(
  summary: CompanySummary,
  customMonth?: number,
  customYear?: number
): Promise<ArrayBuffer> {
  const dataset = summary.skrg.length > 0 ? summary.skrg : summary.lalu;
  const info = getMonthYearInfo(dataset);

  const finalMonthNum = customMonth !== undefined ? customMonth : info.monthNum;
  const finalYear = customYear !== undefined ? customYear : info.year;

  const monthsNamesTitleCase = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const finalMonthName = monthsNamesTitleCase[finalMonthNum - 1] || info.monthName;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem Automasi Laporan HR";
  workbook.created = new Date();

  // Color Palette Definitions
  const colorNavy = '1E293B';  // Slate-900 (Main Title Block)
  const colorSteel = '475569'; // Slate-600 (Table Headers)
  const colorLight = 'F8FAFC'; // Slate-50 (Stripes)
  const colorIceGreen = 'ECFDF5'; // Emerald-50 (Sum columns / headers)
  const colorIceRed = 'FFF1F2'; // Rose-50 (Sum Column output)
  const colorBlueHeader = 'E2E8F0'; // Table double-decker accent
  const fontWhite = 'FFFFFF';
  
  // -------------------------------------------------------------------------
  // SHEET 1: DASHBOARD & RESUME
  // -------------------------------------------------------------------------
  const sheetResume = workbook.addWorksheet('Resume Perubahan');
  sheetResume.views = [{ showGridLines: true }];

  // Outer App Banner Title Block
  sheetResume.mergeCells('B2:K3');
  const titleCell = sheetResume.getCell('B2');
  titleCell.value = `LAPORAN PERUBAHAN STATUS KARYAWAN – ${summary.companyName} (${summary.companyCode})`;
  styleCell(titleCell, { bold: true, size: 14, color: fontWhite, bgColor: colorNavy, align: 'center' });

  // Add sub title timestamps
  sheetResume.mergeCells('B4:K4');
  const subTitleCell = sheetResume.getCell('B4');
  subTitleCell.value = `Periode Mutasi HR Bulanan • ${finalMonthName} ${finalYear}`;
  styleCell(subTitleCell, { bold: true, size: 10, color: '1E293B', align: 'center', borderBottom: true });

  // Helper counts
  const newPermL = summary.newPermanent.filter(e => e.gender === 'L').length;
  const newPermP = summary.newPermanent.filter(e => e.gender === 'P').length;
  const newPermT = summary.newPermanent.length;

  const newContL = summary.newContract.filter(e => e.gender === 'L').length;
  const newContP = summary.newContract.filter(e => e.gender === 'P').length;
  const newContT = summary.newContract.length;

  const promoL = summary.promotions.filter(e => e.toRow.gender === 'L').length;
  const promoP = summary.promotions.filter(e => e.toRow.gender === 'P').length;
  const promoT = summary.promotions.length;

  const resignPermL = summary.resignPermanent.filter(e => e.gender === 'L').length;
  const resignPermP = summary.resignPermanent.filter(e => e.gender === 'P').length;
  const resignPermT = summary.resignPermanent.length;

  const resignContL = summary.resignContract.filter(e => e.gender === 'L').length;
  const resignContP = summary.resignContract.filter(e => e.gender === 'P').length;
  const resignContT = summary.resignContract.length;

  // Let's create beautiful Side-by-Side tables for Addition & Subtraction
  // TABLE A: PENAMBAHAN KARYAWAN
  sheetResume.mergeCells('B6:F6');
  const addHeader = sheetResume.getCell('B6');
  addHeader.value = '➕ PENAMBAHAN KARYAWAN (BULAN INI)';
  styleCell(addHeader, { bold: true, size: 11, color: fontWhite, bgColor: '059669', align: 'left' });

  const headersAdd = ['Kategori Penambahan', 'Laki-laki (L)', 'Perempuan (P)', 'Total', 'Keterangan'];
  headersAdd.forEach((h, i) => {
    const colIdx = 2 + i; // Start column B (2)
    const c = sheetResume.getCell(7, colIdx);
    c.value = h;
    styleCell(c, { bold: true, size: 10, color: fontWhite, bgColor: colorSteel, align: i === 0 ? 'left' : 'center' });
  });

  const rowDataAdd = [
    ['Karyawan Tetap Baru (PKWTT)', newPermL, newPermP, newPermT, 'Perekrutan permanen baru'],
    ['Karyawan Kontrak Baru (PKWT)', newContL, newContP, newContT, 'Kontrak kerja baru'],
    ['Promosi (PKWT ➔ PKWTT)', promoL, promoP, promoT, 'Alih status kontrak ke permanen'],
  ];

  rowDataAdd.forEach((row, rowIdx) => {
    const rNum = 8 + rowIdx;
    row.forEach((val, colIdx) => {
      const c = sheetResume.getCell(rNum, 2 + colIdx);
      if (typeof val === 'number') {
        c.value = val;
        styleCell(c, { align: 'center', bgColor: rowIdx % 2 === 1 ? colorLight : undefined });
      } else {
        c.value = val;
        styleCell(c, { align: colIdx === 0 ? 'left' : 'left', bgColor: rowIdx % 2 === 1 ? colorLight : undefined });
      }
    });
  });

  // Total additions row
  sheetResume.getCell('B11').value = 'Total Penambahan';
  styleCell(sheetResume.getCell('B11'), { bold: true, bgColor: colorIceGreen });
  sheetResume.getCell('C11').value = { formula: 'SUM(C8:C10)' };
  styleCell(sheetResume.getCell('C11'), { bold: true, align: 'center', bgColor: colorIceGreen });
  sheetResume.getCell('D11').value = { formula: 'SUM(D8:D10)' };
  styleCell(sheetResume.getCell('D11'), { bold: true, align: 'center', bgColor: colorIceGreen });
  sheetResume.getCell('E11').value = { formula: 'SUM(E8:E10)' };
  styleCell(sheetResume.getCell('E11'), { bold: true, align: 'center', bgColor: colorIceGreen });
  sheetResume.getCell('F11').value = 'Akumulasi Mutasi Masuk';
  styleCell(sheetResume.getCell('F11'), { size: 9, bgColor: colorIceGreen });

  // TABLE B: PENGURANGAN KARYAWAN
  sheetResume.mergeCells('H6:L6');
  const subHeader = sheetResume.getCell('H6');
  subHeader.value = '➖ PENGURANGAN KARYAWAN (KELUAR / RESIGN)';
  styleCell(subHeader, { bold: true, size: 11, color: fontWhite, bgColor: 'DC2626', align: 'left' });

  const headersSub = ['Kategori Pengurangan', 'Laki-laki (L)', 'Perempuan (P)', 'Total', 'Keterangan'];
  headersSub.forEach((h, i) => {
    const colIdx = 8 + i; // Start column H (8)
    const c = sheetResume.getCell(7, colIdx);
    c.value = h;
    styleCell(c, { bold: true, size: 10, color: fontWhite, bgColor: colorSteel, align: i === 0 ? 'left' : 'center' });
  });

  const rowDataSub = [
    ['Karyawan Tetap Keluar (PKWTT)', resignPermL, resignPermP, resignPermT, 'Mengundurkan diri / Pensiun'],
    ['Karyawan Kontrak Keluar (PKWT)', resignContL, resignContP, resignContT, 'Masa kontrak berakhir'],
    ['Lain-lain / Mutasi Keluar', 0, 0, 0, 'Diberhentikan / Mutasi Grup'],
  ];

  rowDataSub.forEach((row, rowIdx) => {
    const rNum = 8 + rowIdx;
    row.forEach((val, colIdx) => {
      const c = sheetResume.getCell(rNum, 8 + colIdx);
      if (typeof val === 'number') {
        c.value = val;
        styleCell(c, { align: 'center', bgColor: rowIdx % 2 === 1 ? colorLight : undefined });
      } else {
        c.value = val;
        styleCell(c, { align: colIdx === 0 ? 'left' : 'left', bgColor: rowIdx % 2 === 1 ? colorLight : undefined });
      }
    });
  });

  // Total subtractions row
  sheetResume.getCell('H11').value = 'Total Pengurangan';
  styleCell(sheetResume.getCell('H11'), { bold: true, bgColor: colorIceRed });
  sheetResume.getCell('I11').value = { formula: 'SUM(I8:I10)' };
  styleCell(sheetResume.getCell('I11'), { bold: true, align: 'center', bgColor: colorIceRed });
  sheetResume.getCell('J11').value = { formula: 'SUM(J8:J10)' };
  styleCell(sheetResume.getCell('J11'), { bold: true, align: 'center', bgColor: colorIceRed });
  sheetResume.getCell('K11').value = { formula: 'SUM(K8:K10)' };
  styleCell(sheetResume.getCell('K11'), { bold: true, align: 'center', bgColor: colorIceRed });
  sheetResume.getCell('L11').value = 'Akumulasi Mutasi Keluar';
  styleCell(sheetResume.getCell('L11'), { size: 9, bgColor: colorIceRed });


  // KPI Summary Blocks in Resume row 13-15
  sheetResume.mergeCells('B13:D15');
  const kpiLeft = sheetResume.getCell('B13');
  kpiLeft.value = `Karyawan Bulan Lalu\n\n🧔 L: ${summary.lalu.filter(e => e.gender === 'L').length}  •  👩 P: ${summary.lalu.filter(e => e.gender === 'P').length}\n🎁 Total: ${summary.lalu.length} ID`;
  styleCell(kpiLeft, { bold: true, size: 10, bgColor: 'F1F5F9', align: 'center' });

  sheetResume.mergeCells('F13:H15');
  const kpiMid = sheetResume.getCell('F13');
  kpiMid.value = `Mutasi Internal\n\n🔄 Mutasi Bagian: ${summary.mutations.length} Orang\n🎓 Alih Status: ${summary.promotions.length} Orang`;
  styleCell(kpiMid, { bold: true, size: 10, bgColor: 'EFF6FF', align: 'center' });

  sheetResume.mergeCells('J13:L15');
  const kpiRight = sheetResume.getCell('J13');
  kpiRight.value = `Karyawan Bulan Ini\n\n🧔 L: ${summary.skrg.filter(e => e.gender === 'L').length}  •  👩 P: ${summary.skrg.filter(e => e.gender === 'P').length}\n🔥 Total: ${summary.skrg.length} ID`;
  styleCell(kpiRight, { bold: true, size: 10, bgColor: 'ECFDF5', align: 'center' });

  // Column Dimensions for resume sheet
  sheetResume.getColumn('A').width = 4;
  sheetResume.getColumn('B').width = 30;
  sheetResume.getColumn('C').width = 15;
  sheetResume.getColumn('D').width = 15;
  sheetResume.getColumn('E').width = 15;
  sheetResume.getColumn('F').width = 32;
  sheetResume.getColumn('G').width = 4;
  sheetResume.getColumn('H').width = 30;
  sheetResume.getColumn('I').width = 15;
  sheetResume.getColumn('J').width = 15;
  sheetResume.getColumn('K').width = 15;
  sheetResume.getColumn('L').width = 32;


  // -------------------------------------------------------------------------
  // SHEET 2: REKAPITULASI DEPARTEMEN
  // -------------------------------------------------------------------------
  const sheetRekap = workbook.addWorksheet('Rekap Departemen');
  sheetRekap.views = [{ showGridLines: true }];

  sheetRekap.mergeCells('A1:O2');
  const titleRekap = sheetRekap.getCell('A1');
  titleRekap.value = `REKAPITULASI JUMLAH KARYAWAN PER DEPARTEMEN\n${summary.companyName} (${summary.companyCode})`;
  styleCell(titleRekap, { bold: true, size: 12, color: fontWhite, bgColor: colorNavy, align: 'center' });

  // Columns for Rekap Sheet double-decker
  // Row 4 and 5 contains headers
  const colMappings = [
    { label: 'NO', start: 'A', end: 'A' },
    { label: 'DEPARTEMEN / BAGIAN', start: 'B', end: 'B' },
    { label: 'KARYAWAN BULAN LALU', start: 'C', end: 'E' },
    { label: 'MASUK (PENAMBAHAN)', start: 'F', end: 'H' },
    { label: 'KELUAR (PENGURANGAN)', start: 'I', end: 'K' },
    { label: 'KARYAWAN BULAN INI', start: 'L', end: 'N' },
    { label: 'PERUBAHAN NETTO (NET)', start: 'O', end: 'O' }
  ];

  colMappings.forEach(mapping => {
    if (mapping.start !== mapping.end) {
      sheetRekap.mergeCells(`${mapping.start}4:${mapping.end}4`);
    } else {
      sheetRekap.mergeCells(`${mapping.start}4:${mapping.end}5`);
    }
    const c = sheetRekap.getCell(`${mapping.start}4`);
    c.value = mapping.label;
    styleCell(c, { bold: true, size: 9, color: fontWhite, bgColor: colorSteel, align: 'center' });
  });

  // Second level row 5 headers
  const subHeaders = [
    { cell: 'C5', text: 'L' }, { cell: 'D5', text: 'P' }, { cell: 'E5', text: 'Total' },
    { cell: 'F5', text: 'L' }, { cell: 'G5', text: 'P' }, { cell: 'H5', text: 'Total' },
    { cell: 'I5', text: 'L' }, { cell: 'J5', text: 'P' }, { cell: 'K5', text: 'Total' },
    { cell: 'L5', text: 'L' }, { cell: 'M5', text: 'P' }, { cell: 'N5', text: 'Total' }
  ];
  subHeaders.forEach(sub => {
    const c = sheetRekap.getCell(sub.cell);
    c.value = sub.text;
    styleCell(c, { bold: true, size: 9, color: '1E293B', bgColor: colorBlueHeader, align: 'center' });
  });

  // Calculate actual counts divided into departments
  const deptsSet = new Set<string>();
  summary.lalu.forEach(e => { if (e.department) deptsSet.add(e.department); });
  summary.skrg.forEach(e => { if (e.department) deptsSet.add(e.department); });
  
  const departmentList = Array.from(deptsSet).sort((a,b) => a.localeCompare(b));
  if (departmentList.length === 0) {
    departmentList.push('Umum');
  }

  let currentLine = 6;
  departmentList.forEach((dept, index) => {
    const idx = index + 1;

    // Filter lists
    const laluDept = summary.lalu.filter(e => e.department === dept);
    const skrgDept = summary.skrg.filter(e => e.department === dept);

    // New additions
    const newPermDept = summary.newPermanent.filter(e => e.department === dept);
    const newContDept = summary.newContract.filter(e => e.department === dept);
    const promoDept = summary.promotions.filter(e => e.toRow.department === dept);
    const totalMasukL = newPermDept.filter(e => e.gender === 'L').length + 
                       newContDept.filter(e => e.gender === 'L').length +
                       promoDept.filter(e => e.toRow.gender === 'L').length;
    const totalMasukP = newPermDept.filter(e => e.gender === 'P').length + 
                       newContDept.filter(e => e.gender === 'P').length +
                       promoDept.filter(e => e.toRow.gender === 'P').length;

    // Resigns
    const resignPermDept = summary.resignPermanent.filter(e => e.department === dept);
    const resignContDept = summary.resignContract.filter(e => e.department === dept);
    const totalKeluarL = resignPermDept.filter(e => e.gender === 'L').length +
                        resignContDept.filter(e => e.gender === 'L').length;
    const totalKeluarP = resignPermDept.filter(e => e.gender === 'P').length +
                        resignContDept.filter(e => e.gender === 'P').length;

    const r = sheetRekap.getRow(currentLine);
    
    // Set cell values
    r.getCell(1).value = idx;              // Column A
    r.getCell(2).value = dept;             // Column B
    
    // Last month (static counts based on data)
    r.getCell(3).value = laluDept.filter(e => e.gender === 'L').length; // L
    r.getCell(4).value = laluDept.filter(e => e.gender === 'P').length; // P
    r.getCell(5).value = { formula: `C${currentLine}+D${currentLine}` }; // Total Lalu

    // Plus/Additions (calculated from our diff)
    r.getCell(6).value = totalMasukL; // L
    r.getCell(7).value = totalMasukP; // P
    r.getCell(8).value = { formula: `F${currentLine}+G${currentLine}` }; // Total Masuk

    // Minus/Resigned
    r.getCell(9).value = totalKeluarL; // L
    r.getCell(10).value = totalKeluarP; // P
    r.getCell(11).value = { formula: `I${currentLine}+J${currentLine}` }; // Total Keluar

    // Current Month (static counts based on data)
    r.getCell(12).value = skrgDept.filter(e => e.gender === 'L').length; // L
    r.getCell(13).value = skrgDept.filter(e => e.gender === 'P').length; // P
    r.getCell(14).value = { formula: `L${currentLine}+M${currentLine}` }; // Total Skrg

    // Net Difference
    r.getCell(15).value = { formula: `N${currentLine}-E${currentLine}` }; // Net change formula

    // Styles for this row
    const isOdd = index % 2 === 1;
    const rowBg = isOdd ? colorLight : undefined;
    
    styleCell(r.getCell(1), { align: 'center', bgColor: rowBg });
    styleCell(r.getCell(2), { align: 'left', bold: true, bgColor: rowBg });
    styleCell(r.getCell(3), { align: 'center', bgColor: rowBg });
    styleCell(r.getCell(4), { align: 'center', bgColor: rowBg });
    styleCell(r.getCell(5), { align: 'center', bold: true, bgColor: 'F1F5F9' });
    styleCell(r.getCell(6), { align: 'center', bgColor: rowBg });
    styleCell(r.getCell(7), { align: 'center', bgColor: rowBg });
    styleCell(r.getCell(8), { align: 'center', bold: true, bgColor: 'F1F5F9' });
    styleCell(r.getCell(9), { align: 'center', bgColor: rowBg });
    styleCell(r.getCell(10), { align: 'center', bgColor: rowBg });
    styleCell(r.getCell(11), { align: 'center', bold: true, bgColor: 'F1F5F9' });
    styleCell(r.getCell(12), { align: 'center', bgColor: rowBg });
    styleCell(r.getCell(13), { align: 'center', bgColor: rowBg });
    styleCell(r.getCell(14), { align: 'center', bold: true, bgColor: colorIceGreen });
    styleCell(r.getCell(15), { align: 'center', bold: true, bgColor: 'FFF1F2' });

    currentLine++;
  });

  // SUM / TOTAL Row in Rekap Sheet
  const totalRowIndex = currentLine;
  const totRow = sheetRekap.getRow(totalRowIndex);
  totRow.getCell(1).value = '';
  totRow.getCell(2).value = 'TOTAL KARYAWAN';
  
  // Set sum formulas across departments
  totRow.getCell(3).value = { formula: `SUM(C6:C${totalRowIndex-1})` };
  totRow.getCell(4).value = { formula: `SUM(D6:D${totalRowIndex-1})` };
  totRow.getCell(5).value = { formula: `SUM(E6:E${totalRowIndex-1})` };
  totRow.getCell(6).value = { formula: `SUM(F6:F${totalRowIndex-1})` };
  totRow.getCell(7).value = { formula: `SUM(G6:G${totalRowIndex-1})` };
  totRow.getCell(8).value = { formula: `SUM(H6:H${totalRowIndex-1})` };
  totRow.getCell(9).value = { formula: `SUM(I6:I${totalRowIndex-1})` };
  totRow.getCell(10).value = { formula: `SUM(J6:J${totalRowIndex-1})` };
  totRow.getCell(11).value = { formula: `SUM(K6:K${totalRowIndex-1})` };
  totRow.getCell(12).value = { formula: `SUM(L6:L${totalRowIndex-1})` };
  totRow.getCell(13).value = { formula: `SUM(M6:M${totalRowIndex-1})` };
  totRow.getCell(14).value = { formula: `SUM(N6:N${totalRowIndex-1})` };
  totRow.getCell(15).value = { formula: `SUM(O6:O${totalRowIndex-1})` };

  // Total styling
  for (let c = 1; c <= 15; c++) {
    styleCell(totRow.getCell(c), {
      bold: true,
      size: 10,
      bgColor: 'CBD5E1', // Dark Gray Slate bg for totals
      align: c === 2 ? 'left' : 'center'
    });
  }

  // Setup Column Widths
  sheetRekap.getColumn('A').width = 6;
  sheetRekap.getColumn('B').width = 32;
  for (let c = 3; c <= 15; c++) {
    const colLetter = String.fromCharCode(64 + c);
    sheetRekap.getColumn(colLetter).width = 11;
  }
  sheetRekap.getColumn('E').width = 13;
  sheetRekap.getColumn('H').width = 13;
  sheetRekap.getColumn('K').width = 13;
  sheetRekap.getColumn('N').width = 14;
  sheetRekap.getColumn('O').width = 14;


  // -------------------------------------------------------------------------
  // SHEET 3: PLUS MIN PKWTT (PERMANEN)
  // -------------------------------------------------------------------------
  const sheetPlusMinPkwtt = workbook.addWorksheet('Plus Min PKWTT');
  sheetPlusMinPkwtt.views = [{ showGridLines: true }];

  // Sheet Title
  sheetPlusMinPkwtt.mergeCells('B2:K2');
  sheetPlusMinPkwtt.getCell('B2').value = `DAFTAR PENAMBAHAN & PENGURANGAN KARYAWAN TETAP (PKWTT) • ${summary.companyCode}`;
  styleCell(sheetPlusMinPkwtt.getCell('B2'), { bold: true, size: 12, color: fontWhite, bgColor: colorNavy, align: 'center' });

  let rIdx = 4;

  // TABLE 3.A: PENAMBAHAN PKWTT
  sheetPlusMinPkwtt.mergeCells(`B${rIdx}:K${rIdx}`);
  const labelAddPkwtt = sheetPlusMinPkwtt.getCell(`B${rIdx}`);
  labelAddPkwtt.value = '🟢 A. DAFTAR PENAMBAHAN KARYAWAN TETAP (NEW HIRE & PROMOSI)';
  styleCell(labelAddPkwtt, { bold: true, size: 10, color: '065F46', bgColor: colorIceGreen });
  
  rIdx++;
  const colNamesDetail = ['No', 'NIK / ID', 'Nama Lengkap', 'Departemen', 'Jabatan', 'Gender', 'Tanggal Masuk', 'Pendidikan', 'Tempat Lahir', 'Tanggal Lahir', 'Keterangan'];
  colNamesDetail.forEach((h, i) => {
    const c = sheetPlusMinPkwtt.getCell(rIdx, 2 + i);
    c.value = h;
    styleCell(c, { bold: true, size: 9, color: fontWhite, bgColor: colorSteel, align: 'center' });
  });

  rIdx++;
  const combinedAddPkwtt: { emp: EmployeeRaw; note: string }[] = [];
  summary.newPermanent.forEach(e => combinedAddPkwtt.push({ emp: e, note: 'Karyawan Baru Tetap (PKWTT)' }));
  summary.promotions.forEach(p => combinedAddPkwtt.push({ emp: p.toRow, note: p.reason }));

  if (combinedAddPkwtt.length === 0) {
    sheetPlusMinPkwtt.mergeCells(`B${rIdx}:L${rIdx}`);
    sheetPlusMinPkwtt.getCell(`B${rIdx}`).value = 'TIDAK ADA DATA PENAMBAHAN KARYAWAN TETAP DI PERIODE INI.';
    styleCell(sheetPlusMinPkwtt.getCell(`B${rIdx}`), { align: 'center', size: 9 });
    rIdx++;
  } else {
    combinedAddPkwtt.forEach((item, index) => {
      const e = item.emp;
      sheetPlusMinPkwtt.getCell(rIdx, 2).value = index + 1; // NO
      sheetPlusMinPkwtt.getCell(rIdx, 3).value = e.id;     // NIK
      sheetPlusMinPkwtt.getCell(rIdx, 4).value = e.name;   // Full Name
      sheetPlusMinPkwtt.getCell(rIdx, 5).value = e.department; // Dept
      sheetPlusMinPkwtt.getCell(rIdx, 6).value = e.designation; // Position
      sheetPlusMinPkwtt.getCell(rIdx, 7).value = e.gender;     // Gender
      writeDateCell(sheetPlusMinPkwtt.getCell(rIdx, 8), e.dateOfJoining); // DOH
      sheetPlusMinPkwtt.getCell(rIdx, 9).value = e.education;   // Education
      sheetPlusMinPkwtt.getCell(rIdx, 10).value = e.placeOfBirth; // Tempat Lahir
      writeDateCell(sheetPlusMinPkwtt.getCell(rIdx, 11), e.dateOfBirth);  // Tgl Lahir
      sheetPlusMinPkwtt.getCell(rIdx, 12).value = item.note;      // Note
      
      const rowBg = index % 2 === 1 ? colorLight : undefined;
      for (let c = 0; c < 11; c++) {
        styleCell(sheetPlusMinPkwtt.getCell(rIdx, 2 + c), {
          align: [0, 1, 5, 6, 7].includes(c) ? 'center' : 'left',
          bgColor: rowBg,
          size: 9
        });
      }
      rIdx++;
    });
  }

  rIdx += 2;

  // TABLE 3.B: PENGURANGAN PKWTT
  sheetPlusMinPkwtt.mergeCells(`B${rIdx}:K${rIdx}`);
  const labelSubPkwtt = sheetPlusMinPkwtt.getCell(`B${rIdx}`);
  labelSubPkwtt.value = '🔴 B. DAFTAR PENGURANGAN KARYAWAN TETAP (RESIGN / KELUAR)';
  styleCell(labelSubPkwtt, { bold: true, size: 10, color: '991B1B', bgColor: colorIceRed });

  rIdx++;
  colNamesDetail.forEach((h, i) => {
    const c = sheetPlusMinPkwtt.getCell(rIdx, 2 + i);
    c.value = h;
    styleCell(c, { bold: true, size: 9, color: fontWhite, bgColor: colorSteel, align: 'center' });
  });

  rIdx++;
  if (summary.resignPermanent.length === 0) {
    sheetPlusMinPkwtt.mergeCells(`B${rIdx}:L${rIdx}`);
    sheetPlusMinPkwtt.getCell(`B${rIdx}`).value = 'TIDAK ADA DATA PENGURANGAN KARYAWAN TETAP DI PERIODE INI.';
    styleCell(sheetPlusMinPkwtt.getCell(`B${rIdx}`), { align: 'center', size: 9 });
    rIdx++;
  } else {
    summary.resignPermanent.forEach((e, index) => {
      sheetPlusMinPkwtt.getCell(rIdx, 2).value = index + 1; // NO
      sheetPlusMinPkwtt.getCell(rIdx, 3).value = e.id;     // NIK
      sheetPlusMinPkwtt.getCell(rIdx, 4).value = e.name;   // Full Name
      sheetPlusMinPkwtt.getCell(rIdx, 5).value = e.department; // Dept
      sheetPlusMinPkwtt.getCell(rIdx, 6).value = e.designation; // Position
      sheetPlusMinPkwtt.getCell(rIdx, 7).value = e.gender;     // Gender
      writeDateCell(sheetPlusMinPkwtt.getCell(rIdx, 8), e.dateOfJoining); // DOH
      sheetPlusMinPkwtt.getCell(rIdx, 9).value = e.education;   // Education
      sheetPlusMinPkwtt.getCell(rIdx, 10).value = e.placeOfBirth; // Tempat Lahir
      writeDateCell(sheetPlusMinPkwtt.getCell(rIdx, 11), e.dateOfBirth);  // Tgl Lahir
      sheetPlusMinPkwtt.getCell(rIdx, 12).value = 'Mengundurkan Diri (Resigned)'; // Note
      
      const rowBg = index % 2 === 1 ? colorLight : undefined;
      for (let c = 0; c < 11; c++) {
        styleCell(sheetPlusMinPkwtt.getCell(rIdx, 2 + c), {
          align: [0, 1, 5, 6, 7].includes(c) ? 'center' : 'left',
          bgColor: rowBg,
          size: 9
        });
      }
      rIdx++;
    });
  }

  // Adjust column sizes of PLUS MIN PKWTT
  sheetPlusMinPkwtt.getColumn('A').width = 4;
  sheetPlusMinPkwtt.getColumn('B').width = 5;
  sheetPlusMinPkwtt.getColumn('C').width = 14;
  sheetPlusMinPkwtt.getColumn('D').width = 25;
  sheetPlusMinPkwtt.getColumn('E').width = 23;
  sheetPlusMinPkwtt.getColumn('F').width = 23;
  sheetPlusMinPkwtt.getColumn('G').width = 8;
  sheetPlusMinPkwtt.getColumn('H').width = 15;
  sheetPlusMinPkwtt.getColumn('I').width = 12;
  sheetPlusMinPkwtt.getColumn('J').width = 15;
  sheetPlusMinPkwtt.getColumn('K').width = 15;
  sheetPlusMinPkwtt.getColumn('L').width = 30;


  // -------------------------------------------------------------------------
  // SHEET 4: PLUS MIN PKWT (KONTRAK)
  // -------------------------------------------------------------------------
  const sheetPlusMinPkwt = workbook.addWorksheet('Plus Min PKWT');
  sheetPlusMinPkwt.views = [{ showGridLines: true }];

  // Sheet Title
  sheetPlusMinPkwt.mergeCells('B2:K2');
  sheetPlusMinPkwt.getCell('B2').value = `DAFTAR PENAMBAHAN & PENGURANGAN KARYAWAN KONTRAK (PKWT) • ${summary.companyCode}`;
  styleCell(sheetPlusMinPkwt.getCell('B2'), { bold: true, size: 12, color: fontWhite, bgColor: colorNavy, align: 'center' });

  let rIdxC = 4;

  // TABLE 4.A: PENAMBAHAN PKWT
  sheetPlusMinPkwt.mergeCells(`B${rIdxC}:K${rIdxC}`);
  const labelAddPkwt = sheetPlusMinPkwt.getCell(`B${rIdxC}`);
  labelAddPkwt.value = '🟢 A. DAFTAR PENAMBAHAN KARYAWAN KONTRAK (PKWT)';
  styleCell(labelAddPkwt, { bold: true, size: 10, color: '065F46', bgColor: colorIceGreen });
  
  rIdxC++;
  colNamesDetail.forEach((h, i) => {
    const c = sheetPlusMinPkwt.getCell(rIdxC, 2 + i);
    c.value = h;
    styleCell(c, { bold: true, size: 9, color: fontWhite, bgColor: colorSteel, align: 'center' });
  });

  rIdxC++;
  if (summary.newContract.length === 0) {
    sheetPlusMinPkwt.mergeCells(`B${rIdxC}:L${rIdxC}`);
    sheetPlusMinPkwt.getCell(`B${rIdxC}`).value = 'TIDAK ADA DATA PENAMBAHAN KARYAWAN KONTRAK DI PERIODE INI.';
    styleCell(sheetPlusMinPkwt.getCell(`B${rIdxC}`), { align: 'center', size: 9 });
    rIdxC++;
  } else {
    summary.newContract.forEach((e, index) => {
      sheetPlusMinPkwt.getCell(rIdxC, 2).value = index + 1; // NO
      sheetPlusMinPkwt.getCell(rIdxC, 3).value = e.id;     // NIK
      sheetPlusMinPkwt.getCell(rIdxC, 4).value = e.name;   // Full Name
      sheetPlusMinPkwt.getCell(rIdxC, 5).value = e.department; // Dept
      sheetPlusMinPkwt.getCell(rIdxC, 6).value = e.designation; // Position
      sheetPlusMinPkwt.getCell(rIdxC, 7).value = e.gender;     // Gender
      writeDateCell(sheetPlusMinPkwt.getCell(rIdxC, 8), e.dateOfJoining); // DOH
      sheetPlusMinPkwt.getCell(rIdxC, 9).value = e.education;   // Education
      sheetPlusMinPkwt.getCell(rIdxC, 10).value = e.placeOfBirth; // Tempat Lahir
      writeDateCell(sheetPlusMinPkwt.getCell(rIdxC, 11), e.dateOfBirth);  // Tgl Lahir
      sheetPlusMinPkwt.getCell(rIdxC, 12).value = 'Karyawan Kontrak Baru (PKWT)'; // Note
      
      const rowBg = index % 2 === 1 ? colorLight : undefined;
      for (let c = 0; c < 11; c++) {
        styleCell(sheetPlusMinPkwt.getCell(rIdxC, 2 + c), {
          align: [0, 1, 5, 6, 7].includes(c) ? 'center' : 'left',
          bgColor: rowBg,
          size: 9
        });
      }
      rIdxC++;
    });
  }

  rIdxC += 2;

  // TABLE 4.B: PENGURANGAN PKWT (KONTRAK BERAKHIR)
  sheetPlusMinPkwt.mergeCells(`B${rIdxC}:K${rIdxC}`);
  const labelSubPkwt = sheetPlusMinPkwt.getCell(`B${rIdxC}`);
  labelSubPkwt.value = '🔴 B. DAFTAR PENGURANGAN KARYAWAN KONTRAK (PKWT)';
  styleCell(labelSubPkwt, { bold: true, size: 10, color: '991B1B', bgColor: colorIceRed });

  rIdxC++;
  colNamesDetail.forEach((h, i) => {
    const c = sheetPlusMinPkwt.getCell(rIdxC, 2 + i);
    c.value = h;
    styleCell(c, { bold: true, size: 9, color: fontWhite, bgColor: colorSteel, align: 'center' });
  });

  rIdxC++;
  if (summary.resignContract.length === 0) {
    sheetPlusMinPkwt.mergeCells(`B${rIdxC}:L${rIdxC}`);
    sheetPlusMinPkwt.getCell(`B${rIdxC}`).value = 'TIDAK ADA DATA PENGURANGAN KARYAWAN KONTRAK DI PERIODE INI.';
    styleCell(sheetPlusMinPkwt.getCell(`B${rIdxC}`), { align: 'center', size: 9 });
    rIdxC++;
  } else {
    summary.resignContract.forEach((e, index) => {
      sheetPlusMinPkwt.getCell(rIdxC, 2).value = index + 1; // NO
      sheetPlusMinPkwt.getCell(rIdxC, 3).value = e.id;     // NIK
      sheetPlusMinPkwt.getCell(rIdxC, 4).value = e.name;   // Full Name
      sheetPlusMinPkwt.getCell(rIdxC, 5).value = e.department; // Dept
      sheetPlusMinPkwt.getCell(rIdxC, 6).value = e.designation; // Position
      sheetPlusMinPkwt.getCell(rIdxC, 7).value = e.gender;     // Gender
      writeDateCell(sheetPlusMinPkwt.getCell(rIdxC, 8), e.dateOfJoining); // DOH
      sheetPlusMinPkwt.getCell(rIdxC, 9).value = e.education;   // Education
      sheetPlusMinPkwt.getCell(rIdxC, 10).value = e.placeOfBirth; // Tempat Lahir
      writeDateCell(sheetPlusMinPkwt.getCell(rIdxC, 11), e.dateOfBirth);  // Tgl Lahir
      sheetPlusMinPkwt.getCell(rIdxC, 12).value = 'Masa Kontrak Berakhir / Resign'; // Note
      
      const rowBg = index % 2 === 1 ? colorLight : undefined;
      for (let c = 0; c < 11; c++) {
        styleCell(sheetPlusMinPkwt.getCell(rIdxC, 2 + c), {
          align: [0, 1, 5, 6, 7].includes(c) ? 'center' : 'left',
          bgColor: rowBg,
          size: 9
        });
      }
      rIdxC++;
    });
  }

  // Adjust column sizes of PLUS MIN PKWT
  sheetPlusMinPkwt.getColumn('A').width = 4;
  sheetPlusMinPkwt.getColumn('B').width = 5;
  sheetPlusMinPkwt.getColumn('C').width = 14;
  sheetPlusMinPkwt.getColumn('D').width = 25;
  sheetPlusMinPkwt.getColumn('E').width = 23;
  sheetPlusMinPkwt.getColumn('F').width = 23;
  sheetPlusMinPkwt.getColumn('G').width = 8;
  sheetPlusMinPkwt.getColumn('H').width = 15;
  sheetPlusMinPkwt.getColumn('I').width = 12;
  sheetPlusMinPkwt.getColumn('J').width = 15;
  sheetPlusMinPkwt.getColumn('K').width = 15;
  sheetPlusMinPkwt.getColumn('L').width = 30;


  // -------------------------------------------------------------------------
  // SHEET 5: KARYAWAN PERMANENT (PKWTT) & SHEET 6: KARYAWAN KONTRAK (PKWT)
  // -------------------------------------------------------------------------
  const monthYearParsed = `${finalMonthName.toUpperCase()} ${finalYear}`;
  
  const permanentList = summary.skrg.filter(e => e.employeeType === 'PKWTT');
  const contractList = summary.skrg.filter(e => e.employeeType === 'PKWT');

  await addDetailedEmployeeSheet(
    workbook,
    'Karyawan Permanent (PKWTT)',
    'DAFTAR NAMA KARYAWAN PERMANENT',
    summary.companyName,
    monthYearParsed,
    permanentList,
    summary,
    { colorNavy, colorSteel, colorLight, fontWhite }
  );

  await addDetailedEmployeeSheet(
    workbook,
    'Karyawan Kontrak (PKWT)',
    'DAFTAR NAMA KARYAWAN KONTRAK',
    summary.companyName,
    monthYearParsed,
    contractList,
    summary,
    { colorNavy, colorSteel, colorLight, fontWhite }
  );

  // Let's build the array buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/**
 * Intelligent helper to scan the current Month & Year from uploaded datasets.
 */
function guessMonthYear(employees: EmployeeRaw[]): string {
  for (const emp of employees) {
    const dateStr = emp.dateOfJoining || emp.dateOfBirth;
    if (dateStr && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) {
        const year = parts[0];
        const monthNum = parseInt(parts[1], 10);
        const months = [
          'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
          'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
        ];
        if (monthNum >= 1 && monthNum <= 12) {
          return `${months[monthNum - 1]} ${year}`;
        }
      }
    } else if (dateStr && dateStr.includes('/')) {
      const parts = dateStr.split('/');
      // e.g. D/M/YYYY or YYYY/M/D
      if (parts[2] && parts[2].length === 4) {
        const year = parts[2];
        const monthNum = parseInt(parts[1], 10);
        const months = [
          'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
          'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
        ];
        if (monthNum >= 1 && monthNum <= 12) {
          return `${months[monthNum - 1]} ${year}`;
        }
      }
    }
  }

  const now = new Date();
  const monthsNames = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];
  return `${monthsNames[now.getMonth()]} ${now.getFullYear()}`;
}

/**
 * Dynamically exports employee worksheets matching the user's provided target layout structure.
 */
async function addDetailedEmployeeSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  titleRow2: string,
  companyName: string,
  monthYearStr: string,
  employees: EmployeeRaw[],
  summary: CompanySummary,
  options: {
    colorNavy: string;
    colorSteel: string;
    colorLight: string;
    fontWhite: string;
  }
) {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.views = [{ showGridLines: true }];

  // Column A spacing and title headers (Row 1-3)
  sheet.getCell('A1').value = companyName.toUpperCase();
  sheet.getCell('A1').font = { name: 'Segoe UI', size: 12, bold: true };

  sheet.getCell('A2').value = titleRow2.toUpperCase();
  sheet.getCell('A2').font = { name: 'Segoe UI', size: 11, bold: true };

  sheet.getCell('A3').value = monthYearStr.toUpperCase();
  sheet.getCell('A3').font = { name: 'Segoe UI', size: 10, bold: true };

  // Row 5 Column Headers Row
  const headers = [
    'No',
    'Company',
    'Company Code',
    'Age',
    'Length of Service',
    'Employee Id',
    'Full Name',
    'Date Of Joining',
    'Employee Type',
    'Employee Category',
    'Job Level',
    'Current Designation',
    'Current Department',
    'Grade',
    'Education',
    'Place Of Birth',
    'Date Of Birth',
    'Gender',
    'LOKAL/NON LOKAL'
  ];

  headers.forEach((h, i) => {
    const cell = sheet.getCell(5, 1 + i);
    cell.value = h;
    styleCell(cell, {
      bold: true,
      size: 10,
      color: options.fontWhite,
      bgColor: options.colorNavy,
      align: 'center'
    });
  });

  // Populate data rows (Row 6+)
  let currentRow = 6;
  employees.forEach((e, idx) => {
    const raw = e.originalRow || {};

    const getVal = (possibleNames: string[]): any => {
      const keys = Object.keys(raw);
      const normPossibles = possibleNames.map(p => p.toLowerCase().replace(/[^a-z0-9]/g, ''));
      for (const k of keys) {
        const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normPossibles.includes(normK)) {
          return raw[k];
        }
      }
      for (const k of keys) {
        const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const p of normPossibles) {
          if (normK.includes(p) || p.includes(normK)) {
            return raw[k];
          }
        }
      }
      return '';
    };

    const dofVal = getVal(['dateofjoining', 'joindate', 'tglmasuk', 'tanggalmasuk', 'doh', 'hiredate']) || e.dateOfJoining;
    const dobVal = getVal(['dateofbirth', 'birthdate', 'tanggallahir', 'dob']) || e.dateOfBirth;

    let finalGender = getVal(['gender', 'jeniskelamin', 'sex', 'jk']);
    if (finalGender) {
      const valLower = String(finalGender).toLowerCase();
      if (valLower.startsWith('l') || valLower === 'm' || valLower.includes('laki') || valLower.includes('pria')) {
        finalGender = 'Male';
      } else if (valLower.startsWith('p') || valLower === 'f' || valLower.includes('wanita') || valLower.includes('perempuan') || valLower.includes('female')) {
        finalGender = 'Female';
      }
    } else {
      finalGender = e.gender === 'L' ? 'Male' : e.gender === 'P' ? 'Female' : 'Male';
    }

    // Assigning to specific columns index
    sheet.getCell(currentRow, 1).value = idx + 1; // No
    sheet.getCell(currentRow, 2).value = summary.companyCode; // Company (e.g. PTK)
    sheet.getCell(currentRow, 3).value = getVal(['companycode', 'company_code', 'company code', 'workarea', 'site']) || e.companyCode || summary.companyCode; // Company Code (e.g., HO GOLD)
    sheet.getCell(currentRow, 4).value = getVal(['age', 'umur', 'usia']) || ''; // Age
    sheet.getCell(currentRow, 5).value = getVal(['lengthofservice', 'service', 'masakerja', 'los']) || ''; // Length of Service
    sheet.getCell(currentRow, 6).value = e.id; // Employee Id
    sheet.getCell(currentRow, 7).value = e.name; // Full Name
    writeDateCell(sheet.getCell(currentRow, 8), dofVal); // Date of Joining
    sheet.getCell(currentRow, 9).value = getVal(['employeetype', 'employmentstatus', 'status', 'statuskaryawan', 'statuskerja'])?.toUpperCase() || e.employeeType; // Employee Type
    sheet.getCell(currentRow, 10).value = getVal(['employeecategory', 'category', 'kategori']) || ''; // Employee Category
    sheet.getCell(currentRow, 11).value = getVal(['joblevel', 'level', 'job_level']) || ''; // Job Level
    sheet.getCell(currentRow, 12).value = e.designation; // Current Designation
    sheet.getCell(currentRow, 13).value = e.department; // Current Department
    sheet.getCell(currentRow, 14).value = getVal(['grade', 'golongan']) || ''; // Grade
    sheet.getCell(currentRow, 15).value = e.education; // Education
    sheet.getCell(currentRow, 16).value = e.placeOfBirth; // Place of Birth
    writeDateCell(sheet.getCell(currentRow, 17), dobVal); // Date of Birth
    sheet.getCell(currentRow, 18).value = finalGender; // Gender
    sheet.getCell(currentRow, 19).value = getVal(['lokalnonlokal', 'lokal', 'local', 'perekrutan']) || 'Non Lokal'; // LOKAL/NON LOKAL

    const rowBg = idx % 2 === 1 ? options.colorLight : undefined;
    for (let col = 1; col <= 19; col++) {
      styleCell(sheet.getCell(currentRow, col), {
        align: [1, 2, 3, 4, 5, 6, 8, 9, 14, 15, 17, 18, 19].includes(col) ? 'center' : 'left',
        bgColor: rowBg,
        size: 9
      });
    }
    currentRow++;
  });

  const widths = [6, 12, 16, 8, 18, 14, 28, 16, 16, 18, 15, 26, 32, 8, 12, 16, 15, 12, 16];
  widths.forEach((w, colIdx) => {
    const letter = String.fromCharCode(65 + colIdx);
    sheet.getColumn(letter).width = w;
  });
}

export interface MonthYearInfo {
  monthNum: number;
  monthName: string;
  year: number;
}

/**
 * Extract Month number, Month Name (Title Case) and Year from employee dataset.
 */
export function getMonthYearInfo(employees: EmployeeRaw[]): MonthYearInfo {
  const monthsNamesTitleCase = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  for (const emp of employees) {
    const dateStr = emp.dateOfJoining || emp.dateOfBirth;
    if (dateStr) {
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts[0].length === 4) { // YYYY-MM-DD
          const year = parseInt(parts[0], 10);
          const monthNum = parseInt(parts[1], 10);
          if (monthNum >= 1 && monthNum <= 12) {
            return {
              monthNum,
              monthName: monthsNamesTitleCase[monthNum - 1],
              year
            };
          }
        } else if (parts[2] && parts[2].length === 4) { // DD-MM-YYYY
          const year = parseInt(parts[2], 10);
          const monthNum = parseInt(parts[1], 10);
          if (monthNum >= 1 && monthNum <= 12) {
            return {
              monthNum,
              monthName: monthsNamesTitleCase[monthNum - 1],
              year
            };
          }
        }
      } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts[2] && parts[2].length === 4) { // DD/MM/YYYY or MM/DD/YYYY
          const year = parseInt(parts[2], 10);
          const monthNum = parseInt(parts[1], 10);
          if (monthNum >= 1 && monthNum <= 12) {
            return {
              monthNum,
              monthName: monthsNamesTitleCase[monthNum - 1],
              year
            };
          }
        }
        if (parts[0] && parts[0].length === 4) { // YYYY/MM/DD
          const year = parseInt(parts[0], 10);
          const monthNum = parseInt(parts[1], 10);
          if (monthNum >= 1 && monthNum <= 12) {
            return {
              monthNum,
              monthName: monthsNamesTitleCase[monthNum - 1],
              year
            };
          }
        }
      }
    }
  }

  // Fallback to current date
  const now = new Date();
  const mIndex = now.getMonth();
  return {
    monthNum: mIndex + 1,
    monthName: monthsNamesTitleCase[mIndex],
    year: now.getFullYear()
  };
}

/**
 * Returns Category ("Coal" or "Gold") based on company code in target list.
 */
export function getCompanyCategory(code: string): 'Coal' | 'Gold' {
  const coalCompanies = ['IC', 'BLP', 'BBE', 'KMIA', 'IMA', 'UAI'];
  return coalCompanies.includes(code.toUpperCase()) ? 'Coal' : 'Gold';
}

/**
 * Format report filename: e.g. "4. Coal - BBE Report April 2026.xlsx"
 */
export function getFormattedReportFileName(
  code: string,
  summary: CompanySummary,
  customMonth?: number,
  customYear?: number
): string {
  const dataset = summary.skrg.length > 0 ? summary.skrg : summary.lalu;
  const info = getMonthYearInfo(dataset);

  const finalMonthNum = customMonth !== undefined ? customMonth : info.monthNum;
  const finalYear = customYear !== undefined ? customYear : info.year;

  const monthsNamesTitleCase = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const finalMonthName = monthsNamesTitleCase[finalMonthNum - 1] || info.monthName;

  const category = getCompanyCategory(code);
  return `${finalMonthNum}. ${category} - ${code} Report ${finalMonthName} ${finalYear}.xlsx`;
}

/**
 * Builds a ZIP file containing the generated Excel files for each of the target corporate entities.
 * Prompts download directly or returns the zip blob.
 */
export async function buildZipOfAllReports(
  summaries: Record<string, CompanySummary>,
  activeTargetCodes: string[],
  customMonth?: number,
  customYear?: number
): Promise<Blob> {
  const zip = new JSZip();

  for (const code of activeTargetCodes) {
    const summary = summaries[code];
    // If the company has no employees in both months, we can optionally skip or generate an empty clean layout.
    // Let's generate it anyway so the user receives a report for all companies, showing 0 active where empty!
    // This maintains completeness.
    const buffer = await generateCompanyExcel(summary, customMonth, customYear);
    
    // Formatting filename matching exactly target specification
    const filename = getFormattedReportFileName(code, summary, customMonth, customYear);
    zip.file(filename, buffer);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return zipBlob;
}
