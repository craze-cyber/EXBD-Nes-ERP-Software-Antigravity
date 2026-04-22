const XLSX = require('xlsx');
const wb = XLSX.readFile("C:\\Users\\User\\Downloads\\Firstcry Salary Sheet - Your Solution - FEB - 2026.xlsx");
const ws = wb.Sheets["ksa_payable"] || wb.Sheets["ksa checklist"];
const jsonData = XLSX.utils.sheet_to_json(ws, {header: 1});

console.log("--- FINAL ABSENT AUDIT ---");
for (let r = 4; r < 12; r++) {
    const row = jsonData[r];
    if (!row) continue;
    console.log(`${row[2]} | Absents (Col 40): ${row[40]}`);
}
