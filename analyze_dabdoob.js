const XLSX = require('xlsx');
const path = require('path');

const filePath = "C:\\Users\\User\\OneDrive - METRONET BANGLADESH LIMITED\\Desktop\\EXBD\\Salary & Time sheet\\feb 2026 Timesheets\\Dammam Delivery Report - Dabdoob - FEB'26.xlsx";

try {
  const wb = XLSX.readFile(filePath);
  console.log("Sheets:", wb.SheetNames);

  wb.SheetNames.forEach(name => {
    // Only analyze relevant sheets
    if (!['Drivers orders', 'Drivers report', 'Drivers Out APP', 'Delayed Deliveries Report'].includes(name)) return;

    console.log(`\n--- Sheet: ${name} ---`);
    const ws = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // Print first 10 rows to see headers and first data rows
    data.slice(0, 10).forEach((row, i) => {
      console.log(`Row ${i}:`, JSON.stringify(row));
    });

    // Print last 10 rows to check for "Total" rows
    if (data.length > 10) {
        console.log("...");
        data.slice(-10).forEach((row, i) => {
          console.log(`Row ${data.length - 10 + i}:`, JSON.stringify(row));
        });
    }
  });

} catch (err) {
  console.error("Error reading file:", err.message);
}
