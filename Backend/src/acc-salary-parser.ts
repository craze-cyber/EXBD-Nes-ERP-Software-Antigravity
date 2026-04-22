import * as XLSX from "xlsx";

/**
 * ACC (Alexandra Construction Company) Salary Sheet Parser
 * ========================================================
 * Parses the "Your Solution" / ACC template format:
 * Row 0: Headers ["SL.No","EMP ID","Associate name","Iqama Number","Business Unit","Designation","Location","VENDOR ","Basic Salary","Per Hour Rate","OT Rate","Working Days ","Weekly off","Working Hours","Salary","Other Adjustment","Last Month Adjustment","Total Salary","Advance Amount","Deduction","Other Adjustment","Total Payable",...]
 * Rows 1+: Worker data
 */

export interface ACCWorker {
  serial: number;
  emp_id: string;
  name: string;
  iqama: string;
  business_unit: string;
  designation: string;
  location: string;
  vendor: string;
  basic_salary: number;
  per_hour_rate: number;
  ot_rate: number;
  working_days: number;
  weekly_off: number;
  working_hours: number;
  salary: number;
  other_adjustment: number;
  last_month_adjustment: number;
  total_salary: number;
  advance_amount: number;
  deduction: number;
  net_payable: number;
}

export interface ACCParseResult {
  client_name: string;
  pay_period: string; // User usually fills this or we detect from file name
  workers: ACCWorker[];
}

const COL = {
  SERIAL: 0,
  EMP_ID: 1,
  NAME: 2,
  IQAMA: 3,
  BU: 4,
  DESIGNATION: 5,
  LOCATION: 6,
  VENDOR: 7,
  BASIC: 8,
  HOUR_RATE: 9,
  OT_RATE: 10,
  WORKING_DAYS: 11,
  WEEKLY_OFF: 12,
  WORKING_HOURS: 13,
  SALARY: 14,
  ADJ1: 15,
  ADJ2: 16,
  TOTAL_SALARY: 17,
  ADVANCE: 18,
  DEDUCTION: 19,
  ADJ3: 20,
  NET_PAYABLE: 21,
} as const;

export function parseACCSheet(workbook: XLSX.WorkBook): ACCParseResult {
  const result: ACCParseResult = {
    client_name: "Alexandra Construction Company",
    pay_period: new Date().toISOString().slice(0, 7),
    workers: [],
  };

  // Scan all sheets to find worker data
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }) as any[][];
    if (!jsonData || jsonData.length < 1) continue;

    // 1. Find the header row
    let hIdx = -1;
    for (let i = 0; i < Math.min(jsonData.length, 30); i++) {
        const rowStr = (jsonData[i] || []).map(c => String(c || "").toLowerCase().trim()).join(" ");
        if (rowStr.includes("name") && (rowStr.includes("iqama") || rowStr.includes("salary") || rowStr.includes("designation") || rowStr.includes("category"))) {
            hIdx = i;
            break;
        }
    }

    if (hIdx === -1) continue; // Try next sheet

    const rawHeaders = (jsonData[hIdx] || []);
    const headers = rawHeaders.map(c => String(c || "").toLowerCase().trim());
    const find = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

    const I = {
        SERIAL: find(["sl.no", "serial", "#", "s no"]),
        EMP_ID: find(["emp id", "id", "emp code", "external id", "employee id"]),
        NAME: find(["name", "associate name", "employee name", "worker name"]),
        IQAMA: find(["iqama", "resident id", "id no"]),
        DESIGNATION: find(["designation", "position", "category", "profession"]),
        LOCATION: find(["location", "site"]),
        VENDOR: find(["vendor"]),
        BASIC: find(["basic salary", "basic", "salary"]), // Fallback to salary
        WORKING_DAYS: find(["working days", "days"]),
        OT_HOURS: find(["ot hours", "ot hr"]),
        TOTAL_SALARY: find(["total salary", "total payable", "net", "payable"]),
    };

    // 2. Parse data
    for (let r = hIdx + 1; r < jsonData.length; r++) {
        const row = jsonData[r];
        if (!row || row.length < 2) continue;

        const name = I.NAME >= 0 ? String(row[I.NAME] || "").trim() : "";
        if (!name || name.toLowerCase().includes("total") || name.toLowerCase().includes("signature")) continue;

        const worker: ACCWorker = {
            serial: I.SERIAL >= 0 ? parseFloat(row[I.SERIAL]) || (r - hIdx) : (r - hIdx),
            emp_id: I.EMP_ID >= 0 ? String(row[I.EMP_ID] || "").trim() : "",
            name: name,
            iqama: I.IQAMA >= 0 ? String(row[I.IQAMA] || "").trim() : "",
            business_unit: "",
            designation: I.DESIGNATION >= 0 ? String(row[I.DESIGNATION] || "").trim() : "",
            location: I.LOCATION >= 0 ? String(row[I.LOCATION] || "").trim() : "",
            vendor: I.VENDOR >= 0 ? String(row[I.VENDOR] || "").trim() : "",
            basic_salary: I.BASIC >= 0 ? parseFloat(row[I.BASIC]) || 0 : 0,
            per_hour_rate: 0,
            ot_rate: 0,
            working_days: I.WORKING_DAYS >= 0 ? parseFloat(row[I.WORKING_DAYS]) || 0 : 0,
            weekly_off: 0,
            working_hours: 0,
            salary: I.BASIC >= 0 ? parseFloat(row[I.BASIC]) || 0 : 0,
            other_adjustment: 0,
            last_month_adjustment: 0,
            total_salary: I.TOTAL_SALARY >= 0 ? parseFloat(row[I.TOTAL_SALARY]) || 0 : 0,
            advance_amount: 0,
            deduction: 0,
            net_payable: I.TOTAL_SALARY >= 0 ? parseFloat(row[I.TOTAL_SALARY]) || 0 : 0,
        };
        result.workers.push(worker);
    }
    
    if (result.workers.length > 0) return result; // Done if we found people
  }

  return result;
}

export function generateACCTemplate() {
  const headers = [
    "SL.No", "EMP ID", "Associate name", "Iqama Number", "Business Unit", "Designation", "Location", "VENDOR ", 
    "Basic Salary", "Per Hour Rate", "OT Rate", "Working Days ", "Weekly off", "Working Hours", "Salary", 
    "Other Adjustment", "Last Month Adjustment", "Total Salary", "Advance Amount", "Deduction", "Other Adjustment", 
    "Total Payable", "Signature", "Salary Status"
  ];
  const sampleData = [
    [1, "N1", "Sample Worker", "2564405287", "ACC", "Carpenter", "Riyadh", "OUT", 2200, 10.58, 1.32, 30, 0, 240, 2200, 0, 0, 2200, 0, 0, 0, 2200, "", "Unpaid"]
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Salary Sheet");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
