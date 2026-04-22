const XLSX = require('xlsx');
const wb = XLSX.readFile("C:\\Users\\User\\Downloads\\Firstcry Salary Sheet - Your Solution - FEB - 2026.xlsx");

wb.SheetNames.forEach(s => {
    const ws = wb.Sheets[s];
    const jsonData = XLSX.utils.sheet_to_json(ws, {header: 1});
    console.log(`\n=== SHEET: ${s} ===`);
    
    // Find worker Mohammad Maniruzzaman
    for (let r = 0; r < jsonData.length; r++) {
        const row = jsonData[r];
        const rowStr = JSON.stringify(row);
        if (rowStr.includes("Mohammad Maniruzzaman")) {
             console.log(`Found Mohammad at Row ${r}:`);
             console.log(rowStr);
        }
    }
});
