"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { ArrowLeft, Download, Search } from "lucide-react";
import Link from "next/link";
import { exportToXLSX } from "@/lib/report-generator";

export default function RecoveryReportPage() {
  const [recoveries, setRecoveries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [filterClient, setFilterClient] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Summary stats
  const [summary, setSummary] = useState({ outstanding: 0, recoveredThisMonth: 0, workersWithLiabilities: 0 });

  useEffect(() => {
    const init = async () => {
      const { data: c } = await insforge.database.from("clients").select("*").order("legal_name");
      setClients(c || []);
    };
    init();
  }, []);

  useEffect(() => { fetchRecoveries(); }, [filterClient, dateFrom, dateTo]);

  const fetchRecoveries = async () => {
    let q = insforge.database.from("liability_recoveries")
      .select("*, workers(name_en, emp_id, client_id), worker_liabilities(liability_name, total_amount, recovered_amount)")
      .order("created_at", { ascending: false });

    if (dateFrom) q = q.gte("pay_period", dateFrom);
    if (dateTo) q = q.lte("pay_period", dateTo);

    const { data } = await q;
    let recs = data || [];

    // Filter by client via workers
    if (filterClient) {
      recs = recs.filter((r: any) => r.workers?.client_id === filterClient);
    }

    setRecoveries(recs);

    // Compute summary
    const { data: activeLiabs } = await insforge.database.from("worker_liabilities").select("total_amount, recovered_amount, worker_id").eq("status", "active");
    const outstanding = (activeLiabs || []).reduce((s: number, l: any) => s + ((l.total_amount || 0) - (l.recovered_amount || 0)), 0);
    const uniqueWorkers = new Set((activeLiabs || []).map((l: any) => l.worker_id)).size;

    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisMonthRecovered = recs.filter((r: any) => r.pay_period?.startsWith(thisMonth)).reduce((s: number, r: any) => s + (r.deducted_amount || 0), 0);

    setSummary({ outstanding, recoveredThisMonth: thisMonthRecovered, workersWithLiabilities: uniqueWorkers });
  };

  const filtered = recoveries.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.workers?.name_en?.toLowerCase().includes(q) || r.workers?.emp_id?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/liabilities" className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recovery Report</h1>
          <p className="text-zinc-400 mt-1">Detailed view of all liability deductions per payroll cycle.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass p-4 rounded-2xl border border-white/5 text-center">
          <p className="text-2xl font-bold text-red-400">SAR {summary.outstanding.toFixed(2)}</p>
          <p className="text-[10px] text-zinc-500 uppercase mt-1">Total Outstanding</p>
        </div>
        <div className="glass p-4 rounded-2xl border border-white/5 text-center">
          <p className="text-2xl font-bold text-emerald-400">SAR {summary.recoveredThisMonth.toFixed(2)}</p>
          <p className="text-[10px] text-zinc-500 uppercase mt-1">Recovered This Month</p>
        </div>
        <div className="glass p-4 rounded-2xl border border-white/5 text-center">
          <p className="text-2xl font-bold text-amber-400">{summary.workersWithLiabilities}</p>
          <p className="text-[10px] text-zinc-500 uppercase mt-1">Workers with Liabilities</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search worker..." className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500/50" />
        </div>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none appearance-none">
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
        </select>
        <input type="month" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none [color-scheme:dark]" placeholder="From" />
        <input type="month" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none [color-scheme:dark]" placeholder="To" />
        <button onClick={() => exportToXLSX(filtered.map(r => ({ Worker: r.workers?.name_en, EMP_ID: r.workers?.emp_id, Period: r.pay_period, Liability: r.worker_liabilities?.liability_name, Net_Salary: r.net_salary_at_time, Deducted: r.deducted_amount, Remaining: r.remaining_after })), "Recovery_Report")} className="px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold flex items-center gap-1 border border-white/5">
          <Download className="w-3 h-3" /> Export XLSX
        </button>
      </div>

      {/* Table */}
      <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-white/5 text-[10px] uppercase font-bold text-zinc-500 border-b border-white/5">
            <tr>
              <th className="px-5 py-4">Worker</th>
              <th className="px-5 py-4">EMP ID</th>
              <th className="px-5 py-4">Period</th>
              <th className="px-5 py-4">Liability</th>
              <th className="px-5 py-4 text-right">Net Salary</th>
              <th className="px-5 py-4 text-right">Deducted</th>
              <th className="px-5 py-4 text-right">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((r, i) => (
              <tr key={i} className="hover:bg-white/[0.02]">
                <td className="px-5 py-3 font-bold text-white">{r.workers?.name_en || "—"}</td>
                <td className="px-5 py-3 font-mono text-zinc-400">{r.workers?.emp_id || "—"}</td>
                <td className="px-5 py-3 font-mono text-zinc-300">{r.pay_period}</td>
                <td className="px-5 py-3 text-zinc-300">{r.worker_liabilities?.liability_name || "—"}</td>
                <td className="px-5 py-3 text-right font-mono text-zinc-400">{r.net_salary_at_time?.toFixed(2)}</td>
                <td className="px-5 py-3 text-right font-mono text-red-400 font-bold">-{r.deducted_amount?.toFixed(2)}</td>
                <td className="px-5 py-3 text-right font-mono text-zinc-300">{r.remaining_after?.toFixed(2)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-zinc-500">No recovery transactions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
