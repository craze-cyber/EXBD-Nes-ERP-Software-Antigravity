const XLSX = require('xlsx');
const wb = XLSX.readFile("C:\\Users\\User\\Downloads\\ACC Salary Sheet - Your Solution - FEB - 2026.xlsx");

// let's print the sheet names
console.log("Sheet names:");
console.log(wb.SheetNames);

const ws = wb.Sheets["Summary_KSA"] || wb.Sheets["Riyadh"];
if (ws) {
    const data = XLSX.utils.sheet_to_json(ws, {header: 1, raw: true, defval: ""});
    console.log("Rows in Summary_KSA:");
    for(let i=0; i<30; i++) {
         if (data[i]) {
              console.log(`R${i}: ` + JSON.stringify(data[i]));
         }
    }
} else {
    console.log("No Summary_KSA sheet found!");
}
