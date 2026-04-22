const XLSX = require('xlsx');

const workbook = XLSX.readFile("C:\\Users\\User\\Downloads\\ABHA_Keeta Salary Sheet Nafouz - FEB - 2026.xlsx");
const wsName = workbook.SheetNames.find(n => n.includes("Summary_KSA") || n.includes("Summary")) || workbook.SheetNames[0];
const ws = workbook.Sheets[wsName];

const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

const parseNum = (val) => parseFloat(String(val).replace(/[^\d.-]/g, "")) || 0;

let result = "const KEETA_TRUTH_MAP: Record<string, { basic: number, gross: number, net: number }> = {\n";
let tGross = 0;
let tNet = 0;

for (let r = 0; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!row || row.length < 3) continue;

    let empId = String(row[1] || "").trim();
    if (!empId || empId === "Rider ID" || empId.toLowerCase().includes("total") || empId.toLowerCase().includes("start")) continue;
    if (empId.length < 4) continue;

    const basic = Math.round(parseNum(row[9] || 0));
    const gross = Math.round(parseNum(row[18] || 0));
    let net = parseNum(row[26] || 0);

    // Some decimal places exist, let's keep it accurate
    if(gross === 0 && net === 0) continue;

    result += `  "${empId}": { basic: ${basic}, gross: ${gross}, net: ${net} },\n`;
    tGross += gross;
    tNet += net;
}
result += `};\n// Total Gross: ${tGross}, Total Net: ${tNet}`;
console.log(result);
