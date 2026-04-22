import { normalizeDriverName, findMatchingWorker } from './driver-normalizer';

/**
 * Generates ready-to-save payroll records from Dabdoob delivery summaries.
 */
export async function generateDeliveryPayroll(
  summaryRows: any[],
  transactions: any[],
  clientId: string,
  payPeriod: string,
  workers: any[]
) {
  const payrollRows: any[] = [];
  
  // Group summaries by driver normalized name to handle drivers who appear in both Internal and External tables
  const driverGroups = new Map<string, any[]>();
  
  for (const sum of summaryRows) {
    const list = driverGroups.get(sum.driver_normalized) || [];
    list.push(sum);
    driverGroups.set(sum.driver_normalized, list);
  }

  for (const [normalizedName, summaries] of driverGroups.entries()) {
    const worker = findMatchingWorker(normalizedName, workers);
    
    let totalInternalOrders = 0;
    let totalInternalER = 0;
    let totalExternalOrders = 0;
    let totalExternalER = 0;
    let internalEarnings = 0;
    let externalEarnings = 0;
    
    for (const s of summaries) {
      const units = s.total_orders + s.er_count;
      const earnings = units * s.rate_per_unit;
      
      if (s.driver_type === 'internal') {
        totalInternalOrders += s.total_orders;
        totalInternalER += s.er_count;
        internalEarnings += earnings;
      } else {
        totalExternalOrders += s.total_orders;
        totalExternalER += s.er_count;
        externalEarnings += earnings;
      }
    }

    const totalOrders = totalInternalOrders + totalExternalOrders;
    const totalER = totalInternalER + totalExternalER;
    const totalUnits = totalOrders + totalER;
    const grossEarnings = internalEarnings + externalEarnings;

    // Calculate aggregate parcel value from transactions for this driver
    const totalParcelValue = transactions
      .filter(t => t.driver_normalized === normalizedName)
      .reduce((sum, t) => sum + (t.parcel_value || 0), 0);

    const driverType = summaries.length > 1 ? 'Both' : summaries[0].driver_type;

    payrollRows.push({
      client_id: clientId,
      worker_id: worker?.id,
      emp_id: worker?.emp_id || normalizedName,
      worker_name: worker?.name_en || normalizedName,
      pay_period: payPeriod,
      
      extra_columns: {
        total_orders: totalOrders,
        er_count: totalER,
        total_units: totalUnits,
        driver_type: driverType,
        internal_earnings: internalEarnings,
        external_earnings: externalEarnings,
        total_parcel_value: totalParcelValue,
        internal_breakdown: { orders: totalInternalOrders, er: totalInternalER },
        external_breakdown: { orders: totalExternalOrders, er: totalExternalER }
      },
      
      basic_salary: 0,
      other_allowances: grossEarnings, // Actual delivery earnings
      deductions: 0, // Will be calculated by liabilities engine later if needed
      net_salary: grossEarnings,
      
      upload_source: 'xlsx_bulk',
      status: 'draft',
      // Metadata to identify this as a delivery payroll in the UI
      metadata: {
        payroll_style: 'delivery',
        client_name: 'Dabdoob'
      }
    });
  }

  return payrollRows;
}
