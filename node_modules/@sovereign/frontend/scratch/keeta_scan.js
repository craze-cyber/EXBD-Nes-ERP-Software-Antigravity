const XLSX = require('xlsx');

const workbook = XLSX.readFile("C:\\Users\\User\\Downloads\\ABHA_Keeta Salary Sheet Nafouz - FEB - 2026.xlsx");

// Look for a summary sheet, or if not found, use the first sheet
const wsName = workbook.SheetNames.find(n => n.includes("Summary") || n.includes("KSA") || n.includes("Payable")) || workbook.SheetNames[0];
console.log("Using sheet:", wsName, "from", workbook.SheetNames);

const ws = workbook.Sheets[wsName];
const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

const parseNum = (val) => parseFloat(String(val).replace(/[^\d.-]/g, "")) || 0;

let result = "const KEETA_TRUTH_MAP: Record<string, { basic: number, hours: number, net: number, name: string }> = {\n";
let tGross = 0;
let tNet = 0;

// Try to auto-detect ID and basic columns
for (let r = 0; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!row || row.length < 3) continue;

    let empId = "";
    let idCol = -1;
    for (let c = 0; c < row.length; c++) {
        // IDs usually start with 'A', 'N', 'D', 'K', etc. Let's just find anything resembling an ID.
        // ABHA Keeta uses D001, N001?
        // Let's print out the first 5 rows to be safe.
        if (r < 5 && c === 0) console.log(`R${r}:`, row.slice(0, 10).map(s => String(s).trim()).join(" | "));
        
        const val = String(row[c]).trim();
        // Look for digit-based IDs like D123 or just numeric if they are purely numbers
        // Let's rely on printing first to see the exact format!
    }
}
// Just dump the first 15 rows
for (let r = 0; r < Math.min(15, jsonData.length); r++) {
   console.log(`Row ${r}:`, jsonData[r].slice(0,10));
}
