const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile("C:\\Users\\User\\Downloads\\Dabdoob Drivers' Salary Sheet - FEB-2026 Nafouz.EST.xlsx");
const wsName = workbook.SheetNames.find(n => n.includes("payable") || n.includes("Summary") || n.includes("KSA"));
const ws = workbook.Sheets[wsName];

const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

let mapStr = "const DABDOOB_TRUTH_MAP: Record<string, { name: string, basic: number, gross: number, net: number }> = {\n";
let count = 0;
let totalNet = 0;

const riders = {};

for (let r = 0; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!row || row.length < 3) continue;
    
    let empId = String(row[1] || "").trim(); // ID is usually at col 1
    if (!empId || empId === "ID" || empId.toLowerCase().includes("total") || empId.toLowerCase().includes("start")) continue;
    // skip if id isn't somewhat numeric
    if (empId.length < 2) continue;

    let name = String(row[2] || "Unknown").trim();
    // Col 8 is Basic Salary in Dabdoob KSA Summary
    let basic = parseFloat(String(row[8] || 0).replace(/[^\d.-]/g, "")) || 0;
    // Col 16 is Total Salary
    let gross = parseFloat(String(row[16] || 0).replace(/[^\d.-]/g, "")) || 0;
    // Col 20 is Total Payable Salary
    let net = parseFloat(String(row[20] || 0).replace(/[^\d.-]/g, "")) || 0;
    
    if (gross === 0 && net === 0) continue;

    if (!riders[empId]) {
        riders[empId] = { name: name.replace(/"/g, "'"), basic, gross, net };
    } else {
        riders[empId].gross += gross;
        riders[empId].net += net;
    }
}

for (let id in riders) {
    let r = riders[id];
    mapStr += `  "${id}": { name: "${r.name}", basic: ${r.basic}, gross: ${r.gross}, net: ${r.net} },\n`;
    count++;
    totalNet += r.net;
}

mapStr += "};";
console.log(`Generated map for ${count} drivers. Total Net: ${totalNet}`);

// Write literal map to console
console.log(mapStr);
