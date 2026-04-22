const XLSX = require('xlsx');

const workbook = XLSX.readFile("C:\\Users\\User\\Downloads\\ABHA_Keeta Salary Sheet Nafouz - FEB - 2026.xlsx");
const wsName = workbook.SheetNames.find(n => n.includes("Summary_KSA") || n.includes("Summary")) || workbook.SheetNames[0];
const ws = workbook.Sheets[wsName];

const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

// Find headers
let headers = [];
for (let r = 0; r < 5; r++) {
    const row = jsonData[r];
    if (row && row[0] === "Region" || row[1] === "Rider ID") {
        headers = row;
        break;
    }
}

headers.forEach((h, i) => {
    if (h) console.log(`[${i}] ${h}`);
});

let sumTotalPayable = 0;
let payableIndex = headers.findIndex(h => /total amount|total payable|net salary|disburse/i.test(String(h)));
console.log("Found Total Payable at index:", payableIndex);

// Let's just sum it based on the name of the column that might have total payable.
for (let r = 0; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!row || row.length < 3) continue;
    let empId = String(row[1] || "").trim();
    if (!empId || empId === "Rider ID" || empId.toLowerCase().includes("total")) continue;
    
    // Check if the row has data
    if (empId.length < 4) continue;
    
    let tp = row[payableIndex] ? parseFloat(String(row[payableIndex]).replace(/[^\d.-]/g, "")) || 0 : 0;
    
    // Also try checking ALL columns at the end
    let manualTP = row[26] ? parseFloat(String(row[26]).replace(/[^\d.-]/g, "")) || 0 : 0;
    
    // And actually, what about 33158.85? Let's check which column sums to that!
    // Try to sum every single column for these IDs!
}

// Find exactly which column sums to ~33158.85
let colSums = {};
let count = 0;
for (let r = 0; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!row || row.length < 3) continue;
    let empId = String(row[1] || "").trim();
    if (!empId || empId === "Rider ID" || empId.toLowerCase().includes("total")) continue;
    if (empId.length < 4) continue;

    count++;
    for(let c = 0; c < row.length; c++) {
       let val = row[c] ? parseFloat(String(row[c]).replace(/[^\d.-]/g, "")) || 0 : 0;
       if (!colSums[c]) colSums[c] = 0;
       colSums[c] += val;
       
       if (val && empId === "1760443015480740") {
          // print out values for first driver
          // console.log(`Driver 1 col ${c}: ${val}`);
       }
    }
}

console.log("Sums:");
for(let c in colSums) {
    if (colSums[c] > 0) {
        console.log(`[${c}] ${headers[c] || 'Unknown'}: ${colSums[c]}`);
    }
}

