import * as XLSX from "xlsx";
import { fuzzyMatchColumn } from "./fuzzy-mapper";

export interface ParsedRow {
  raw: any;
  mapped: Record<string, any>;
  status: "New" | "Update" | "Error";
  errorMsg?: string;
}

export async function parseWorkerXLSX(file: File, dbColumns: string[], existingClients: any[]): Promise<{ rows: ParsedRow[], columnsMap: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays first to extract headers
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rawRows.length === 0) throw new Error("File is empty");

        const headers = rawRows[0] as string[];
        
        // Auto map columns
        const columnsMap: Record<string, string> = {};
        headers.forEach(h => {
          if (!h) return;
          const match = fuzzyMatchColumn(h, dbColumns);
          if (match) columnsMap[h] = match;
        });

        // Get actual data
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const rows: ParsedRow[] = jsonData.map((row: any) => {
          const mapped: Record<string, any> = {};
          let isValid = true;
          let errorMsg = "";

          // Map data based on columnsMap
          Object.keys(columnsMap).forEach(header => {
            const dbCol = columnsMap[header];
            let value = row[header];

            // Resolve client_id if the column mapped to client_id but the data provided was client_code
            if (dbCol === "client_id" && value) {
               const client = existingClients.find(c => c.client_code?.toLowerCase() === value?.toString().toLowerCase());
               if (client) {
                 value = client.id;
               } else {
                 isValid = false;
                 errorMsg = `Client code '${value}' not found`;
               }
            }

            // Convert dates safely
            if (value instanceof Date) {
              value = value.toISOString().split("T")[0];
            } else if (typeof value === "string") {
              // Intercept unformatted DD/MM/YYYY text strings, tolerating accidental spacing
              const dateMatch = value.match(/^\s*(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{4})\s*$/);
              if (dateMatch) {
                const [_, day, month, year] = dateMatch;
                value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
            }

            // Convert empty strings to null to prevent postgres uuid/numeric violations
            if (typeof value === "string" && value.trim() === "") {
               value = null;
            }

            // Clear dirty textual anomalies from strict Date columns so they don't break pg dates
            const DATE_COLUMNS = [
               "iqama_expiry", "joining_date", "dob", "passport_issue_date", 
               "passport_expiry_date", "driving_license_expiry", "date_of_joining", 
               "health_insurance_expiry"
            ];
            
            if (DATE_COLUMNS.includes(dbCol) && typeof value === "string") {
               if (!value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  value = null;
               }
            }

            mapped[dbCol] = value;
          });

          // Check required keys and Auto-fallback for Iqamas
          if (!mapped.iqama_no || String(mapped.iqama_no).trim() === "") {
             mapped.iqama_no = `TEMP-${Math.floor(10000000 + Math.random() * 90000000)}`;
             if (!mapped.iqama_status) {
                mapped.iqama_status = "Processing";
             }
          } else {
             mapped.iqama_no = String(mapped.iqama_no).trim();
          }

          return {
            raw: row,
            mapped,
            status: isValid ? "New" : "Error", // "Update" calculation handled by component checking DB records
            errorMsg: isValid ? undefined : errorMsg
          };
        });

        resolve({ rows, columnsMap });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function generateWorkerTemplate(dbColumns: string[]) {
  const ws = XLSX.utils.aoa_to_sheet([dbColumns]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "WorkersTemplate");
  
  // Create download trigger
  XLSX.writeFile(wb, "worker_bulk_upload_template.xlsx");
}
