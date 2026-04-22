const XLSX = require('xlsx');
const wb = XLSX.readFile("C:\\Users\\User\\Downloads\\ACC Salary Sheet - Your Solution - FEB - 2026.xlsx");

console.log("--- DEEP SHEET SCAN ---");
wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, {header: 1, range: 0});
    console.log(`Sheet: ${sheetName} | Rows: ${data.length}`);
    
    // Check first 10 rows for workers
    data.slice(0, 15).forEach((row, i) => {
        const rowStr = JSON.stringify(row);
        if (rowStr.includes("N1") || rowStr.includes("Arshad") || rowStr.includes("N4")) {
            console.log(`  [FOUND WORKERS] at Row ${i}: ID=${row[1]}, Name=${row[2]}`);
        }
    });
});
