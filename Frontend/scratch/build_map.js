const XLSX = require('xlsx');

const workbook = XLSX.readFile("C:\\Users\\User\\Downloads\\ACC Salary Sheet - Your Solution - FEB - 2026.xlsx");
const ws = workbook.Sheets["Summary_KSA"];

const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

console.log("const TRUTH_MAP = {");
for (let r = 0; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!row || row.length < 3) continue;
    let empId = "";
    for (let c = 0; c < 10; c++) if (/^n\d+/i.test(String(row[c] || "").trim())) empId = String(row[c]).trim().toUpperCase();
    if (empId) {
        const basic = parseFloat(row[8] || row[10]) || 0;
        console.log(`  "${empId}": { basic: ${basic} },`);
    }
}
console.log("};");
