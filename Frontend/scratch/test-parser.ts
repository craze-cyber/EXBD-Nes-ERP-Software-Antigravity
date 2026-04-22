import * as XLSX from "xlsx";
import { parseDabdoobManpowerWorkbook } from "../lib/dabdoob-manpower-parser";

async function main() {
  const wb = XLSX.readFile("C:\\Users\\User\\Downloads\\Dabdoob LABOR Salary Sheet - FEB-2026 Nafouz.EST.xlsx");
  const res = await parseDabdoobManpowerWorkbook(wb, "test", "2026-02", {});
  console.log("Invoice Subtotal:", res.invoice.subtotal);
  console.log("Invoice Grand Total:", res.invoice.grand_total);
  for(let i=0; i<4; i++) {
    const w = res.workers[i];
    console.log("Serial:", w.serial, "Name:", w.name, "Net:", w.net_salary, "Gross:", w.monthly_pay);
  }
}
main();
