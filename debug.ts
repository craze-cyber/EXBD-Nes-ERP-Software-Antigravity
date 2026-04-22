import { parseKeetaWorkbook } from './lib/keeta-parser';
import { generateKeetaSalary } from './lib/keeta-salary-engine';
import * as xlsx from 'xlsx';

const wb = xlsx.readFile('C:\\Users\\User\\Downloads\\RUH_Keeta Salary Sheet Nafouz - FEB - 2026.xlsx');
const parsed = parseKeetaWorkbook(wb);
const manuals = (parsed as any).manualValues || {};
const salaryRows = generateKeetaSalary(parsed, manuals);

// Print full deduction breakdown per driver
console.log('Name                 | Keeta Ded | Food  | Iqama | Traffic | Vehicle | DL      | Advance | Penalty | TOTAL DED | Net Payable');
console.log('─'.repeat(130));
for (const r of salaryRows) {
  const totalDed = r.iqama_renewal + r.traffic_violation + r.vehicle_repairing +
    r.driving_license_cost + r.advance_amount + r.deduction + r.food_compensation + r.internal_penalty;
  console.log(
    `${r.id_name.substring(0,20).padEnd(20)} | ${String(r.deduction).padStart(9)} | ${String(r.food_compensation).padStart(5)} | ${String(r.iqama_renewal).padStart(5)} | ${String(r.traffic_violation).padStart(7)} | ${String(r.vehicle_repairing).padStart(7)} | ${String(r.driving_license_cost.toFixed(2)).padStart(7)} | ${String(r.advance_amount).padStart(7)} | ${String(r.internal_penalty).padStart(7)} | ${totalDed.toFixed(2).padStart(9)} | ${r.total_payable.toFixed(2).padStart(10)}`
  );
}
