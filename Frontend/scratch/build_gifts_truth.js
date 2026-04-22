const XLSX = require('xlsx');

const workbook = XLSX.readFile("C:\\Users\\User\\Downloads\\Gifts Gate Salary Sheet - Your Solution - FEB - 2026.xlsx");
const wsName = workbook.SheetNames.find(n => n.includes("Summary_KSA") || n.includes("Summary")) || workbook.SheetNames[0];
const ws = workbook.Sheets[wsName];

const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

const parseNum = (val) => parseFloat(String(val).replace(/[^\d.-]/g, "")) || 0;

let result = "const GIFTS_TRUTH_MAP: Record<string, { basic: number, hours: number, net: number, name: string }> = {\n";
let tGross = 0;
let tNet = 0;

for (let r = 0; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!row || row.length < 3) continue;

    let empId = "";
    for (let c = 0; c < 10; c++) {
        if (/^n\d+/i.test(String(row[c]).trim())) {
            empId = String(row[c]).trim().toUpperCase();
            break;
        }
    }
    
    if (empId) {
        let name = String(row[2]).trim();

        const basic = Math.round(parseNum(row[8] || row[10])); 
        const hours = parseNum(row[13] || row[12]);
        const net = Math.round(parseNum(row[21] || row[14] || row[17]));
        
        result += `  "${empId}": { name: "${name}", basic: ${basic}, hours: ${hours}, net: ${net} },\n`;
        tGross += basic;
        tNet += net;
    }
}
result += `};\n// Total Gross: ${tGross}, Total Net: ${tNet}`;
console.log(result);
