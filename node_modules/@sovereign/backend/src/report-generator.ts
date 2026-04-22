import * as XLSX from "xlsx";

/**
 * Export data to XLSX and trigger browser download.
 */
export function exportToXLSX(data: Record<string, any>[], fileName: string, sheetName = "Report") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * Export data to CSV and trigger browser download.
 */
export function exportToCSV(data: Record<string, any>[], fileName: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map(row => headers.map(h => {
      const val = row[h] ?? "";
      return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
    }).join(","))
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate a printable PDF-like invoice in a new window.
 */
export function exportInvoicePDF(invoice: {
  clientName: string;
  period: string;
  workers: { name: string; empId: string; position: string; netSalary: number }[];
  subtotal: number;
  vat: number;
  grandTotal: number;
}) {
  const rows = invoice.workers.map((w, i) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${i + 1}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${w.empId}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${w.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${w.position}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${w.netSalary.toFixed(2)}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html><head><title>Invoice - ${invoice.clientName}</title>
<style>
  body{font-family:Inter,system-ui,sans-serif;padding:40px;color:#1a1a1a;max-width:800px;margin:0 auto}
  h1{font-size:24px;margin-bottom:5px}
  .meta{color:#666;font-size:13px;margin-bottom:30px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#f5f5f5;padding:10px 8px;text-align:left;font-weight:700;border-bottom:2px solid #ddd}
  .totals{margin-top:20px;text-align:right;font-size:14px}
  .totals div{padding:4px 0}
  .grand{font-size:18px;font-weight:700;color:#059669;border-top:2px solid #059669;padding-top:8px;margin-top:8px}
  @media print{body{padding:20px}}
</style></head><body>
  <h1>INVOICE</h1>
  <p class="meta">Client: <strong>${invoice.clientName}</strong> | Period: <strong>${invoice.period}</strong></p>
  <table>
    <thead><tr><th>#</th><th>EMP ID</th><th>Name</th><th>Position</th><th style="text-align:right">Amount (SAR)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div>Subtotal: <strong>SAR ${invoice.subtotal.toFixed(2)}</strong></div>
    <div>VAT (15%): <strong>SAR ${invoice.vat.toFixed(2)}</strong></div>
    <div class="grand">Grand Total: SAR ${invoice.grandTotal.toFixed(2)}</div>
  </div>
  <script>window.onload=function(){window.print()}</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}
