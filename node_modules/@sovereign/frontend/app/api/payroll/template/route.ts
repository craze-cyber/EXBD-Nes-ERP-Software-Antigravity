import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { insforge } from '@/lib/insforge';

/**
 * Template columns match the actual Dabdoob spreadsheet (ksa_payable tab):
 *
 * INPUT columns (user fills these):
 *   A=SL.No (auto)  B=ID  C=Driver Name  D=Iqama Number  E=Business Unit
 *   F=Designation  G=Location  H=VENDOR  I=Basic Salary
 *   J=In app orders  K=Out app orders  L=Total orders  M=Delayed Order
 *   N=Ot amount  O=Incentive  P=Advance
 *   Q=Other Deduction  R=Signature  S=Salary Status  T=Bank Name  U=IBAN
 *
 * OUTPUT columns (system calculates these after upload):
 *   Order Based Salary, Deduction (delayed × rate), Total Salary, Total Payable Salary
 */
const HEADERS = [
  'SL.No',              //  1 = A
  'ID',                 //  2 = B
  'Driver Name',        //  3 = C
  'Iqama Number',       //  4 = D
  'Business Unit',      //  5 = E
  'Designation',        //  6 = F
  'Location',           //  7 = G
  'VENDOR',             //  8 = H
  'Basic Salary',       //  9 = I (per-order rate)
  'In app orders',      // 10 = J
  'Out app orders',     // 11 = K
  'Total orders',       // 12 = L
  'Delayed Order',      // 13 = M
  'Ot amount',          // 14 = N
  'Incentive',          // 15 = O
  'Advance',            // 16 = P
  'Other Deduction',    // 17 = Q
  'Signature',          // 18 = R
  'Salary Status',      // 19 = S
  'Bank Name',          // 20 = T
  'IBAN',               // 21 = U
];

const MANPOWER_HEADERS = [
  'Emp ID',
  'Employee Name',
  'Iqama No',
  'Location',
  'Designation',
  'Vendor',
  'Basic Salary',
  'Number of Duty (DAYS)',
  'Total Dayoff',
  'Total number of Absent',
  'Salary based on duty days',
  'Absent Amount',
  'Total overtime (HOURS)',
  'OT amount',
  'Total Salary',
  'Incentive',
  'Other Allowance',
  'Advance',
  'Deduction',
  'Total Payable Salary',
  'IBAN',
  'Signature'
];

