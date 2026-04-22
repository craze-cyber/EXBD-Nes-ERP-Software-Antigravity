const XLSX = require('xlsx');

function parseDabdoob(sheet) {
  let jsonData = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
  });

  let headerRowIndex = -1;
  const hMap = new Map();

  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const rowKeys = (jsonData[i] || []).map(c => String(c ?? "").trim().toLowerCase().replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' '));
    const hasId = rowKeys.some(k => k.includes("emp id") || k.includes("id") || k.includes("employee id"));
    const hasLoc = rowKeys.some(k => k.includes("location") || k.includes("iqama"));

    if (hasId && hasLoc) {
      headerRowIndex = i;
      rowKeys.forEach((key, idx) => { if (key) hMap.set(key, idx); });
      break;
    }
  }

  const dataRows = jsonData.slice(headerRowIndex + 1);

  const col = (...aliases) => {
    for (const a of aliases) { 
        for (const [key, idx] of hMap.entries()) {
            if (key.includes(a.toLowerCase())) return idx;
        }
    }
    return -1;
  };

  const idxId            = col("emp id", "id", "employee id");
  const idxBasic         = col("basic salary", "basic", "total wage");
  const idxDutyDays      = col("number of duty", "duty days", "duty");
  const idxDayoff        = col("total dayoff", "dayoff", "off days");
  const idxAbsent        = col("total number of absent", "absent");
  const idxSalaryDuty    = col("salary based on duty", "duty salary");
  const idxAbsentAmt     = col("absent amount", "absent deduction");
  const idxOtHours       = col("total overtime (hours)", "overtime hours", "ot hours");
  const idxOtAmt         = col("ot amount", "overtime amount", "ot");
  const idxTotalSalary   = col("total salary", "gross salary"); // Gross
  const idxIncentive     = col("incentive");
  const idxOtherAllow    = col("other allowance", "allowance");
  const idxAdvance       = col("advance");
  const idxDeduct        = col("deduction");
  const idxTotalPayable  = col("total payable salary", "payable salary", "net salary");

  console.log("Mapped Columns:");
  console.log({idxId, idxBasic, idxDutyDays, idxSalaryDuty, idxAbsentAmt, idxOtAmt, idxTotalSalary, idxTotalPayable});

  for (let i = 0; i < Math.min(5, dataRows.length); i++) {
    const row = dataRows[i];
    const rawId = idxId >= 0 ? row[idxId] : null;
    if (!row || !rawId) continue; 
    
    // Simulate what the TS code does exactly!
    const rawIdStr = String(rawId).trim().toLowerCase();
    if (rawIdStr === "" || rawIdStr === "total" || rawIdStr === "grand total") continue;

    const basic_salary    = idxBasic >= 0      ? Number(row[idxBasic])      || 0 : 0;
    const duty_days       = idxDutyDays >= 0   ? Number(row[idxDutyDays])   || 0 : 0;
    const absent_days     = idxAbsent >= 0     ? Number(row[idxAbsent])     || 0 : 0;
    
    let salary_based_on_duty = idxSalaryDuty >= 0 ? Number(row[idxSalaryDuty]) || 0 : 0;
    let absent_amount        = idxAbsentAmt >= 0 ? Number(row[idxAbsentAmt]) || 0 : 0;
    const ot_hours           = idxOtHours >= 0 ? Number(row[idxOtHours]) || 0 : 0;
    let ot_amount            = idxOtAmt >= 0 ? Number(row[idxOtAmt]) || 0 : 0;
    const incentive          = idxIncentive >= 0 ? Number(row[idxIncentive]) || 0 : 0;
    const other_allowance    = idxOtherAllow >= 0 ? Number(row[idxOtherAllow]) || 0 : 0;
    const advance            = idxAdvance >= 0 ? Number(row[idxAdvance]) || 0 : 0;
    const deduction          = idxDeduct >= 0 ? Number(row[idxDeduct]) || 0 : 0;

    let total_payable_raw    = idxTotalPayable >= 0 ? Number(row[idxTotalPayable]) || 0 : 0;
    let total_salary_raw     = idxTotalSalary >= 0 ? Number(row[idxTotalSalary]) || 0 : 0;

    if (!salary_based_on_duty && basic_salary > 0 && duty_days > 0) {
      salary_based_on_duty = (basic_salary / 30) * duty_days; 
    }
    if (!absent_amount && basic_salary > 0 && absent_days > 0) {
      absent_amount = (basic_salary / 30) * absent_days;
    }
    if (!ot_amount && ot_hours > 0 && basic_salary > 0) {
      const hourly_rate = (basic_salary / 240) * 1.5;
      ot_amount = ot_hours * hourly_rate;
    }

    let calculated_total_salary = total_salary_raw;
    if (!calculated_total_salary) {
      calculated_total_salary = salary_based_on_duty - absent_amount + ot_amount;
    }
    
    let total_payable = total_payable_raw;
    if (!total_payable) {
      total_payable = calculated_total_salary + incentive + other_allowance - advance - deduction;
    }

    console.log(rawId, '-> raw_tot:', total_salary_raw, 'raw_net:', total_payable_raw, 'final_tot:', calculated_total_salary, 'final_net:', total_payable);
  }
}

const wb = XLSX.readFile('C:\\\\Users\\\\User\\\\Downloads\\\\Dabdoob LABOR Salary Sheet - FEB-2026 Nafouz.EST.xlsx');
parseDabdoob(wb.Sheets[wb.SheetNames[0]]);
