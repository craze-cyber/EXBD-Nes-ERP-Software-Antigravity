const XLSX = require('xlsx');
const fs = require('fs');

const files = [
  { path: 'C:/Users/User/Downloads/Keemart Salary Sheet - FEB-2026.xlsx', name: 'KEEMART' },
  { path: 'C:/Users/User/Downloads/Noon Min Salary Sheet (21 JAN to 20 FEB)- Your Solution - FEB 2026.xlsx', name: 'NOON_MIN' },
  { path: 'C:/Users/User/Downloads/Noon Supermall Salary Sheet (21 Jan to 20 FEB)- Your Solution - 2026.xlsx', name: 'NOON_SUPER' },
  { path: 'C:/Users/User/Downloads/Dabdoob_Manpower_Payroll_Template.xlsx', name: 'DABDOOB_MANPOWER' }
];

let output = '';

function processSheet(file) {
    try {
        const wb = XLSX.readFile(file.path);
        const sn = wb.SheetNames.includes("Summary_KSA") ? "Summary_KSA" : wb.SheetNames.includes("ksa_payable") ? "ksa_payable" : wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], {header: 1, raw: true});
        
        let headerRowIdx = -1;
        for (let i = 0; i < 20; i++) {
           const row = rows[i] || [];
           const text = row.join(" ").toLowerCase();
           if (text.includes("iqama") || text.includes("id")) {
               headerRowIdx = i;
               break;
           }
        }
        
        if (headerRowIdx === -1) {
            output += `Could not find headers for ${file.name} in sheet ${sn}\n`;
            return;
        }
        
        const headers = rows[headerRowIdx].map(x => (x || '').toString().trim().toLowerCase());
        const iqamaCol = headers.findIndex(h => h.includes('iqama'));
        
        let totalPayableCol = headers.findIndex(h => h === 'total payable' || h === 'net salary');
        if (totalPayableCol === -1) totalPayableCol = headers.findIndex(h => h.includes('total payable amount') || h.includes('total payable salary'));

        output += `\n=== ${file.name} ===\n`;
        output += `Iqama Col: ${iqamaCol}, Total Payable Col: ${totalPayableCol} ("${headers[totalPayableCol]}")\n`;
        
        let validRows = 0;
        let sum = 0;
        let mapEntries = [];
        
        for (let i = headerRowIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            
            const iqama = row[iqamaCol];
            let net = row[totalPayableCol];
            
            if (iqama && net !== undefined && !isNaN(net)) {
                mapEntries.push(`  "${iqama.toString().trim()}": { net: ${Number(net).toFixed(2)} },`);
                sum += Number(net);
                validRows++;
            }
        }
        
        output += `Total rows extracted: ${validRows}, Total Net Sum: ${sum.toFixed(2)}\n`;
        if (validRows > 0) {
            output += `export const ${file.name}_TRUTH_MAP: Record<string, {net: number}> = {\n${mapEntries.join('\n')}\n};\n`;
        }
    } catch(e) {
        output += `Error processing ${file.name}: ${e.message}\n`;
    }
}

for (const f of files) {
   processSheet(f);
}
fs.writeFileSync('scratch/maps_output.txt', output);
