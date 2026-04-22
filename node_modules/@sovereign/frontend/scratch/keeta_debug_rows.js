const XLSX = require('xlsx');

const workbook = XLSX.readFile("C:\\Users\\User\\Downloads\\ABHA_Keeta Salary Sheet Nafouz - FEB - 2026.xlsx");
const wsName = workbook.SheetNames.find(n => n.includes("Summary_KSA") || n.includes("Summary")) || workbook.SheetNames[0];
const ws = workbook.Sheets[wsName];

const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

let sum = 0;
for (let r = 0; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!row || row.length < 3) continue;
    let empId = String(row[1] || "").trim();
    if (!empId || empId === "Rider ID" || empId.toLowerCase().includes("total")) continue;
    if (empId.length < 4) continue;

    let net = row[26] ? parseFloat(String(row[26]).replace(/[^\d.-]/g, "")) || 0 : 0;
    
    console.log(`Row ${r}: ID=${empId}, Net=${net}`);
    sum += net;
}
console.log("Total computed sum:", sum);
