/**
 * FirstCry Attendance Grid Parser
 * ================================
 * Parses the exact "First Cry" XLSX format with dynamic header and SHEET detection
 */

import * as XLSX from "xlsx";

export interface FCWorker {
  serial: number;
  emp_id: string;
  name: string;
  position: string;
  religion: string;
  vendor_name: string;
  working_days: number;
  ot_hours: number;
  week_off: number;
  absent: number;
  holidays: number;
  ot_days: number;
  paid_days: number;
  deduction_add: number;
  remarks: string;
  monthly_pay: number;
  ot_day_amount: number;
  ot_hour_amount: number;
  net_salary: number;
  rate_type: "Skilled" | "Unskilled";
}

export interface FCAttendanceRecord {
  emp_id: string;
  date: string;
  code: string;
  hours: number;
}

export interface FCRateCard {
  unskilled_monthly: number;
  skilled_monthly: number;
  ot_day_unskilled: number;
  ot_day_skilled: number;
  ot_hour_unskilled: number;
  ot_hour_skilled: number;
}

export interface FCInvoice {
  subtotal: number;
  vat: number;
  grand_total: number;
}

export interface FCParseResult {
  client_name: string;
  pay_period: string;
  rate_card: FCRateCard;
  workers: FCWorker[];
  daily_attendance: FCAttendanceRecord[];
  invoice: FCInvoice;
}

