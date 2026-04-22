const XLSX = require('xlsx');

const workbook = XLSX.readFile("C:\\Users\\User\\Downloads\\ACC Salary Sheet - Your Solution - FEB - 2026.xlsx");

// Let's just output the exact sheet names
console.log("SHEETS:", workbook.SheetNames);

const parseNum = (val) => {
    if (typeof val === 'number') return val;
    const s = String(val || "").trim();
    if (!s) return 0;
    return parseFloat(s.replace(/[^\d.-]/g, "")) || 0;
};

// Target ONLY Summary_KSA
const ksaName = workbook.SheetNames.find(n => n.includes("Summary_KSA") || n.includes("Summary"));
console.log("Found Summary KSA as:", ksaName);

if (ksaName) {
    const ws = workbook.Sheets[ksaName];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    let workers = [];
    let curGross = 0;
    let curNet = 0;
    
    for (let r = 0; r < jsonData.length; r++) {
        const row = jsonData[r];
        if (!row || row.length < 3) continue;

        let empId = "";
        let idCol = -1;
        for (let c = 0; c < Math.min(row.length, 10); c++) {
            const val = String(row[c] || "").trim();
            if (/^n\d+/i.test(val)) {
                empId = val;
                idCol = c;
                break;
            }
        }
        
        if (idCol !== -1) {
            let name = String(row[idCol + 1] || row[2] || "").trim();
            if (name.length < 2 || name.toLowerCase().includes("total")) continue;
            
            const basic = Math.round(parseNum(row[8] || row[10])); 
            const hours = parseNum(row[13] || row[12]);
            const rawNet = parseNum(row[21] || row[14] || row[17]);
            const net = Math.round(rawNet);
            
            if (net > 0 || hours > 0) {
                curGross += basic;
                curNet += net;
                workers.push({ id: empId, name: name, basic, hours, net });
            }
        }
    }
    console.log("Summary KSA parsed:", workers.length, "workers");
    console.log("Total Gross:", curGross, "Total Net:", curNet);
}
