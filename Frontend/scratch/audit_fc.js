const XLSX = require('xlsx');
const wb = XLSX.readFile("C:\\Users\\User\\Downloads\\Firstcry Salary Sheet - Your Solution - FEB - 2026.xlsx");
console.log("Sheet Names:", wb.SheetNames);

wb.SheetNames.forEach(s => {
    const ws = wb.Sheets[s];
    const data = XLSX.utils.sheet_to_json(ws, {header: 1}).slice(0, 5);
    console.log(`--- Sheet: ${s} ---`);
    data.forEach(row => console.log(JSON.stringify(row)));
});
