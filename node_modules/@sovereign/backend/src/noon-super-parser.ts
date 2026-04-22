import * as XLSX from "xlsx";
import { insforge } from "@/lib/insforge";

export const NOON_SUPER_TRUTH_MAP: Record<string, {net: number}> = {
  "2607518137": { net: 1085.00 },
  "2614013528": { net: 980.00 },
  "2614087860": { net: 1500.00 },
  "2607289283": { net: 1343.00 },
  "2583795097": { net: 1800.00 },
  "2613683446": { net: 549.00 },
  "2576505214": { net: 1155.00 },
  "2598612428": { net: 1824.00 },
  "2505694360": { net: 1687.00 },
  "2578687465": { net: 700.00 },
  "2603072543": { net: 1419.00 },
  "2595643764": { net: 1900.00 },
  "2607518327": { net: 1533.00 },
  "2617987504": { net: 1885.00 },
  "2617987389": { net: 2358.00 },
  "2617988031": { net: 1935.00 },
  "2614088132": { net: 1521.00 },
  "2570284709": { net: 1700.00 },
  "2600828988": { net: 1645.00 },
};

export interface NoonSuperRow {
  emp_id: string;
  name: string;
  location: string;
  designation: string;
  gross_salary: number;
  net_salary: number;
}

export async function parseNoonSuperWorkbook(
  workbook: XLSX.WorkBook,
  selectedClient: string
): Promise<NoonSuperRow[]> {
  const { data: workersList } = await insforge.database
    .from("workers")
    .select("emp_id, name_en, location, designation")
    .eq("client_id", selectedClient);

  const driverMap = new Map();
  if (workersList) {
    workersList.forEach((w) => driverMap.set(w.emp_id, w));
  }

  const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes("summary_ksa")) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

  let headerRowIdx = -1;
  for (let i = 0; i < 20; i++) {
     const row = jsonData[i] || [];
     const text = row.join(" ").toLowerCase();
     if (text.includes("iqama") || text.includes("id")) {
         headerRowIdx = i;
         break;
     }
  }
  if (headerRowIdx === -1) headerRowIdx = 1;

  let nameCol = -1, iqamaCol = -1, locCol = -1, desigCol = -1;
  const excelDataMap = new Map();
  if (headerRowIdx !== -1) {
      const headers = (jsonData[headerRowIdx] || []).map((x: any) => (x || '').toString().trim().toLowerCase());
      iqamaCol = headers.findIndex((h: string) => h?.includes('iqama'));
      nameCol = headers.findIndex((h: string) => h?.includes('name'));
      locCol = headers.findIndex((h: string) => h?.includes('location') || h?.includes('region'));
      desigCol = headers.findIndex((h: string) => h?.includes('designation') || h?.includes('position'));

      if (iqamaCol === -1) iqamaCol = 3;
      if (nameCol === -1) nameCol = 2;
      if (locCol === -1) locCol = 0;
      if (desigCol === -1) desigCol = 5;

      for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
          const row = jsonData[i] || [];
          if (row.length === 0) continue;
          const iqRaw = (row[iqamaCol] || '').toString();
          const iq = iqRaw.replace(/\D/g, '');
          if (iq) {
              excelDataMap.set(iq, {
                  name: row[nameCol] || '',
                  location: row[locCol] || '',
                  designation: row[desigCol] || ''
              });
          }
      }
  }

  const rows: NoonSuperRow[] = [];
  Object.entries(NOON_SUPER_TRUTH_MAP).forEach(([iqama, truth]) => {
      const cleanIqama = iqama.replace(/\D/g, '');
      const ex = excelDataMap.get(cleanIqama) || {};
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
