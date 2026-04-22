const XLSX = require('xlsx');
const workbook = XLSX.readFile("C:\\Users\\User\\Downloads\\Gifts Gate Salary Sheet - Your Solution - FEB - 2026.xlsx");

// Let's log the sheet names just to be sure
console.log("Sheets:", workbook.SheetNames);

// Find the summary sheet or use the first one
const wsName = workbook.SheetNames.find(n => n.includes("Summary") || n.includes("KSA")) || workbook.SheetNames[0];
console.log("Using sheet:", wsName);
const ws = workbook.Sheets[wsName];

const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

const parseNum = (val) => parseFloat(String(val).replace(/[^\d.-]/g, "")) || 0;

let result = "const GIFTS_TRUTH_MAP: Record<string, { basic: number, hours: number, net: number }> = {\n";
let tGross = 0;
let tNet = 0;
let cWorkers = 0;

for (let r = 0; r < Math.min(jsonData.length, 100); r++) {
    const row = jsonData[r];
    if (!row || row.length < 3) continue;

    let empId = "";
    for (let c = 0; c < 10; c++) {
        const val = String(row[c]).trim();
        // Look for N-Count or just some ID format for Gifts gate. Maybe it's "G1", "G2" or "N1", "N2"?
        // Let's just dump row 2 and 3 to see the format before guessing.
        if (r < 10 && c === 0) {
           console.log(`R${r}:`, row.slice(0, 8).map(s => String(s).trim()).join(" | "));
        }
    }
}
