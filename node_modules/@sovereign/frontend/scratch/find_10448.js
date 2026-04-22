const XLSX = require('xlsx');
const wb = XLSX.readFile("C:\\Users\\User\\Downloads\\ACC Salary Sheet - Your Solution - FEB - 2026.xlsx");

const ws = wb.Sheets["Summary_KSA"] || wb.Sheets["Riyadh"];
const data = XLSX.utils.sheet_to_json(ws, {header: 1});

console.log("--- SEARCHING FOR 10448 ---");
for (let c = 0; c < 30; c++) {
    let colSum = 0;
    for (let r = 2; r < 25; r++) {
       if (data[r] && data[r][c]) {
           const val = parseFloat(String(data[r][c]).replace(/[^\d.-]/g, "")) || 0;
           colSum += val;
       }
    }
    if (Math.round(colSum) === 10448 || Math.round(colSum) === 15548) {
        console.log(`[FOUND TARGET] Sum in Column ${c} is ${colSum}`);
        console.log(`  Example at Row 2: ${data[2][c]}`);
    }
}
