import * as XLSX from "xlsx";
import { autoMapHeaders } from "./fuzzy-mapper";

// ─── Config shape stored in clients.payroll_config ───────────────────────────

export interface PayrollColumnMap {
  emp_id: string;
  worker_name: string;
  basic_salary: string;
  net_salary: string;
  working_days?: string;
  paid_days?: string;
  absent_days?: string;
  ot_hours?: string;
  ot_days?: string;
  ot_amount?: string;
  deductions?: string;
  position?: string;
  vendor_name?: string;
}

export interface PayrollConfig {
  sheet_index: number;   // 0-based sheet tab
  header_row: number;    // 0-based row where headers live
  column_map: PayrollColumnMap;
}

// ─── Standard output — same shape payroll/page.tsx already expects ────────────

export interface UniversalWorkerRow {
  serial: number;
  emp_id: string;
  name: string;
  position: string;
  vendor_name: string;
  working_days: number;
  paid_days: number;
  absent: number;
  ot_hours: number;
  ot_days: number;
  monthly_pay: number;
  ot_hour_amount: number;
  ot_day_amount: number;
  deduction_add: number;
  net_salary: number;
  rate_type: "Skilled" | "Unskilled";
}

export interface UniversalParseResult {
  client_name: string;
  pay_period: string;
  workers: UniversalWorkerRow[];
  daily_attendance: never[];
  rate_card: {
    unskilled_monthly: number; skilled_monthly: number;
    ot_day_unskilled: number;  ot_day_skilled: number;
    ot_hour_unskilled: number; ot_hour_skilled: number;
  };
  invoice: { subtotal: number; vat: number; grand_total: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function num(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = parseFloat(String(val).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function str(val: any): string {
  return String(val ?? "").trim();
}

// ─── Auto-detect config by reading sheet headers ──────────────────────────────

export function detectConfigFromWorkbook(workbook: XLSX.WorkBook): {
  config: PayrollConfig;
  rawHeaders: string[];
  unmapped: string[];
} {
  const sheetIndex = 0;
  const sheet = workbook.Sheets[workbook.SheetNames[sheetIndex]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // Find header row: first row where ≥3 cells are non-empty strings
  let headerRow = 0;
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const nonEmpty = rows[r].filter((c: any) => c !== "" && typeof c === "string").length;
    if (nonEmpty >= 3) { headerRow = r; break; }
  }

  const rawHeaders = rows[headerRow].map((h: any) => str(h));
  const { mapped, unmapped } = autoMapHeaders(rawHeaders);

  const column_map: PayrollColumnMap = {
    emp_id:       mapped.emp_id           ?? "",
    worker_name:  mapped.worker_name      ?? "",
    basic_salary: mapped.basic_salary     ?? "",
    net_salary:   mapped.net_salary       ?? "",
    working_days: mapped.working_days,
    paid_days:    mapped.paid_days,
    absent_days:  mapped.absent_days,
    ot_hours:     mapped.overtime_hours,
    ot_days:      mapped.ot_days,
    ot_amount:    mapped.overtime_amount,
    deductions:   mapped.deductions,
    position:     mapped.position,
    vendor_name:  mapped.vendor_name,
  };

  return {
    config: { sheet_index: sheetIndex, header_row: headerRow, column_map },
    rawHeaders,
    unmapped,
  };
}

// ─── Parse using a saved config ───────────────────────────────────────────────

export function parseWithConfig(
  workbook: XLSX.WorkBook,
  config: PayrollConfig,
  clientName: string,
  payPeriod: string
): UniversalParseResult {
  const sheetName = workbook.SheetNames[config.sheet_index ?? 0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const headerRow = rows[config.header_row] || [];
  const cm = config.column_map;

  // Build column index lookup: header string → index
  const colIndex: Record<string, number> = {};
  if (headerRow) {
    headerRow.forEach((h: any, i: number) => {
      const s = str(h);
      if (s !== "") colIndex[s] = i;
    });
  }

  function ci(field: string | undefined): number {
    if (!field) return -1;
    return colIndex[field] ?? -1;
  }

  const C = {
    emp_id:       ci(cm.emp_id),
    name:         ci(cm.worker_name),
    basic:        ci(cm.basic_salary),
    net:          ci(cm.net_salary),
    working_days: ci(cm.working_days),
    paid_days:    ci(cm.paid_days),
    absent:       ci(cm.absent_days),
    ot_hours:     ci(cm.ot_hours),
    ot_days:      ci(cm.ot_days),
    ot_amount:    ci(cm.ot_amount),
    deductions:   ci(cm.deductions),
    position:     ci(cm.position),
    vendor:       ci(cm.vendor_name),
  };

  const workers: UniversalWorkerRow[] = [];
  let serial = 1;

  for (let r = config.header_row + 1; r < rows.length; r++) {
    const row = rows[r];

    const empId = C.emp_id >= 0 ? str(row[C.emp_id]) : "";
    const name  = C.name   >= 0 ? str(row[C.name])   : "";
    if (!empId && !name) continue;

    // Skip total/subtotal rows
    const rowText = row.slice(0, 6).map((v: any) => str(v).toLowerCase()).join(" ");
    if (rowText.includes("total") || rowText.includes("grand") || rowText.includes("sub total")) continue;

    const basic = C.basic >= 0 ? num(row[C.basic]) : 0;
    const net   = C.net   >= 0 ? num(row[C.net])   : basic;
    const ded   = C.deductions >= 0 ? num(row[C.deductions]) : (basic - net > 0 ? basic - net : 0);

    workers.push({
      serial:         serial++,
      emp_id:         empId,
      name:           name,
      position:       C.position >= 0 ? str(row[C.position]) : "",
      vendor_name:    C.vendor   >= 0 ? str(row[C.vendor])   : "",
      working_days:   C.working_days >= 0 ? num(row[C.working_days]) : 30,
      paid_days:      C.paid_days    >= 0 ? num(row[C.paid_days])    : 30,
      absent:         C.absent       >= 0 ? num(row[C.absent])       : 0,
      ot_hours:       C.ot_hours     >= 0 ? num(row[C.ot_hours])     : 0,
      ot_days:        C.ot_days      >= 0 ? num(row[C.ot_days])      : 0,
      monthly_pay:    basic,
      ot_hour_amount: C.ot_amount    >= 0 ? num(row[C.ot_amount])    : 0,
      ot_day_amount:  0,
      deduction_add:  ded,
      net_salary:     net,
      rate_type:      "Unskilled",
    });
  }

  const subtotal = workers.reduce((s, w) => s + w.net_salary, 0);

  return {
    client_name: clientName,
    pay_period:  payPeriod,
    workers,
    daily_attendance: [],
    rate_card: {
      unskilled_monthly: 0, skilled_monthly: 0,
      ot_day_unskilled: 0,  ot_day_skilled: 0,
      ot_hour_unskilled: 0, ot_hour_skilled: 0,
    },
    invoice: { subtotal, vat: subtotal * 0.15, grand_total: subtotal * 1.15 },
  };
}
