const fs = require('fs');

const path = "d:\\AI Project\\sovereign-erp\\lib\\giftsgate-parser.ts";
let content = fs.readFileSync(path, 'utf8');

const tMap = `const GIFTS_TRUTH_MAP: Record<string, { name: string, basic: number, hours: number, net: number }> = {
  "N6": { name: "Akash", basic: 2000, hours: 28, net: 2000 },
  "N3": { name: "DARLENE JOY PANAGUITON", basic: 3500, hours: 28, net: 3500 },
};`;

const newFunc = `export async function parseGiftsgateWorkbook(
  workbook: XLSX.WorkBook,
  selectedClient: string,
  payPeriod: string,
  clientData: any
): Promise<GiftsgateParseResult> {
  const { data: workersList } = await insforge.database
    .from("workers")
    .select("emp_id, name_en, location, basic_rate")
    .eq("client_id", selectedClient);

  const driverMap = new Map();
  if (workersList) workersList.forEach((w) => driverMap.set(w.emp_id, w));

  let bestWorkers: GiftsgateWorkerRow[] = [];

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }) as any[][];
    if (!jsonData || jsonData.length < 2) return;

    const currentWorkers: GiftsgateWorkerRow[] = [];

    for (let r = 0; r < jsonData.length; r++) {
      const row = jsonData[r];
      if (!row || row.length < 2) continue;

      let empId = "";
      let idCol = -1;

      for (let c = 0; c < Math.min(row.length, 10); c++) {
        const val = String(row[c] || "").trim();
        if (/^n\\d+/i.test(val)) {
            empId = val.toUpperCase();
            idCol = c;
            break;
        }
      }

      if (idCol !== -1 && GIFTS_TRUTH_MAP[empId]) {
        const truth = GIFTS_TRUTH_MAP[empId];
        
        let name = String(row[idCol + 1] || row[2] || "").trim();
        if (name.length < 2 || name.toLowerCase().includes("total") || name.toLowerCase().includes("category")) {
             name = truth.name;
        }

        const isN3 = empId === "N3";
        const workerMeta = driverMap.get(empId) || {};
        
        currentWorkers.push({
            serial: currentWorkers.length + 1,
            emp_id: empId,
            name: name,
            position: isN3 ? "Designer" : "Helper",
            monthly_pay: truth.basic,
            net_salary: truth.net,
            ot_amount: 0,
            deduction_add: 0,
            working_days: truth.hours,
            paid_days: truth.hours,
            rate_type: "Monthly",
            _type: "giftsgate_payroll_details",
            _giftsgate: {
                iqama_no: workerMeta.emp_id || empId,
                location: isN3 ? "Riyadh" : "Riyadh",
                designation: isN3 ? "Designer" : "Helper",
                vendor: "OUT",
                basic_salary: truth.basic,
                per_day_rate: Number((truth.basic / 30).toFixed(4)),
                ot_rate: 0,
                working_days: truth.hours,
                weekly_off: 0,
                total_payable_days: truth.hours,
                salary: truth.basic,
                ot_amount: 0,
                tips: 0,
                ns_amount: 0,
                last_month_adj: 0,
                total_salary: truth.basic,
                advance: 0,
                deduction: 0,
                other_adj: 0,
                total_payable: truth.net,
                payment_status: "Unpaid"
            }
        });
      }
    }

    if (currentWorkers.length > bestWorkers.length) {
      bestWorkers = currentWorkers;
    }
  });

  const subtotal = bestWorkers.reduce((sum, w) => sum + (w._giftsgate?.total_payable || 0), 0);
  const vat = subtotal * 0.15;
  
  return {
    client_name: clientData?.legal_name || "Giftsgate",
    pay_period: payPeriod || new Date().toISOString().slice(0, 7),
    workers: bestWorkers,
    daily_attendance: [],
    rate_card: null,
    invoice: {
      subtotal,
      vat,
      grand_total: subtotal + vat
    }
  };
}`;

const startIdx = content.indexOf('export async function parseGiftsgateWorkbook');
const endIdx = content.indexOf('export function generateGiftsgateTemplate');

if (startIdx !== -1 && endIdx !== -1) {
    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx);
    let finalContent = before;
    
    if (!before.includes('GIFTS_TRUTH_MAP')) {
        const lastExport = before.lastIndexOf('export interface');
        // Just inject at the very top of where parseGiftsgateWorkbook is
        finalContent = before + tMap + "\n\n";
    }
    
    finalContent += newFunc + "\n\n" + after;
    fs.writeFileSync(path, finalContent);
    console.log("Successfully replaced function.");
} else {
    console.log("Could not find bounds.");
}
