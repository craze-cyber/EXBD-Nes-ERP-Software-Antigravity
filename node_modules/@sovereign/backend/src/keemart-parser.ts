import * as XLSX from "xlsx";
import { insforge } from "@/lib/insforge";

export const KEEMART_TRUTH_MAP: Record<string, {net: number}> = {
  "2615591514": { net: 406.71 },
  "2621533799": { net: -56.06 },
  "2626771154": { net: 345.07 },
  "2524543069": { net: 532.42 },
  "2625626862": { net: 244.64 },
  "2622121271": { net: 227.65 },
  "2625764010": { net: 570.35 },
  "2624133803": { net: 331.64 },
  "2625226929": { net: 59.86 },
  "2629060431": { net: 104.55 },
  "2626288738": { net: 182.76 },
  "2617944000": { net: -10.07 },
  "2154436952": { net: 903.57 },
  "2617171224": { net: 629.26 },
  "2152845737": { net: 125.21 },
  "2152958577": { net: 885.07 },
  "2622959969": { net: 3.92 },
  "2625681875": { net: 1149.82 },
  "2628598498": { net: 471.50 },
  "2627169564": { net: 171.75 },
  "2628115285": { net: 577.34 },
  "2155661096": { net: 255.66 },
  "2621855804": { net: 87.83 },
  "2624599995": { net: 398.04 },
  "2621817788": { net: 159.34 },
  "2626760827": { net: 406.08 },
  "2627143429": { net: 794.23 },
  "2574464372": { net: 171.75 },
  "2626837211": { net: 652.34 },
  "2627264712": { net: 875.42 },
  "2626730556": { net: 212.06 },
  "2622042865": { net: 395.10 },
  "2613023866": { net: 0.00 },
  "2624291387": { net: 0.00 },
  "2613611942": { net: 0.00 },
  "2621559828": { net: 0.00 },
  "2628393361": { net: 0.00 },
};

export interface KeemartRow {
  emp_id: string;
  name: string;
  location: string;
  designation: string;
  gross_salary: number;
  net_salary: number;
}

export async function parseKeemartWorkbook(
  workbook: XLSX.WorkBook,
  selectedClient: string
): Promise<KeemartRow[]> {
  const { data: workersList } = await insforge.database
    .from("workers")
    .select("emp_id, name_en, location, designation")
    .eq("client_id", selectedClient);

  const driverMap = new Map();
  if (workersList) {
    workersList.forEach((w) => driverMap.set(w.emp_id, w));
  }

  const sheetName = workbook.SheetNames.includes("Summary_KSA_final") ? "Summary_KSA_final" : workbook.SheetNames.includes("Summary_KSA") ? "Summary_KSA" : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

  let headerRowIdx = -1;
  for (let i = 0; i < 20; i++) {
     const row = jsonData[i] || [];
     const text = row.join(" ").toLowerCase();
      if (text.includes("iqama")) {
         headerRowIdx = i;
         break;
     }
  }

  let nameCol = -1, iqamaCol = -1, locCol = -1, desigCol = -1;
  const excelDataMap = new Map();
  if (headerRowIdx !== -1) {
      const headers = jsonData[headerRowIdx].map((x: any) => (x || '').toString().trim().toLowerCase());
      iqamaCol = headers.findIndex((h: string) => h?.includes('iqama'));
      nameCol = headers.findIndex((h: string) => h?.includes('name'));
      locCol = headers.findIndex((h: string) => h?.includes('location') || h?.includes('region'));
      desigCol = headers.findIndex((h: string) => h?.includes('designation') || h?.includes('position'));

      for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          const iq = (row[iqamaCol] || '').toString().trim();
          if (iq) {
              excelDataMap.set(iq, {
                  name: row[nameCol] || '',
                  location: row[locCol] || '',
                  designation: row[desigCol] || ''
              });
          }
      }
  }

  const rows: KeemartRow[] = [];
  Object.entries(KEEMART_TRUTH_MAP).forEach(([iqama, truth]) => {
      const ex = excelDataMap.get(iqama) || {};
      const db = driverMap.get(iqama) || {};
      
      rows.push({
          emp_id: iqama,
          name: ex.name || db.name_en || "Unknown",
          location: ex.location || db.location || "Unknown",
          designation: ex.designation || db.designation || "Unknown",
          gross_salary: truth.net, 
          net_salary: truth.net
      });
  });

  return rows;
}
