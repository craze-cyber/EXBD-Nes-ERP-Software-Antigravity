const XLSX = require('xlsx');

const filePath = "C:\\Users\\User\\OneDrive - METRONET BANGLADESH LIMITED\\Desktop\\EXBD\\Refined Salary SHeet\\Dabdoob Logistic_ Salary Sheet - FEB-2026 Nafouz.EST.xlsx";

try {
    const workbook = XLSX.readFile(filePath);
    console.log("Sheet Names:", workbook.SheetNames);
    
    const sheetName = 'ksa_payable';
    if (workbook.Sheets[sheetName]) {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0, defval: "" });
        console.log(`\nSheet: ${sheetName} Sample:`);
        data.slice(0, 5).forEach((row, i) => {
            console.log(`Row ${i}:`, JSON.stringify(row));
        });
    }
} catch (error) {
    console.error("Error reading XLSX:", error.message);
}
