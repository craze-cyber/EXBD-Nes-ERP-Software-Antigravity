const XLSX = require('xlsx');
const wb = XLSX.readFile("C:\\Users\\User\\Downloads\\ACC Salary Sheet - Your Solution - FEB - 2026.xlsx");

const wsNames = wb.SheetNames;
console.log("ACC Sheets:", wsNames);

const wsSum = wb.Sheets["Summary_KSA"] || wb.Sheets["Riyadh"] || wb.Sheets[wsNames[0]];
const sumData = XLSX.utils.sheet_to_json(wsSum, {header: 1});

console.log("--- ACC SUMMARY AUDIT ---");
for (let r = 0; r < 10; r++) {
    console.log(`Row ${r}:`, sumData[r] ? sumData[r].slice(0, 15) : "null");
}

// Find Total and worker count
let totalNet = 0;
let workerCount = 0;
for (let r = 3; r < sumData.length; r++) {
    const row = sumData[r];
    if (row && String(row[1]).includes("-")) {
        workerCount++;
        totalNet += parseFloat(row[21] || row[22] || row[25] || 0);
    }
}
console.log(`ACC Targets: Workers: ${workerCount}, Total Net: ${totalNet}`);
