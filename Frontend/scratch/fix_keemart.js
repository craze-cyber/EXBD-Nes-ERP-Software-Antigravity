const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/User/Downloads/Keemart Salary Sheet - FEB-2026.xlsx');
const sheetName = wb.SheetNames.includes("Summary_KSA") ? "Summary_KSA" : (wb.SheetNames.includes("ksa_payable") ? "ksa_payable" : wb.SheetNames[0]);
const sheet = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, {header: 1, raw: true});

let hRow = -1;
for(let i=0; i<10; i++){
  if ((rows[i]||[]).join(' ').toLowerCase().includes('iqama')) hRow = i;
}
const headers = rows[hRow].map(x => (x || '').toString().trim().toLowerCase());
let iqamaCol = headers.findIndex(h => h.includes('iqama'));
let totalStaffCol = headers.findIndex(h => h.includes('⑩total staff'));
let totalServiceCol = headers.findIndex(h => h.includes('⑫total service fee'));
let payableCol = headers.findIndex(h => h.includes('⑭total payable amount'));

console.log('Iqama', iqamaCol, 'Staff Remuneration', totalStaffCol, 'Service Fee', totalServiceCol, 'Payable Inc', payableCol);

let sumStaff = 0, sumService = 0, sumPayable = 0;
const map = [];
for(let i=hRow+1; i<rows.length; i++) {
   const r = rows[i];
   if (!r || !r[iqamaCol]) continue;
   sumStaff += Number(r[totalStaffCol]||0);
   sumService += Number(r[totalServiceCol]||0);
   sumPayable += Number(r[payableCol]||0);
   map.push(`  "${r[iqamaCol]}": { net: ${Number(r[totalStaffCol]||0).toFixed(2)} },`);
}
console.log('Sums => Staff:', sumStaff.toFixed(2), 'Service:', sumService.toFixed(2), 'Payable Inc VAT:', sumPayable.toFixed(2));
require('fs').writeFileSync('scratch/keemart_fix.js', map.join('\n'));
