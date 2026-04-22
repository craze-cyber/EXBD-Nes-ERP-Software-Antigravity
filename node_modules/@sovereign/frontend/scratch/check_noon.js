const XLSX = require('xlsx');

function checkFile(file) {
    console.log('--- Checking File:', file, '---');
    const wb = XLSX.readFile(file);
    console.log('SheetNames:', wb.SheetNames);
    const sheetName = wb.SheetNames.includes('Summary_KSA') ? 'Summary_KSA' : wb.SheetNames[0];
    console.log('Selected Sheet:', sheetName);
    const sheet = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
    console.log('Rows in sheet:', jsonData.length);

    let headerRowIdx = -1;
    for (let i = 0; i < 20; i++) {
       const row = jsonData[i] || [];
       const text = row.join(' ').toLowerCase();
       if (text.includes('iqama')) {
           headerRowIdx = i;
           break;
       }
    }
    console.log('headerRowIdx:', headerRowIdx);
    if (headerRowIdx !== -1) {
        const headers = jsonData[headerRowIdx].map(x => (x || '').toString().trim().toLowerCase());
        console.log('Headers:', headers);
        let iqamaCol = headers.findIndex(h => h?.includes('iqama'));
        let nameCol = headers.findIndex(h => h?.includes('name'));
        console.log('iqamaCol:', iqamaCol, 'nameCol:', nameCol);
        
        let count = 0;
        for(let i=headerRowIdx+1; i<jsonData.length; i++) {
            const iq = (jsonData[i][iqamaCol] || '').toString().trim();
            const nm = (jsonData[i][nameCol] || '').toString().trim();
            if (iq) {
                if (count < 2) console.log('Data Iq:', iq, 'Name:', nm);
                count++;
            }
        }
        console.log('Total extracted iqamas:', count);
    }
}

checkFile('C:/Users/User/Downloads/Noon Min Salary Sheet (21 JAN to 20 FEB)- Your Solution - FEB 2026.xlsx');
checkFile('C:/Users/User/Downloads/Noon Supermall Salary Sheet (21 Jan to 20 FEB)- Your Solution - 2026.xlsx');
