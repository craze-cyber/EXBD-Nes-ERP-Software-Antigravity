const XLSX = require('xlsx');
const wb = XLSX.readFile("C:\\Users\\User\\Downloads\\Firstcry Salary Sheet - Your Solution - FEB - 2026.xlsx");
const ws = wb.Sheets["ksa_payable"] || wb.Sheets["ksa checklist"];
const jsonData = XLSX.utils.sheet_to_json(ws, {header: 1});

console.log("--- WORKER AUDIT (ksa_payable) ---");
for (let r = 4; r < 12; r++) {
    const row = jsonData[r];
    if (!row) continue;
    console.log(`Worker ${r-3}: ${row[2]} | PaidDays: ${row[43]} | OT: ${row[38]}`);
}
