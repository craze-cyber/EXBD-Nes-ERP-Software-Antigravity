"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import { Download, FileText, Users, Receipt, Calendar, BookOpen, AlertTriangle, BarChart3, PieChart } from "lucide-react";
import ReportTable from "@/components/erp/ReportTable";
import { exportToXLSX, exportInvoicePDF } from "@/lib/report-generator";

type ReportType = "payroll" | "workers" | "invoice" | "attendance" | "accounting";

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("payroll");
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  // Data stores
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [workerStats, setWorkerStats] = useState<any>({ total: 0, active: 0, idle: 0, terminated: 0, byNationality: {}, byClient: {}, expiringIqama: [] });
  const [invoiceData, setInvoiceData] = useState<any[]>([]);
  const [accountingData, setAccountingData] = useState<any>({ pl: [], bs: [] });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (activeReport === "payroll") fetchPayroll();
    if (activeReport === "workers") fetchWorkerStats();
    if (activeReport === "invoice") fetchInvoiceData();
    if (activeReport === "accounting") fetchAccounting();
  }, [activeReport, selectedClient, period]);

  const fetchClients = async () => {
    const { data } = await insforge.database.from("clients").select("*").order("legal_name");
    if (data) setClients(data);
  };

  const fetchPayroll = async () => {
    let q = insforge.database.from("payrolls").select("*, workers(name_en, emp_id, occupation_en), clients(legal_name)");
    if (selectedClient) q = q.eq("client_id", selectedClient);
    if (period) q = q.gte("pay_period", `${period}-01`).lte("pay_period", `${period}-28`);
    const { data } = await q;
    setPayrollData((data || []).map((p: any) => ({
      worker_name: p.workers?.name_en || "Unknown",
      emp_id: p.workers?.emp_id || "—",
      client: p.clients?.legal_name || "—",
      position: p.workers?.occupation_en || "—",
      basic: p.basic_salary || 0,
      allowances: (p.food_allowance || 0) + (p.housing_allowance || 0) + (p.transport_allowance || 0) + (p.other_allowances || 0),
      ot: p.ot_amount || 0,
      deductions: p.deductions || 0,
      net: p.net_salary || 0,
    })));
  };

  const fetchWorkerStats = async () => {
    const { data: workers } = await insforge.database.from("workers").select("*, clients(legal_name)");
    if (!workers) return;

    const active = workers.filter(w => w.work_status === "Active" || !w.work_status).length;
    const idle = workers.filter(w => w.work_status === "Idle").length;
    const terminated = workers.filter(w => w.work_status === "Terminated").length;

    const byNat: Record<string, number> = {};
    const byClient: Record<string, number> = {};
    workers.forEach(w => {
      const nat = w.nationality || "Unknown";
      byNat[nat] = (byNat[nat] || 0) + 1;
      const cl = w.clients?.legal_name || "Unassigned";
      byClient[cl] = (byClient[cl] || 0) + 1;
    });

    // Iqama expiry alerts
    const now = new Date();
    const d90 = new Date(now.getTime() + 90 * 86400000);
    const expiring = workers.filter(w => {
      if (!w.iqama_expiry) return false;
      const exp = new Date(w.iqama_expiry);
      return exp <= d90 && exp >= now;
    }).map(w => ({
      name: w.name_en || "Unknown",
      iqama_no: w.iqama_no,
      expiry: w.iqama_expiry,
      days_left: Math.ceil((new Date(w.iqama_expiry).getTime() - now.getTime()) / 86400000),
    })).sort((a, b) => a.days_left - b.days_left);

    setWorkerStats({ total: workers.length, active, idle, terminated, byNationality: byNat, byClient: byClient, expiringIqama: expiring });
  };

  const fetchInvoiceData = async () => {
    const { data: payrolls } = await insforge.database.from("payrolls").select("*, clients(legal_name)");
    if (!payrolls) return;

    const byClient: Record<string, { client: string; workers: number; total: number }> = {};
    payrolls.forEach((p: any) => {
      const cl = p.clients?.legal_name || "Unknown";
      if (!byClient[cl]) byClient[cl] = { client: cl, workers: 0, total: 0 };
      byClient[cl].workers++;
      byClient[cl].total += p.net_salary || 0;
    });

    setInvoiceData(Object.values(byClient).map(c => ({
      ...c,
      vat: c.total * 0.15,
      grand_total: c.total * 1.15,
    })));
  };

  const fetchAccounting = async () => {
    const { data: lines } = await insforge.database.from("journal_lines").select("debit, credit, accounts(code, name, type)");
    if (!lines) return;

    const agg: Record<string, { name: string; type: string; debit: number; credit: number }> = {};
    lines.forEach((l: any) => {
      const code = l.accounts?.code || "?";
      if (!agg[code]) agg[code] = { name: l.accounts?.name, type: l.accounts?.type, debit: 0, credit: 0 };
      agg[code].debit += l.debit || 0;
      agg[code].credit += l.credit || 0;
    });

    const entries = Object.entries(agg);
    const pl = entries.filter(([_, v]) => v.type === "revenue" || v.type === "expense").map(([code, v]) => ({
      code, name: v.name, type: v.type,
      amount: v.type === "revenue" ? v.credit - v.debit : v.debit - v.credit
    }));
    const bs = entries.filter(([_, v]) => v.type === "asset" || v.type === "liability" || v.type === "equity").map(([code, v]) => ({
      code, name: v.name, type: v.type,
      balance: v.type === "asset" ? v.debit - v.credit : v.credit - v.debit
    }));

    setAccountingData({ pl, bs });
  };

  const reports = [
    { id: "payroll" as ReportType, label: "Payroll Summary", icon: Receipt, color: "text-emerald-400 bg-emerald-500/10" },
    { id: "workers" as ReportType, label: "Worker Status", icon: Users, color: "text-blue-400 bg-blue-500/10" },
    { id: "invoice" as ReportType, label: "Client Invoice", icon: FileText, color: "text-purple-400 bg-purple-500/10" },
    { id: "attendance" as ReportType, label: "Attendance", icon: Calendar, color: "text-amber-400 bg-amber-500/10" },
    { id: "accounting" as ReportType, label: "Financial Statements", icon: BookOpen, color: "text-red-400 bg-red-500/10" },
  ];

  // Simple bar chart renderer (pure CSS)
  const BarChart = ({ data, label }: { data: Record<string, number>; label: string }) => {
    const max = Math.max(...Object.values(data), 1);
    return (
      <div className="glass p-5 rounded-2xl border border-white/5">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">{label}</h4>
        <div className="space-y-3">
          {Object.entries(data).slice(0, 8).map(([key, val]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 w-28 truncate shrink-0">{key}</span>
              <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500/60 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${(val / max) * 100}%` }} />
              </div>
              <span className="text-xs font-mono text-zinc-300 w-10 text-right">{val}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-zinc-400 mt-2">Generate, view, and export comprehensive business reports.</p>
      </div>

      {/* Report Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {reports.map(r => (
          <button
            key={r.id}
            onClick={() => setActiveReport(r.id)}
            className={`whitespace-nowrap px-5 py-3 rounded-xl border flex items-center gap-2 transition-all ${
              activeReport === r.id ? "bg-white/5 border-white/10" : "bg-black/20 border-white/5 hover:border-white/10 opacity-60"
            }`}
          >
            <r.icon className={`w-4 h-4 ${r.color.split(" ")[0]}`} />
            <span className={`text-xs font-bold ${activeReport === r.id ? "text-white" : "text-zinc-400"}`}>{r.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row md:items-center gap-4">
        <div>
          <label className="text-[10px] uppercase text-zinc-500 font-bold">Client</label>
          <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 appearance-none min-w-[180px]">
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-zinc-500 font-bold">Period</label>
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
        </div>
      </div>

      {/* ─── PAYROLL SUMMARY ─── */}
      {activeReport === "payroll" && (
        <div className="space-y-6">
          <ReportTable
            title="Payroll Summary"
            columns={[
              { key: "worker_name", label: "Worker Name" },
              { key: "emp_id", label: "EMP ID", mono: true },
              { key: "client", label: "Client" },
              { key: "position", label: "Position" },
              { key: "basic", label: "Basic", align: "right", mono: true },
              { key: "ot", label: "OT", align: "right", mono: true },
              { key: "deductions", label: "Deductions", align: "right", mono: true },
              { key: "net", label: "Net Salary", align: "right", mono: true },
            ]}
            data={payrollData}
            totals={{
              basic: payrollData.reduce((s, r) => s + r.basic, 0),
              ot: payrollData.reduce((s, r) => s + r.ot, 0),
              deductions: payrollData.reduce((s, r) => s + r.deductions, 0),
              net: payrollData.reduce((s, r) => s + r.net, 0),
            }}
            onExport={() => exportToXLSX(payrollData, `Payroll_${period}`)}
          />
        </div>
      )}

      {/* ─── WORKER STATUS ─── */}
      {activeReport === "workers" && (
        <div className="space-y-6">
          {/* Status cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Workers", val: workerStats.total, color: "text-white" },
              { label: "Active", val: workerStats.active, color: "text-emerald-400" },
              { label: "Idle", val: workerStats.idle, color: "text-amber-400" },
              { label: "Terminated", val: workerStats.terminated, color: "text-red-400" },
            ].map((s, i) => (
              <div key={i} className="glass p-4 rounded-2xl border border-white/5 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BarChart data={workerStats.byNationality} label="Workers by Nationality" />
            <BarChart data={workerStats.byClient} label="Workers by Client" />
          </div>

          {/* Iqama Expiry Alerts */}
          {workerStats.expiringIqama.length > 0 && (
            <div className="glass rounded-2xl border border-red-500/20 overflow-hidden">
              <div className="px-6 py-4 bg-red-500/5 border-b border-red-500/10 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Iqama Expiry Alerts ({workerStats.expiringIqama.length})</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase text-zinc-500 font-bold bg-white/[0.02]">
                  <tr>
                    <th className="px-6 py-3 text-left">Worker</th>
                    <th className="px-6 py-3 text-left">Iqama No</th>
                    <th className="px-6 py-3 text-left">Expiry Date</th>
                    <th className="px-6 py-3 text-right">Days Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {workerStats.expiringIqama.map((w: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-3 text-white font-medium">{w.name}</td>
                      <td className="px-6 py-3 font-mono text-zinc-400">{w.iqama_no}</td>
                      <td className="px-6 py-3 font-mono text-zinc-400">{w.expiry}</td>
                      <td className={`px-6 py-3 text-right font-mono font-bold ${w.days_left <= 30 ? "text-red-500" : w.days_left <= 60 ? "text-amber-400" : "text-zinc-300"}`}>
                        {w.days_left} days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => exportToXLSX(workerStats.expiringIqama, "IqamaExpiryAlerts")} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold flex items-center gap-2 border border-white/5">
              <Download className="w-3 h-3" /> Export Worker Report
            </button>
          </div>
        </div>
      )}

      {/* ─── CLIENT INVOICE ─── */}
      {activeReport === "invoice" && (
        <div className="space-y-6">
          <ReportTable
            title="Client Invoice Summary"
            columns={[
              { key: "client", label: "Client" },
              { key: "workers", label: "Workers", align: "center", mono: true },
              { key: "total", label: "Net Salary", align: "right", mono: true },
              { key: "vat", label: "VAT (15%)", align: "right", mono: true },
              { key: "grand_total", label: "Invoice Total", align: "right", mono: true },
            ]}
            data={invoiceData.map(d => ({
              ...d,
              total: d.total.toFixed(2),
              vat: d.vat.toFixed(2),
              grand_total: d.grand_total.toFixed(2),
            }))}
            totals={{
              workers: invoiceData.reduce((s, d) => s + d.workers, 0),
              total: invoiceData.reduce((s, d) => s + d.total, 0),
              vat: invoiceData.reduce((s, d) => s + d.vat, 0),
              grand_total: invoiceData.reduce((s, d) => s + d.grand_total, 0),
            }}
            onExport={() => exportToXLSX(invoiceData, `Invoices_${period}`)}
          />
          {invoiceData.length > 0 && (
            <div className="flex gap-2">
              {invoiceData.map(inv => (
                <button
                  key={inv.client}
                  onClick={() => exportInvoicePDF({
                    clientName: inv.client,
                    period: period,
                    workers: [{ name: "All Workers", empId: "—", position: "—", netSalary: inv.total }],
                    subtotal: inv.total, vat: inv.vat, grandTotal: inv.grand_total,
                  })}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold flex items-center gap-2 border border-white/5"
                >
                  <FileText className="w-3 h-3" /> PDF: {inv.client}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ATTENDANCE ─── */}
      {activeReport === "attendance" && (
        <div className="glass rounded-2xl border border-white/5 p-12 text-center text-zinc-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-bold text-white mb-1">Attendance Report</p>
          <p className="text-xs">Upload an attendance grid from the Payroll module to populate this report. Data will populate automatically once payroll records with attendance data are saved.</p>
        </div>
      )}

      {/* ─── ACCOUNTING ─── */}
      {activeReport === "accounting" && (
        <div className="space-y-6">
          {/* P&L */}
          <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
            <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Profit & Loss Statement</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-zinc-500 font-bold bg-white/[0.02]">
                <tr><th className="px-6 py-3 text-left">Code</th><th className="px-6 py-3 text-left">Account</th><th className="px-6 py-3 text-left">Type</th><th className="px-6 py-3 text-right">Amount (SAR)</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {accountingData.pl.map((r: any, i: number) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-3 font-mono text-zinc-400">{r.code}</td>
                    <td className="px-6 py-3 text-white">{r.name}</td>
                    <td className="px-6 py-3"><span className={`text-xs uppercase font-bold ${r.type === "revenue" ? "text-emerald-400" : "text-amber-400"}`}>{r.type}</span></td>
                    <td className={`px-6 py-3 text-right font-mono font-bold ${r.type === "revenue" ? "text-emerald-400" : "text-red-400"}`}>{r.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-white/10">
                <tr className="font-bold">
                  <td className="px-6 py-3" colSpan={3}><span className="text-xs text-zinc-400 uppercase">Net Income</span></td>
                  <td className={`px-6 py-3 text-right font-mono text-lg ${
                    accountingData.pl.reduce((s: number, r: any) => s + (r.type === "revenue" ? r.amount : -r.amount), 0) >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {accountingData.pl.reduce((s: number, r: any) => s + (r.type === "revenue" ? r.amount : -r.amount), 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Balance Sheet */}
          <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
            <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Balance Sheet</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-zinc-500 font-bold bg-white/[0.02]">
                <tr><th className="px-6 py-3 text-left">Code</th><th className="px-6 py-3 text-left">Account</th><th className="px-6 py-3 text-left">Type</th><th className="px-6 py-3 text-right">Balance (SAR)</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {accountingData.bs.map((r: any, i: number) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-3 font-mono text-zinc-400">{r.code}</td>
                    <td className="px-6 py-3 text-white">{r.name}</td>
                    <td className="px-6 py-3"><span className={`text-xs uppercase font-bold ${r.type === "asset" ? "text-blue-400" : r.type === "liability" ? "text-red-400" : "text-purple-400"}`}>{r.type}</span></td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-zinc-300">{r.balance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
