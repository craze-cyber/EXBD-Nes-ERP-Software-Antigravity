const XLSX = require('xlsx');
const fs = require('fs');

const filePath = "C:\\Users\\User\\Downloads\\RUH_Keeta Salary Sheet Nafouz - FEB - 2026.xlsx";

try {
  const wb = XLSX.readFile(filePath, { cellDates: false, raw: true });
  let output = "";
  
  output += "=== WORKBOOK INFO ===\n";
  output += "Sheets: " + JSON.stringify(wb.SheetNames) + "\n\n";

  wb.SheetNames.forEach(name => {
    output += "\n" + "=".repeat(100) + "\n";
    output += `=== Sheet: "${name}" ===\n`;
    output += "=".repeat(100) + "\n";
    const ws = wb.Sheets[name];
    
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    output += `Range: ${ws['!ref']}\n`;
    output += `Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1}\n`;
    
    if (ws['!merges']) {
      output += `\nMerged Cells (${ws['!merges'].length}):\n`;
      ws['!merges'].forEach(m => {
        output += `  ${XLSX.utils.encode_range(m)}\n`;
      });
    }

    const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    
    output += `\n--- ALL ROWS (${data.length} total) ---\n`;
    data.forEach((row, i) => {
      const hasData = row.some(cell => cell !== "" && cell !== null && cell !== undefined);
      if (hasData) {
        output += `Row ${i}: ${JSON.stringify(row)}\n`;
      }
    });
  });

  // Write to file for viewing
  const outPath = "d:\\AI Project\\sovereign-erp\\keeta_analysis.txt";
  fs.writeFileSync(outPath, output, 'utf8');
  console.log("Analysis written to:", outPath);
  console.log("Total size:", output.length, "chars");

} catch (err) {
  console.error("Error reading file:", err.message);
}