function styleCell(cell: ExcelJS.Cell) {
  cell.font      = { bold: false, size: 10 };
  cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
  cell.border    = {
    top:    { style: 'thin' },
    bottom: { style: 'thin' },
    left:   { style: 'thin' },
    right:  { style: 'thin' },
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo   = searchParams.get('demo') === 'true';
    const clientId = searchParams.get('clientId');
    const isManpower = searchParams.get('type') === 'manpower';

    let clientName = 'DABDOOB LOGISTICS';
    if (clientId) {
      const { data } = await insforge.database
        .from('clients').select('legal_name').eq('id', clientId).single();
      if (data?.legal_name) clientName = data.legal_name.toUpperCase();
    }

    const workbook = new ExcelJS.Workbook();
    const sheet    = workbook.addWorksheet('Salary_Sheet');

    // Column widths matching the real spreadsheet
    const colWidths = [8, 16, 26, 18, 18, 14, 12, 12, 14, 14, 14, 14, 14, 14, 14, 14, 16, 14, 14, 16, 28];
    colWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    // ── Company header rows ──────────────────────────────────────────
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Row 1: Company name
    const cell_A1 = sheet.getCell('A1');
    cell_A1.value = 'YOUR SOLUTION EST. FOR CONTRACTING';
    cell_A1.font  = { bold: true, size: 14 };
    sheet.mergeCells('A1:U1');

    // Row 2: Title
    const cell_A2 = sheet.getCell('A2');
    cell_A2.value = `SALARY SHEET FOR THE MONTH OF ${currentMonth.toUpperCase()}`;
    cell_A2.font  = { bold: true, size: 12 };
    cell_A2.alignment = { horizontal: 'center' };
    sheet.mergeCells('A2:U2');

    // Row 3: Project name
    const cell_A3 = sheet.getCell('A3');
    cell_A3.value = `Project Name : ${clientName}`;
    cell_A3.font  = { bold: true, size: 12 };
    cell_A3.alignment = { horizontal: 'center' };
    sheet.mergeCells('A3:U3');

    // Row 4: Region (optional, left blank for multi-region upload)
    const cell_A4 = sheet.getCell('A4');
    cell_A4.value = 'KSA';
    cell_A4.font  = { bold: true, size: 11 };
    cell_A4.alignment = { horizontal: 'center' };
    sheet.mergeCells('A4:U4');

    // ── Header row 5 ─────────────────
    const headerRow = sheet.getRow(5);
    headerRow.height = 40;

    const activeHeaders = isManpower ? MANPOWER_HEADERS : HEADERS;

    activeHeaders.forEach((h, i) => {
      const colNum = i + 1;
      const cell   = headerRow.getCell(colNum);
      cell.value   = h;
      cell.font    = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
      cell.border  = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };  // Dark navy
    });

    // ── Driver data rows — starting at row 6 ──────────────────
    let drivers: any[] = [];
    if (isDemo) {
      drivers = [
        { region: 'Eastern', emp_id: 'nofoz 301', name_en: 'Ali Sultan',      iqama_no: '2293481339', business_unit: 'Dabdoob_Delivery', location: 'DMM', designation: 'Driver', vendor: '', basic_rate: 13, iban: '' },
        { region: 'Eastern', emp_id: 'nofoz 302', name_en: 'Momen',           iqama_no: '2441189095', business_unit: 'Dabdoob_Delivery', location: 'DMM', designation: 'Driver', vendor: '', basic_rate: 13, iban: '' },
        { region: 'Central', emp_id: '203',        name_en: 'MOHAMED ALI ERAKY', iqama_no: '2597538392', business_unit: '', location: 'RUH', designation: 'Driver', vendor: 'Out', basic_rate: 6, iban: '' },
        { region: 'Western', emp_id: 'Nfouz 3',   name_en: 'Fateh',           iqama_no: '', business_unit: '', location: 'JED', designation: 'Driver', vendor: '', basic_rate: 18, iban: '' },
        { region: 'Western', emp_id: 'Makkah M',  name_en: 'Nour Makkah',     iqama_no: '', business_unit: '', location: 'MAC', designation: 'Driver', vendor: '', basic_rate: 20, iban: '' },
      ];
    } else {
      const { data } = await insforge.database
        .from('workers')
        .select('emp_id, name_en, iqama_no, location, designation, vendor, basic_rate, region, iban, business_unit')
        .eq('status', 'active');
      if (data) drivers = data;
    }

    drivers.forEach((d, idx) => {
      const rowNum = idx + 6;
      const r      = sheet.getRow(rowNum);
      r.height     = 22;

      let vals: Record<number, any> = {};

      if (isManpower) {
        vals = {
          1: d.emp_id || '',
          2: d.name_en || '',
          3: d.iqama_no || '',
          4: d.location || '',
          5: d.designation || 'Driver',
          6: d.vendor || '',
          7: d.basic_rate || 0,
          8: 26,                 // Number of Duty
          9: 4,                  // Total Dayoff
          10: 0,                 // Absent
          11: 0,                 // Salary Duty
          12: 0,                 // Absent Amount
          13: 0,                 // OT Hours
          14: 0,                 // OT Amount
          15: 0,                 // Total Salary
          16: 0,                 // Incentive
          17: 0,                 // Other Allowance
          18: 0,                 // Advance
          19: 0,                 // Deduction
          20: 0,                 // Total Payable
          21: d.iban || '',      // IBAN
          22: ''                 // Signature
        };
      } else {
        vals = {
          1: idx + 1,                       // SL.No
          2: d.emp_id || '',                // ID
          3: d.name_en || '',               // Driver Name
          4: d.iqama_no || '',              // Iqama Number
          5: d.business_unit || '',         // Business Unit
          6: d.designation || 'Driver',     // Designation
          7: d.location || '',              // Location
          8: d.vendor || '',                // VENDOR
          9: d.basic_rate || 0,             // Basic Salary (rate)
          10: 0,                            // In app orders 
          11: 0,                            // Out app orders
          12: 0,                            // Total orders 
          13: 0,                            // Delayed Order 
          14: 0,                            // Ot amount 
          15: 0,                            // Incentive 
          16: 0,                            // Advance 
          17: 0,                            // Other Deduction 
          18: '',                           // Signature
          19: '',                           // Salary Status
          20: '',                           // Bank Name
          21: d.iban || '',                 // IBAN
        };
      }

      Object.entries(vals).forEach(([col, val]) => {
        const cell = r.getCell(Number(col));
        cell.value = val;
        styleCell(cell);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      });
    });

    sheet.views = [{ state: 'frozen', ySplit: 5 }];

    // ── Location rate reference (row after data) ──────────────────
    const rateRow = drivers.length + 7;
    const rateHeaderCell = sheet.getCell(`A${rateRow}`);
    rateHeaderCell.value = 'LOCATION RATES:';
    rateHeaderCell.font = { bold: true, size: 9, color: { argb: 'FF666666' } };
    
    const rates = [
      { loc: 'DMM', rate: '13 SAR/order' },
      { loc: 'RUH', rate: 'Per-iqama (6/10/1)' },
      { loc: 'JED', rate: '18 SAR/order' },
      { loc: 'MAC', rate: '20 SAR/order' },
    ];
    rates.forEach((r, i) => {
      const cell = sheet.getCell(`${String.fromCharCode(67 + i * 2)}${rateRow}`);
      cell.value = `${r.loc}: ${r.rate}`;
      cell.font = { size: 9, color: { argb: 'FF999999' } };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = isManpower ? "Dabdoob_Manpower_Payroll_Template.xlsx" : "Dabdoob_Logistic_Payroll_Template.xlsx";
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}