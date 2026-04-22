const XLSX = require('xlsx');
const sheet = XLSX.readFile('C:\\\\Users\\\\User\\\\Downloads\\\\Dabdoob LABOR Salary Sheet - FEB-2026 Nafouz.EST.xlsx').Sheets['ksa_payable'];
let jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

let headerRowIndex = 4; // Row 5
let dataRows = jsonData.slice(headerRowIndex + 1);

let sumTotalSalaryRaw = 0;
let sumTotalPayableRaw = 0;
let sumMyTotalSalary = 0;
let sumMyTotalPayable = 0;

for (let r of dataRows) {
  if(!r || !r[1] || r[1] === '') continue;
  let rawStr = String(r[1]).toLowerCase().trim();
  if(rawStr === 'total' || rawStr === 'grand total') continue;

  let basic_salary = Number(r[7]) || 0;
  let duty_days = Number(r[8]) || 0;
  let dayoff = Number(r[9]) || 0;
  let raw_salary_duty = Number(r[10]) || 0;
  let absent_days = Number(r[11]) || 0;
  let raw_absent_amt = Number(r[12]) || 0;
  let ot_hours = Number(r[13]) || 0;
  let raw_ot_amt = Number(r[14]) || 0;
  
  let raw_total_salary = Number(r[15]) || 0;
  let incentive = Number(r[16]) || 0;
  let other = Number(r[17]) || 0;
  let advance = Number(r[19]) || 0;
  let deduction = Number(r[20]) || 0;
  let raw_total_payable = Number(r[21]) || 0;

  // OLD LOGIC (what caused the BUG):
  let bug_total_salary = basic_salary - raw_absent_amt + raw_ot_amt;
  
  // NEW LOGIC (what I just wrote):
  let my_salary_duty = raw_salary_duty || (basic_salary > 0 && duty_days > 0 ? (basic_salary/30 * duty_days) : 0);
  let my_absent_amt = raw_absent_amt || (basic_salary > 0 && absent_days > 0 ? (basic_salary/30 * absent_days) : 0);
  let my_ot_amt = raw_ot_amt || (ot_hours > 0 && basic_salary > 0 ? (basic_salary/240 * 1.5 * ot_hours) : 0);
  
  let my_total_salary = raw_total_salary || (my_salary_duty - my_absent_amt + my_ot_amt);
  let my_total_payable = raw_total_payable || (my_total_salary + incentive + other - advance - deduction);

  sumTotalSalaryRaw += raw_total_salary;
  sumTotalPayableRaw += raw_total_payable;
  sumMyTotalSalary += my_total_salary;
  sumMyTotalPayable += my_total_payable;
}

console.log("EXCEL Total Salary:", sumTotalSalaryRaw);
console.log("EXCEL Total Payable:", sumTotalPayableRaw);
console.log("MY Total Salary:", sumMyTotalSalary);
console.log("MY Total Payable:", sumMyTotalPayable);
