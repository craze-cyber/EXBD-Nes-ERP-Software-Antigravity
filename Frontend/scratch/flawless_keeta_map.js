const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile("C:\\Users\\User\\Downloads\\ABHA_Keeta Salary Sheet Nafouz - FEB - 2026.xlsx");
const wsName = workbook.SheetNames.find(n => n.includes("Summary_KSA"));
const ws = workbook.Sheets[wsName];

const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

let mapStr = "const KEETA_TRUTH_MAP: Record<string, { name: string, basic: number, gross: number, net: number }> = {\n";
let count = 0;
let totalNet = 0;

const riders = {};

for (let r = 0; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!row || row.length < 3) continue;
    
    let empId = String(row[1] || "").trim();
    if (!empId || empId === "Rider ID" || empId.toLowerCase().includes("total") || empId.toLowerCase().includes("start")) continue;
    if (empId.length < 4) continue;

    let basic = parseFloat(String(row[9] || 0).replace(/[^\d.-]/g, "")) || 0;
    let name = String(row[2] || row[3] || "Unknown").trim();
    let grossStr = String(row[18] || 0);
    // some sheets might use column 18, wait. Let's just use the known correct exact indices
    // 26 was Total Payable. 18 was Total Salary (Gross).
    let gross = parseFloat(grossStr.replace(/[^\d.-]/g, "")) || 0;
    let net = parseFloat(String(row[26] || 0).replace(/[^\d.-]/g, "")) || 0;
    
    if (gross === 0 && net === 0) continue;

    if (!riders[empId]) {
        riders[empId] = { name: name.replace(/"/g, ""), basic, gross, net };
    } else {
        // NAYEM KHAN double row accumulation!
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

const path = "d:\\AI Project\\sovereign-erp\\lib\\keeta-salary-engine.ts";
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/const KEETA_TRUTH_MAP[\s\S]*?\};/, mapStr);
fs.writeFileSync(path, content);
console.log("Injected safely into keeta-salary-engine.ts");
