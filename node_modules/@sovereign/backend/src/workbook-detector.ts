import * as XLSX from 'xlsx';

export type WorkbookType = 'delivery' | 'keeta_billing' | 'attendance' | 'standard_salary' | 'universal' | 'unknown' | 'dabdoob_monthly' | 'dabdoob_manpower' | 'giftsgate';

export interface DetectionResult {
  type: WorkbookType;
  parserName: string;
}

export function detectWorkbookType(workbook: XLSX.WorkBook, payrollConfig?: any): DetectionResult {
  const sheets = workbook.SheetNames;
  const sheetsLower = sheets.map(s => s.toLowerCase());

  // 0. Hard parser override set per-client in settings
  if (payrollConfig?.parser_type && payrollConfig.parser_type !== 'auto') {
    const typeMap: Record<string, WorkbookType> = {
      keeta:           'keeta_billing',
      dabdoob:         'dabdoob_monthly',
      dabdoob_monthly: 'dabdoob_monthly',
      dabdoob_manpower: 'dabdoob_manpower',
      giftsgate:       'giftsgate',
      universal:       'universal',
      acc:             'universal',
      firstcry:        'attendance',
    };
    return { type: typeMap[payrollConfig.parser_type] ?? 'unknown', parserName: payrollConfig.parser_type };
  }

  // 1. Initial Data Inspection for specific structural signatures across first few sheets
  const firstSheet = workbook.Sheets[sheets[0]];
  const firstData: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true, defval: '' });
  const topRowsStr = JSON.stringify(firstData.slice(0, 10)).toLowerCase();
  let isManpower = false;
  let isGiftsgate = false;
  let isACC = false;
  let isFC = false;

  for (let sIdx = 0; sIdx < Math.min(4, sheets.length); sIdx++) {
    const sheetData: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheets[sIdx]], { header: 1, raw: true, defval: '' }) as any[][];
    const topStr = JSON.stringify(sheetData.slice(0, 10)).toLowerCase();
    
    for (let i = 0; i < Math.min(10, sheetData.length); i++) {
        const rowStr = (sheetData[i] || []).map((c: any) => String(c ?? '').toLowerCase().trim());
        if (rowStr.includes('salary based on duty days') || rowStr.some((r: any) => r.includes('total number of absent') || r.includes('total dayoff'))) {
            isManpower = true;
        }
        if (rowStr.includes('total payble days') || rowStr.includes('payable days') || rowStr.includes('ot rate') || topStr.includes('gifts gate')) {
            isGiftsgate = true;
        }
        if ((rowStr.includes('emp id') || rowStr.includes('associate name')) && (rowStr.includes('designation') || rowStr.includes('category') || rowStr.includes('iqama'))) {
            isACC = true;
        }
        if (rowStr.some(r => r.includes('muslim/non muslim')) || (topStr.includes('first cry') && rowStr.includes('no') && rowStr.includes('emp. name'))) {
            isFC = true;
        }
    }
  }

  if (isManpower) return { type: 'dabdoob_manpower', parserName: 'Dabdoob Manpower Monthly' };
  if (isGiftsgate) return { type: 'giftsgate', parserName: 'Giftsgate Monthly' };
  if (isACC) return { type: 'universal', parserName: 'ACC' }; // Using universal type but specifically detected
  if (isFC) return { type: 'attendance', parserName: 'FirstCry' };

  // 2. Dabdoob Logistics — Check Region Tabs OR headers
  const dabdoobRegionTabs = ['dammam', 'riyadh', 'jeddah', 'summary_ksa'];
  const hasDabdoobRegions = dabdoobRegionTabs.some(tab => sheetsLower.includes(tab));
  if (hasDabdoobRegions) {
    return { type: 'dabdoob_monthly', parserName: 'Dabdoob Logistics Monthly' };
  }
  if (sheets.includes('Salary_Sheet') || sheets.includes('ERP_Upload_Template')) {
    return { type: 'dabdoob_monthly', parserName: 'Dabdoob Logistics Monthly' };
  }
  if (sheets.includes('Drivers report') || sheets.includes('Drivers orders')) {
    return { type: 'delivery', parserName: 'DabdoobParser' };
  }
  if (topRowsStr.includes('dabdoob') || topRowsStr.includes('dabdoob_delivery') || topRowsStr.includes('your solution')) {
    return { type: 'dabdoob_monthly', parserName: 'Dabdoob Logistics Monthly' };
  }

  // Double check Dabdoob Logistics headers
  for (let i = 0; i < Math.min(10, firstData.length); i++) {
    const rowStr = (firstData[i] || []).map((c: any) => String(c ?? '').toLowerCase().trim());
    if (rowStr.includes('location') && (rowStr.includes('delayed order') || rowStr.includes('order based salary') || rowStr.includes('in app'))) {
      return { type: 'dabdoob_monthly', parserName: 'Dabdoob Logistics Monthly' };
    }
  }

  // 3. Keeta billing — structural signature
  if (sheets.includes('ksa_payable') || sheets.includes('reference')) {
    return { type: 'keeta_billing', parserName: 'KeetaParser' };
  }
  for (const sheetName of sheets) {
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
    const sheetTopStr = JSON.stringify(data.slice(0, 5)).toLowerCase();
    if (sheetTopStr.includes('courier id') && sheetTopStr.includes('rider type')) {
      return { type: 'keeta_billing', parserName: 'KeetaParser' };
    }
  }

  // 4. Client has a saved column template → use universal parser
  if (payrollConfig?.column_map?.emp_id) {
    return { type: 'universal', parserName: 'UniversalParser' };
  }

  // 5. Attendance grid detection (First Cry format — sequential day numbers as headers)
  if (firstData.length > 0) {
    const headers = firstData[0].map((h: any) => String(h).toLowerCase());
    const hasSequentialDates = headers.some(h => h === '1') && headers.some(h => h === '2') && headers.some(h => h === '15');
    if (hasSequentialDates) return { type: 'attendance', parserName: 'AttendanceParser' };

    const salaryKeywords = ['salary', 'basic', 'allowance', 'net', 'payment'];
    if (headers.some(h => salaryKeywords.some(key => h.includes(key)))) {
      return { type: 'standard_salary', parserName: 'StandardPayrollParser' };
    }
  }

  return { type: 'unknown', parserName: 'FuzzyAutoMapper' };
}
