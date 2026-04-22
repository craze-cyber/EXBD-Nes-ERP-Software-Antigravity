const XLSX = require('xlsx');
const wb = XLSX.readFile("C:\\Users\\User\\Downloads\\ACC Salary Sheet - Your Solution - FEB - 2026.xlsx");

console.log("--- SYSTEM VISIBILITY TEST ---");
wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    console.log(`Sheet: ${sheetName} | Rows Found: ${jsonData.length}`);
    
    // Scan Row 2-10 specifically
    for (let r = 0; r < Math.min(jsonData.length, 15); r++) {
        const row = jsonData[r];
        const rowStr = (row || []).join(" | ");
        console.log(`  Row ${r}: ${rowStr.substring(0, 50)}...`);
        
        const hasN = (row || []).some(cell => String(cell).toLowerCase().startsWith("n") && /\d/.test(String(cell)));
        if (hasN) console.log(`    >>> WORKER ID DETECTED AT ROW ${r}`);
    }
});
