const XLSX = require('xlsx');

const workbook = XLSX.readFile("C:\\Users\\User\\Downloads\\Dabdoob Drivers' Salary Sheet - FEB-2026 Nafouz.EST.xlsx");

console.log("Sheet names:", workbook.SheetNames);

const wsName = workbook.SheetNames.find(n => n.includes("payable") || n.includes("Summary") || n.includes("KSA")) || workbook.SheetNames[0];
console.log("Using sheet:", wsName);
const ws = workbook.Sheets[wsName];

const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

// Find headers
let headers = [];
for (let r = 0; r < 5; r++) {
    const row = jsonData[r];
    if (row && (String(row[0]).toLowerCase().includes("id") || String(row[1]).toLowerCase().includes("id") || String(row[3]).toLowerCase().includes("id"))) {
        headers = row;
        break;
    }
}

headers.forEach((h, i) => {
    if (h) console.log(`[${i}] ${h}`);
});

// also print first real row
for (let r = 4; r < 10; r++) {
    if (jsonData[r] && jsonData[r].length > 3) {
        console.log("Example Row:", jsonData[r].slice(0, 20));
        break;
    }
}
