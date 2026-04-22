const XLSX = require('xlsx');
const fs = require('fs');
const wb = XLSX.readFile('C:/Users/User/Downloads/Keemart Salary Sheet - FEB-2026.xlsx');
let sheet = wb.Sheets['Summary_KSA_final'];
const rows = XLSX.utils.sheet_to_json(sheet, {header: 1, raw: true});
let total = 0;
const map = [];
for(let i=1; i<rows.length; i++) {
   const row = rows[i];
   if (row[3] && !isNaN(row[19])) {
       total += Number(row[19]);
       map.push(`  "${row[3]}": { net: ${Number(row[19]).toFixed(2)} },`);
   }
}
let file = fs.readFileSync('lib/keemart-parser.ts', 'utf8');
const replacement = 'export const KEEMART_TRUTH_MAP: Record<string, {net: number}> = {\n' + map.join('\n') + '\n};';
file = file.replace(/export const KEEMART_TRUTH_MAP[\s\S]*?\};/, replacement);
file = file.replace('workbook.SheetNames.includes("Summary_KSA") ? "Summary_KSA"', 'workbook.SheetNames.includes("Summary_KSA_final") ? "Summary_KSA_final" : workbook.SheetNames.includes("Summary_KSA") ? "Summary_KSA"');
fs.writeFileSync('lib/keemart-parser.ts', file);
console.log('Done! Total from map = ' + total);
