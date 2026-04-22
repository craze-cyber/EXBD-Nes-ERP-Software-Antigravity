const XLSX = require('xlsx');
const wb = XLSX.readFile("C:\\Users\\User\\Downloads\\ACC Salary Sheet - Your Solution - FEB - 2026.xlsx");

const wsSum = wb.Sheets["Summary_KSA"] || wb.Sheets["Riyadh"] || wb.Sheets[wb.SheetNames[0]];
const sumData = XLSX.utils.sheet_to_json(wsSum, {header: 1});

let totalNet = 0;
let totalGross = 0;
let workerCount = 0;

for (let r = 2; r < sumData.length; r++) {
    const row = sumData[r];
    if (!row || !row[1] || String(row[1]).toLowerCase().includes("total")) continue;
    
    // Check if index 1 has an ID (like N1, N2 etc)
    const id = String(row[1]);
    if (id.startsWith("N") || id.match(/^\d+$/)) {
        workerCount++;
        totalGross += parseFloat(row[8] || 0);
        totalNet += parseFloat(row[14] || 0);
        console.log(`Worker ${workerCount}: ${row[2]} | Basic: ${row[8]} | Hours: ${row[13]} | Net: ${row[14]}`);
    }
}

console.log(`ACC FINAL TARGETS:`);
console.log(`- Workers: ${workerCount}`);
console.log(`- Total Gross: ${totalGross}`);
console.log(`- Total Net: ${totalNet}`);
