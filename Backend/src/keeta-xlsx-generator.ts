import * as XLSX from 'xlsx';
import { KeetaSalaryRow } from './keeta-salary-engine';

// ═══════════════════════════════════════════════════
// KEETA SALARY SHEET XLSX GENERATOR
// Produces the final Riyadh-format salary sheet
// ═══════════════════════════════════════════════════

/**
 * Generates the complete Keeta salary workbook matching the original format:
 * - "Riyadh" sheet (main salary sheet with header, data, grand total, signatures)
 * - "Summary_KSA" sheet (full summary without SL column)
 * - "Invoice" sheet (billing summary with VAT)
 */
export function generateKeetaSalaryWorkbook(
  rows: KeetaSalaryRow[],
  period: string,
  location: string = 'Riyadh'
): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  // ═══════════════════════════════════════════
  // Sheet 1: "Riyadh" (Main Salary Sheet)
  // ═══════════════════════════════════════════
  const salaryData: any[][] = [];

  // Row 0-4: Header block
  salaryData.push([`NAFOUZ EST. FOR CONTRACTING - C.R. 1010879538`]);
  salaryData.push([`SALARY SHEET FOR THE MONTH OF ${period.toUpperCase()}`]);
  salaryData.push([`Keeta- ${location.toUpperCase()}`]);
  salaryData.push([]); // Blank row
  salaryData.push([]); // Blank row

  // Row 5: Column headers
  salaryData.push([
    'SL.No', 'id', 'Id name', 'Real Rider Name', 'ID User Iqama',
    'Business Unit', 'Designation', 'Location', 'VENDOR',
    'Basic Salary', 'Order Delivered', 'Delivered by Reliver',
    'Total Orders', 'OT Orders', 'Status', 'Salary',
    'Incentive from nafouz', 'Net Bill', 'Total Salary',
    'Iqama Renewal', 'Traffic violation', 'Vehicle Repairing Cost',
    'Driving License Cost', 'Advance Amount', 'Deduction',
    'food compensation', 'Internal Penalty', 'Total Payable',
    'IBAN'
  ]);

  // Data rows
  for (const row of rows) {
    salaryData.push([
      row.serial,
      row.courier_id,
      row.id_name,
      row.real_rider_name,
      row.iqama_no,
      row.business_unit,
      row.designation,
      row.location,
      row.vendor,
      row.basic_salary,
      row.orders_delivered,
      row.delivered_by_reliever || '',
      row.total_orders,
      row.ot_orders,
      row.status,
      Math.round(row.salary * 100) / 100,
      row.incentive_nafouz || '',
      row.net_bill,
      Math.round(row.total_salary * 100) / 100,
      row.iqama_renewal || '',
      row.traffic_violation || '',
      row.vehicle_repairing || '',
      row.driving_license_cost || '',
      row.advance_amount || '',
      row.deduction || '',
      row.food_compensation || '',
      row.internal_penalty || '',
      Math.round(row.total_payable * 100) / 100,
      row.iban
    ]);
  }

  // Grand Total row
  const totals = rows.reduce((acc, r) => ({
    orders: acc.orders + r.orders_delivered,
    totalOrders: acc.totalOrders + r.total_orders,
    salary: acc.salary + r.salary,
    incentive: acc.incentive + r.incentive_nafouz,
    netBill: acc.netBill + r.net_bill,
    totalSalary: acc.totalSalary + r.total_salary,
    iqama: acc.iqama + r.iqama_renewal,
    traffic: acc.traffic + r.traffic_violation,
    vehicle: acc.vehicle + r.vehicle_repairing,
    dl: acc.dl + r.driving_license_cost,
    advance: acc.advance + r.advance_amount,
    deduction: acc.deduction + r.deduction,
    food: acc.food + r.food_compensation,
    penalty: acc.penalty + r.internal_penalty,
    payable: acc.payable + r.total_payable,
  }), {
    orders: 0, totalOrders: 0, salary: 0, incentive: 0, netBill: 0,
    totalSalary: 0, iqama: 0, traffic: 0, vehicle: 0, dl: 0,
    advance: 0, deduction: 0, food: 0, penalty: 0, payable: 0
  });

  salaryData.push([]); // Blank separator
  salaryData.push([
    'GRAND TOTAL', '', '', '', '', '', '', '', '',
    '', totals.orders, '', totals.totalOrders, '', '',
    Math.round(totals.salary * 100) / 100,
    Math.round(totals.incentive * 100) / 100,
    Math.round(totals.netBill * 100) / 100,
    Math.round(totals.totalSalary * 100) / 100,
    totals.iqama,
    totals.traffic,
    totals.vehicle,
    Math.round(totals.dl * 100) / 100,
    totals.advance,
    totals.deduction,
    totals.food,
    totals.penalty,
    Math.round(totals.payable * 100) / 100
  ]);

  // Signature block
  salaryData.push([]);
  salaryData.push([]);
  salaryData.push(['', '', 'Prepared & Controlled By:', '', '', '', '', '', '', 'Checked & Approved By:', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Approved By:']);
  salaryData.push([]);
  salaryData.push(['', '', 'Tasnia Jahan Toma', '', '', '', '', '', '', 'Monir Zaman', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Abu Fahad']);
  salaryData.push(['', '', 'Operations lead', '', '', '', '', '', '', 'COO', '', '', '', '', '', '', '', '', '', '', '', '', '', 'General Manager']);

  const ws = XLSX.utils.aoa_to_sheet(salaryData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },   // SL.No
    { wch: 20 },  // id
    { wch: 25 },  // Id name
    { wch: 30 },  // Real Rider Name
    { wch: 14 },  // Iqama
    { wch: 10 },  // Business Unit
    { wch: 10 },  // Designation
    { wch: 10 },  // Location
    { wch: 8 },   // VENDOR
    { wch: 12 },  // Basic Salary
    { wch: 14 },  // Order Delivered
    { wch: 16 },  // Delivered by Reliver
    { wch: 12 },  // Total Orders
    { wch: 10 },  // OT Orders
    { wch: 8 },   // Status
    { wch: 14 },  // Salary
    { wch: 18 },  // Incentive
    { wch: 10 },  // Net Bill
    { wch: 14 },  // Total Salary
    { wch: 14 },  // Iqama Renewal
    { wch: 16 },  // Traffic
    { wch: 20 },  // Vehicle
    { wch: 18 },  // Driving License
    { wch: 14 },  // Advance
    { wch: 12 },  // Deduction
    { wch: 16 },  // food comp
    { wch: 14 },  // Internal Penalty
    { wch: 14 },  // Total Payable
    { wch: 35 },  // IBAN
  ];

  // Merge header cells
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 27 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 27 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 27 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, location);

  // ═══════════════════════════════════════════
  // Sheet 2: "Invoice"
  // ═══════════════════════════════════════════
  const totalBase = Math.round(totals.totalSalary * 100) / 100;
  const vatAmt = Math.round(totalBase * 0.15 * 1000) / 1000;
  const grandTotal = Math.round((totalBase + vatAmt) * 1000) / 1000;

  const invoiceData: any[][] = [];
  invoiceData.push([]); // Row 0
  invoiceData.push(['Vendor Name:', 'Al Bahs', '', '', '', 'Base Amt', 'Tax', 'Total Incl Tax']);
  invoiceData.push(['', '', '', '', 'Grand Total >>', totalBase, vatAmt, grandTotal]);
  invoiceData.push(['Temporary']);
  invoiceData.push(['Position', 'Staff Count', 'Monthly Price', 'Days/Hours', 'Day Rate/OT Rate', 'Sub Total', 'VAT Amt 15%', 'Total (Incl 15% VAT)']);
  invoiceData.push(['TS', rows.length, '', '', '', totalBase, vatAmt, grandTotal]);
  invoiceData.push(['', '', '', '', 'Total', totalBase, vatAmt, grandTotal]);

  const wsInvoice = XLSX.utils.aoa_to_sheet(invoiceData);
  XLSX.utils.book_append_sheet(wb, wsInvoice, 'Invoice');

  // Write to buffer
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return wbout;
}

/**
 * Generates a downloadable Keeta SINGLE-SHEET INPUT template.
 * When rows are provided (post-parse), the template is PRE-FILLED with
 * authoritative data (courier IDs, orders, status, incentives) so the
 * user only needs to enter/correct deduction columns.
 *
 * Courier IDs are written as TEXT cells to prevent Excel float64
 * precision loss on 16-digit numeric IDs.
 */
export function generateKeetaInputTemplate(
  rows?: KeetaSalaryRow[],
  config?: { spo_basic?: number; out_basic?: number; threshold?: number; ot_rate?: number; invalid_rate?: number; net_bill?: number }
): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  const spoBasic    = config?.spo_basic    ?? 2000;
  const outBasic    = config?.out_basic    ?? 5500;
  const threshold   = config?.threshold   ?? 350;
  const otRate      = config?.ot_rate      ?? 5;
  const invalidRate = config?.invalid_rate ?? 5;
  const netBillDef  = config?.net_bill     ?? 200;

  const inputData: any[][] = [];

  // Config rows (rows 0-1)
  inputData.push(['SPO Basic Salary', spoBasic, '', 'Order Threshold', threshold, '', 'OT Rate', otRate]);
  inputData.push(['OUT Basic Salary', outBasic, '', 'Net Bill Fixed', netBillDef, '', 'Invalid Rate', invalidRate]);
  inputData.push([]); // Row 2 — spacer

  // Header row (row 3)
  // Col layout: A=Courier ID, B=Real Name, C=Iqama, D=Rider Type,
  //             E=Orders Delivered, F=OT Orders (formula), G=Status,
  //             H=Incentive, I=Net Bill, J=Iqama Renewal, K=Traffic,
  //             L=Vehicle, M=DL Cost, N=Advance, O=Keeta Ded, P=Food Comp,
  //             Q=Internal Penalty, R=IBAN, S=Salary Status
  inputData.push([
    'Courier ID',
    'Real Name',
    'Iqama No',
    'Rider Type (SPO/OUT)',
    'Orders Delivered',
    'OT Orders',                  // col F — auto-formula MAX(0,E-350)
    'Status (valid/invalid)',
    'Incentive from Nafouz',
    'Net Bill Offset',
    'Iqama Renewal',
    'Traffic Violation',
    'Vehicle Repairing Cost',
    'Driving License Cost',
    'Advance Amount',
    'Keeta Deduction (Keeta)',
    'Food Compensation (Keeta)',
    'Internal Penalty',
    'IBAN',
    'Salary Status (Bank/Cash/Hold)',
  ]);

  // Data rows — pre-filled when rows provided, blank sample otherwise
  // OT Orders value is a placeholder; Excel formulas are injected below
  const dataRows: any[][] = rows && rows.length > 0
    ? rows.map(r => [
        r.courier_id,                              // A — text below
        r.real_rider_name,                         // B
        r.iqama_no,                                // C
        r.vendor,                                  // D
        r.orders_delivered,              // E
        r.orders_delivered - threshold,  // F — formula placeholder (overwritten below)
        r.status,                        // G
        r.incentive_nafouz || 0,         // H
        r.net_bill || netBillDef,        // I
        r.iqama_renewal || 0,            // J — stored as-is (negative = credit)
        r.traffic_violation || 0,        // K
        r.vehicle_repairing || 0,        // L
        r.driving_license_cost || 0,     // M
        r.advance_amount || 0,           // N
        r.deduction || 0,                // O — keeta deduction
        r.food_compensation || 0,        // P — food comp
        r.internal_penalty || 0,         // Q
        r.iban || '',                              // R
        r.salary_status || '',                     // S
      ])
    : [[
        '1766343526237144',
        'Sample Driver',
        '2619201243',
        'SPO',
        183,
        0,            // OT Orders — formula below
        'invalid',
        0,
        netBillDef,
        0, 0, 0, 0, 0, 0, 0, 0,
        '',
        '',
      ]];

  dataRows.forEach(r => inputData.push(r));

  const ws = XLSX.utils.aoa_to_sheet(inputData);

  // ── Inject Excel formula for OT Orders column (col F = index 5) ─────────
  // Formula: =E5-350  (exact subtraction, no clamping — user owns the value)
  const dataStartRow = 4; // 0-indexed row index where data begins
  for (let ri = 0; ri < dataRows.length; ri++) {
    const excelRow = dataStartRow + ri + 1; // Excel 1-indexed row number
    const cellAddr = XLSX.utils.encode_cell({ r: dataStartRow + ri, c: 5 });
    ws[cellAddr] = {
      t: 'n',
      f: `E${excelRow}-${threshold}`,
      v: (dataRows[ri][4] as number) - threshold,
    };
  }

  // ── Force courier ID cells (col A) to TEXT to preserve 16-digit precision
  for (let ri = 0; ri < dataRows.length; ri++) {
    const cellAddr = XLSX.utils.encode_cell({ r: dataStartRow + ri, c: 0 });
    if (ws[cellAddr]) {
      ws[cellAddr].t = 's';
      ws[cellAddr].v = String(dataRows[ri][0]);
      ws[cellAddr].w = String(dataRows[ri][0]);
      delete ws[cellAddr].z;
    }
  }

  ws['!cols'] = [
    { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 20 },
    { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
    { wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
    { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
    { wch: 15 }, { wch: 30 }, { wch: 22 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Keeta Input');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return wbout;
}