export function parseFirstCrySheet(workbook: XLSX.WorkBook): FCParseResult {
  const result: FCParseResult = {
    client_name: "First Cry",
    pay_period: "",
    rate_card: { unskilled_monthly: 0, skilled_monthly: 0, ot_day_unskilled: 0, ot_day_skilled: 0, ot_hour_unskilled: 0, ot_hour_skilled: 0 },
    workers: [],
    daily_attendance: [],
    invoice: { subtotal: 0, vat: 0, grand_total: 0 }
  };

  // Scan ALL sheets to find the one with attendance data
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }) as any[][];
    if (!jsonData || jsonData.length < 4) continue;

    // 1. Find Header Row
    let hIdx = -1;
    for (let i = 0; i < Math.min(jsonData.length, 30); i++) {
        const rowStr = (jsonData[i] || []).map(c => String(c || "").toLowerCase().trim()).join(" ");
        // Heuristic: Attendance sheets have a lot of dates or specific headers
        if ((rowStr.includes("emp. name") || rowStr.includes("associate name")) && (rowStr.includes("id") || rowStr.includes("iqama"))) {
            hIdx = i;
            break;
        }
    }

    if (hIdx === -1) continue;

    const headers = (jsonData[hIdx] || []).map(c => String(c || "").toLowerCase().trim());
    const find = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

    const I = {
        SERIAL: find(["no", "sn", "sl.no"]),
        EMP_ID: find(["id", "emp code", "emp id"]),
        NAME: find(["emp. name", "associate name", "employee name", "name"]),
        POSITION: find(["position", "designation", "category"]),
        RELIGION: find(["muslim/non muslim", "religion"]),
        VENDOR: find(["vendor name", "vendor"]),
        GRID_START: headers.findIndex(h => h === "1" || h.includes("-26")), // Detect first date column
        WORKING_DAYS: find(["working days"]),
        OT_HOURS: find(["ot hours"]),
        WEEK_OFF: find(["weekly off"]),
        ABSENT: find(["absent"]),
        HOLIDAY: find(["holidays"]),
        OT_DAYS: find(["ot days"]),
        PAID_DAYS: find(["paid days"]),
        DEDUCTION: find(["manual deduction", "deduction"]),
        REMARKS: find(["remarks"]),
        UNSKILLED_PAY: find(["4000"]),
        SKILLED_PAY: find(["4800"]),
        TOTAL: find(["total salary", "total payable", "net salary", "total"]),
    };

    if (I.NAME === -1) continue; // Skip if no name column found

    // Fallback AU index if not found
    if (I.UNSKILLED_PAY === -1) I.UNSKILLED_PAY = 46;
    if (I.SKILLED_PAY === -1) I.SKILLED_PAY = 47;
    if (I.TOTAL === -1) I.TOTAL = 52;

    // 2. Rates
    result.rate_card = {
        unskilled_monthly: parseFloat(headers[I.UNSKILLED_PAY]) || 4000,
        skilled_monthly:   parseFloat(headers[I.SKILLED_PAY])   || 4800,
        ot_day_unskilled:  parseFloat(headers[I.UNSKILLED_PAY + 2]) || 200,
        ot_day_skilled:    parseFloat(headers[I.SKILLED_PAY + 2])   || 240,
        ot_hour_unskilled: parseFloat(headers[I.UNSKILLED_PAY + 4]) || 7.5,
        ot_hour_skilled:   parseFloat(headers[I.SKILLED_PAY + 4])   || 11,
    };

    // 3. Workers
    for (let r = hIdx + 1; r < jsonData.length; r++) {
        const row = jsonData[r];
        if (!row) continue;
        const nameVal = I.NAME >= 0 ? String(row[I.NAME] || "").trim() : "";
        if (!nameVal || nameVal.toLowerCase().includes("total") || nameVal.toLowerCase().includes("signature")) continue;

        const empId = I.EMP_ID >= 0 ? String(row[I.EMP_ID] || "").trim() : "";
        const position = I.POSITION >= 0 ? String(row[I.POSITION] || "").trim() : "";
        const isSkilled = position.toLowerCase().includes("skilled") && !position.toLowerCase().includes("unskilled");

        const worker: FCWorker = {
            serial:        I.SERIAL >= 0 ? parseFloat(row[I.SERIAL]) || 0 : (r - hIdx),
            emp_id:        empId,
            name:          nameVal,
            position:      position,
            religion:      I.RELIGION >= 0 ? String(row[I.RELIGION] || "").trim() : "",
            vendor_name:   I.VENDOR >= 0 ? String(row[I.VENDOR] || "").trim() : "",
            working_days:  I.WORKING_DAYS >= 0 ? parseFloat(row[I.WORKING_DAYS]) || 0 : 0,
            ot_hours:      I.OT_HOURS >= 0 ? parseFloat(row[I.OT_HOURS]) || 0 : 0,
            week_off:      I.WEEK_OFF >= 0 ? parseFloat(row[I.WEEK_OFF]) || 0 : 0,
            absent:        I.ABSENT >= 0 ? parseFloat(row[I.ABSENT]) || 0 : 0,
            holidays:      I.HOLIDAY >= 0 ? parseFloat(row[I.HOLIDAY]) || 0 : 0,
            ot_days:       I.OT_DAYS >= 0 ? parseFloat(row[I.OT_DAYS]) || 0 : 0,
            paid_days:     I.PAID_DAYS >= 0 ? parseFloat(row[I.PAID_DAYS]) || 0 : 0,
            deduction_add: I.DEDUCTION >= 0 ? parseFloat(row[I.DEDUCTION]) || 0 : 0,
            remarks:       I.REMARKS >= 0 ? String(row[I.REMARKS] || "").trim() : "",
            monthly_pay:   isSkilled ? (parseFloat(row[I.SKILLED_PAY]) || 0) : (parseFloat(row[I.UNSKILLED_PAY]) || 0),
            ot_day_amount: isSkilled ? (parseFloat(row[I.SKILLED_PAY + 2]) || 0) : (parseFloat(row[I.UNSKILLED_PAY + 2]) || 0),
            ot_hour_amount:isSkilled ? (parseFloat(row[I.SKILLED_PAY + 4]) || 0) : (parseFloat(row[I.UNSKILLED_PAY + 4]) || 0),
            net_salary:    I.TOTAL >= 0 ? parseFloat(row[I.TOTAL]) || 0 : 0,
            rate_type:     isSkilled ? "Skilled" : "Unskilled",
        };
        result.workers.push(worker);
    }
    
    if (result.workers.length > 0) return result;
  }

  return result;
}

export function generateFCTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  const headers = ["NO", "ID", "Emp. Name", "Position", "Muslim/non muslim", "Vendor Name", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, "Working Days", "OT Hours", "Weekly Off", "Absent", "Holidays", "OT Days", "Paid Days", "Manual Deduction", "Remarks", 4000, 4800, 200, 240, 7.5, 11, "TOTAL"];
  const sample = [1, "K001-0151", "Sample", "Unskilled", "Muslim", "YS", "12", "12", "W", "12", "12", "12", "12", "12", "12", "W", "12", "12", "12", "12", "12", "12", "W", "12", "12", "12", "12", "12", "12", "W", "12", "12", "12", "12", "12", "12", "W", 26, 0, 5, 0, 0, 0, 31, 0, "", 4000, 0, 200, 0, 7.5, 0, 4000];
  const ws = XLSX.utils.aoa_to_sheet([["", "", "", "First Cry Attendance Sheet"], headers, sample]);
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
