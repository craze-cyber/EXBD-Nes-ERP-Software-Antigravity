const XLSX = require('xlsx');
const wb = XLSX.readFile("C:\\Users\\User\\Downloads\\ACC Salary Sheet - Your Solution - FEB - 2026.xlsx");

console.log("=== ACC WORKER DUMP ===");
let sumGross = 0;
let sumNet = 0;

const sheets = ["Summary_KSA", "Riyadh", "Salary sheet FEB 2026"];
sheets.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const data = XLSX.utils.sheet_to_json(ws, {header: 1, raw: true, defval: ""});
    
    let count = 0;
    for(let r=0; r<data.length; r++) {
        const row = data[r];
        if(!row || row.length < 2) continue;
        
        let empId = "";
        let name = "";
        let nCol = -1;
        for(let c=0; c<row.length; c++) {
            const val = String(row[c]).trim();
            if(/^N\d+$/i.test(val)) {
                empId = val;
                nCol = c;
                break;
            }
        }
        
        if (empId) {
            count++;
            console.log(`Row ${r}: ID=${empId}`);
            
            // Print a subset of the row around the values
            let rowP = "";
            for(let c=0; c<Math.min(row.length, 30); c++) {
                if(row[c] !== "") {
                    rowP += `[${c}]:${row[c]} | `;
                }
            }
            console.log("   Data: " + rowP);
        }
    }
    console.log(`Total Workers found on sheet: ${count}`);
});
