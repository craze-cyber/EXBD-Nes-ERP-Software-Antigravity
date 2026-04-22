const XLSX = require('xlsx');

function processACCPayroll(workbook) {
  let bestResult = {
    workers: [],
    client_name: "ACC",
    pay_period: "",
    attendance: [],
    totals: { gross: 0, net: 0 }
  };

  const parseNum = (val) => {
    if (typeof val === 'number') return val;
    const s = String(val || "").trim();
    if (!s) return 0;
    return parseFloat(s.replace(/[^\d.-]/g, "")) || 0;
  };

  // 🔍 DIGIT-LOCK OMNI SCANNER
  workbook.SheetNames.forEach(sheetName => {
    const ws = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    
    const currentWorkers = [];
    let currentGross = 0;
    let currentNet = 0;

    for (let r = 0; r < jsonData.length; r++) {
      const row = jsonData[r];
      if (!row || row.length < 3) continue;

      let empId = "";
      let name = "";
      let idCol = -1;

      // 1. Target strictly 'N' followed by a digit (N1, N2...)
      for (let c = 0; c < Math.min(row.length, 10); c++) {
        const val = String(row[c] || "").trim();
        if (/^n\d+/i.test(val)) {
            empId = val;
            idCol = c;
            break;
        }
      }

      if (idCol !== -1) {
        name = String(row[idCol + 1] || row[2] || "").trim();
        if (name.length < 2 || name.toLowerCase().includes("total")) continue;

        const basic = parseNum(row[8] || row[10]); 
        const hours = parseNum(row[13] || row[12]);
        // The 10,448 target is in Column 21
        const net = parseNum(row[21] || row[14] || row[17]);

        if (net > 0 || hours > 0) {
            currentGross += basic;
            currentNet += net;
            currentWorkers.push({
                serial: currentWorkers.length + 1,
                emp_id: empId,
                name: name,
                position: "Labor",
                total_hours: hours,
                hourly_rate: Number((basic / 208).toFixed(4)),
                net_payable: net,
                basic_salary: basic,
                _row: row
            });
        }
      }
    }

    if (currentWorkers.length > bestResult.workers.length) {
      bestResult.workers = currentWorkers;
      bestResult.totals = { gross: currentGross, net: currentNet };
    }
  });

  return bestResult;
}

const wb = XLSX.readFile("C:\\Users\\User\\Downloads\\ACC Salary Sheet - Your Solution - FEB - 2026.xlsx");
const result = processACCPayroll(wb);
console.log("Total gross:", result.totals.gross);
console.log("Total net:", result.totals.net);
console.log("Workers length:", result.workers.length);
if(result.workers.length > 0) {
    console.log("First worker:", result.workers[0]);
    console.log("Last worker:", result.workers[result.workers.length-1]);
}
