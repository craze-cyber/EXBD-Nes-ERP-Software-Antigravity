import * as XLSX from 'xlsx';
import { normalizeDriverName } from './driver-normalizer';

export interface DabdoobParsingResult {
  summary: any[];
  transactions: any[];
  specialOps: any[];
  delays: any[];
  error?: string;
}

/**
 * Multi-sheet parser specialized for Dabdoob's delivery-based payroll workbook.
 */
export async function parseDabdoobWorkbook(
  workbook: XLSX.WorkBook, 
  clientId: string, 
  payPeriod: string,
  config: any
): Promise<DabdoobParsingResult> {
  try {
    const result: DabdoobParsingResult = {
      summary: [],
      transactions: [],
      specialOps: [],
      delays: []
    };

    const excelToDate = (val: any) => {
      if (!val) return null;
      if (typeof val === 'number') {
        return new Date((val - 25569) * 86400 * 1000).toISOString();
      }
      return new Date(val).toISOString();
    };

    const internalRate = config?.internal_rate_per_order || 18;
    const vatRate = config?.internal_vat_rate || 0.15;
    const externalRate = config?.external_rate_per_order || 24.15;

    // STEP 1 - Parse Sheet "Drivers orders" (Summary table)
    const summarySheet = workbook.Sheets['Drivers orders'];
    if (summarySheet) {
      const data: any[][] = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });
      
      // Configuration flags
      const countER = config?.er_counts_as_order || false;

      // Process rows, skipping header (Row 0)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;
        
        // --- INTERNAL DRIVER (Cols A-D) ---
        const internalNameRaw = String(row[0] || "").trim();
        if (internalNameRaw && !internalNameRaw.toLowerCase().startsWith("total") && internalNameRaw !== "undefined") {
          const orders = Number(row[1]) || 0;
          const er = Number(row[2]) || 0;
          const billableUnits = orders + (countER ? er : 0);
          
          if (billableUnits > 0) {
            result.summary.push({
              client_id: clientId,
              pay_period: payPeriod,
              driver_raw_name: internalNameRaw,
              driver_normalized: normalizeDriverName(internalNameRaw),
              total_orders: orders,
              er_count: er,
              driver_type: 'internal',
              rate_per_unit: internalRate * (1 + vatRate), // 15% VAT added for internal
            });
          }
        }

        // --- EXTERNAL DRIVER (Cols G-J -> Indices 6-9) ---
        const externalNameRaw = String(row[6] || "").trim();
        if (externalNameRaw && !externalNameRaw.toLowerCase().startsWith("total") && externalNameRaw !== "undefined") {
          const extOrders = Number(row[7]) || 0;
          const extEr = Number(row[8]) || 0;
          const extBillableUnits = extOrders + (countER ? extEr : 0);
          
          if (extBillableUnits > 0) {
            result.summary.push({
              client_id: clientId,
              pay_period: payPeriod,
              driver_raw_name: externalNameRaw,
              driver_normalized: normalizeDriverName(externalNameRaw),
              total_orders: extOrders,
              er_count: extEr,
              driver_type: 'external',
              rate_per_unit: externalRate, // No VAT for external
            });
          }
        }
      }
    }

    // STEP 2 - Parse Sheet "Drivers report" (Individual transactions)
    const reportSheet = workbook.Sheets['Drivers report'];
    if (reportSheet) {
      const data: any[][] = XLSX.utils.sheet_to_json(reportSheet, { header: 1 });
      
      // Row 0 is headers, data starts from Row 1
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue;
        
        const rawDriver = String(row[5]);
        result.transactions.push({
          parcel_id: String(row[0]),
          parcel_date: excelToDate(row[1]),
          customer_name: row[2],
          area: row[4],
          driver_raw_id: rawDriver,
          driver_normalized: normalizeDriverName(rawDriver),
          payment_method: row[7],
          parcel_value: Number(row[8]) || 0,
          delivery_start: excelToDate(row[9]),
          delivery_finish: excelToDate(row[10]),
          duration_minutes: Number(row[11]) || 0,
          client_id: clientId,
          pay_period: payPeriod
        });
      }
    }

    // STEP 3 - Parse Sheet "Drivers Out APP" (Special ops)
    const specialSheet = workbook.Sheets['Drivers Out APP'];
    if (specialSheet) {
      const data: any[][] = XLSX.utils.sheet_to_json(specialSheet, { header: 1 });
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue;
        result.specialOps.push({
          client_id: clientId,
          pay_period: payPeriod,
          op_date: excelToDate(row[0]),
          parcel_id: row[1],
          area: row[2],
          driver_raw: row[3],
          operation_note: row[4]
        });
      }
    }

    // STEP 4 - Parse Sheet "Delayed Deliveries Report"
    const delaySheet = workbook.Sheets['Delayed Deliveries Report'];
    if (delaySheet) {
      const data: any[][] = XLSX.utils.sheet_to_json(delaySheet, { header: 1 });
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue;
        result.delays.push({
          client_id: clientId,
          pay_period: payPeriod,
          parcel_id: row[0],
          parcel_date: excelToDate(row[1]),
          area: row[2],
          driver_raw: row[3],
          start_time: excelToDate(row[4]),
          finish_time: excelToDate(row[5]),
          duration_minutes: Number(row[6]) || 0
        });
      }
    }

    return result;
  } catch (error: any) {
    console.error("Dabdoob Parser Error:", error);
    return { summary: [], transactions: [], specialOps: [], delays: [], error: error.message };
  }
}
