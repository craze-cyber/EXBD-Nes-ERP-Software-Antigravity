const XLSX = require('xlsx');

const workbook = XLSX.readFile("C:\\Users\\User\\Downloads\\ACC Salary Sheet - Your Solution - FEB - 2026.xlsx");

const ws = workbook.Sheets['ksa_payable'];
if (ws) {
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    console.log("=== ksa_payable Columns ===");
    if(data.length > 0) console.log("Headers:", data[0].join(" | "));
    
    let sumOutput = 0;
    
    for (let i = 1; i < Math.min(data.length, 18); i++) {
        let row = data[i];
        let n = String(row[0]);
        if(n.startsWith("N")) {
            let info = [];
            for (let c=0; c < row.length; c++) {
               if(row[c] !== "" && typeof row[c] === 'number') {
                   info.push(`[${c}]=${row[c]}`);
               }
            }
            console.log(`Worker ${n}: ` + info.join(", "));
        }
    }
}
