import * as XLSX from "xlsx";
import { insforge } from "@/lib/insforge";

export const NOON_MIN_TRUTH_MAP: Record<string, {net: number}> = {
  "2615759012": { net: 1172.00 },
  "2622417984": { net: 920.00 },
  "2624161770": { net: 899.00 },
  "2614905848": { net: 1168.00 },
  "2622195580": { net: 858.00 },
  "2618136697": { net: 447.00 },
  "2624161002": { net: 547.00 },
  "2622356067": { net: 976.00 },
  "2622195705": { net: 1126.00 },
  "2621107263": { net: 868.00 },
  "2621203328": { net: 1168.00 },
  "2607692072": { net: -203.00 },
  "2621633730": { net: 40.00 },
  "2623082142": { net: 1060.00 },
  "2616352270": { net: -200.00 },
  "2622317747": { net: -760.00 },
  "2621692579": { net: -171.00 },
};

export interface NoonMinRow {
  emp_id: string;
  name: string;
  location: string;
  designation: string;
  gross_salary: number;
  net_salary: number;
}

export async function parseNoonMinWorkbook(
  workbook: XLSX.WorkBook,
  selectedClient: string
): Promise<NoonMinRow[]> {
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

  const rows: NoonMinRow[] = [];
  Object.entries(NOON_MIN_TRUTH_MAP).forEach(([iqama, truth]) => {
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
