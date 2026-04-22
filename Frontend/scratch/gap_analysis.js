const XLSX = require('xlsx');
const wb = XLSX.readFile("C:\\Users\\User\\Downloads\\Firstcry Salary Sheet - Your Solution - FEB - 2026.xlsx");

// Get Summary Data
const wsSum = wb.Sheets["Summary_KSA"] || wb.Sheets["Riyadh"];
const sumData = XLSX.utils.sheet_to_json(wsSum, {header: 1});

// Get Grid Data
const wsGrid = wb.Sheets["ksa_payable"];
const gridData = XLSX.utils.sheet_to_json(wsGrid, {header: 1});

console.log("--- SIDE-BY-SIDE GAP ANALYSIS ---");
for (let r = 4; r < 12; r++) {
    const sumRow = sumData[r-1]; // Summary starts at Row 3 (index 2) or 4?
    const gridRow = gridData[r];
    
    if (!gridRow || !sumRow) continue;
    
    // Comparison of Paid Days and Total Pay
    console.log(`Worker: ${gridRow[2]}`);
    console.log(`  GRID: Absents(Col 40): ${gridRow[40]} | OT: ${gridRow[38]}`);
    console.log(`  SUMMARY: PaidDays(Col 14): ${sumRow[14]} | Total: ${sumRow[25]}`);
}
