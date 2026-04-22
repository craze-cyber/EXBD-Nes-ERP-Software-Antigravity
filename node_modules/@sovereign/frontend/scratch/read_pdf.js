const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('D:\\Downloads_15_4_2026\\Payslip_2526136987_2026-04 (4).pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
});
