"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { Users, UserSquare2, Receipt, AlertTriangle, Building2, DollarSign, TrendingUp, Clock, Shield } from "lucide-react";
import DashboardKPI from "@/components/erp/DashboardKPI";
import Link from "next/link";

export default function DashboardOverview() {
  const [stats, setStats] = useState({ workers: 0, active: 0, idle: 0, terminated: 0, clients: 0, sponsors: 0, payrollTotal: 0 });
  const [expiringIqama, setExpiringIqama] = useState<any[]>([]);
  const [recentPayrolls, setRecentPayrolls] = useState<any[]>([]);
  const [salaryByClient, setSalaryByClient] = useState<Record<string, number>>({});

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    // Workers
    const { data: workers } = await insforge.database.from("workers").select("id, name_en, work_status, iqama_no, iqama_expiry, client_id, clients(legal_name)");
    const w = workers || [];
    const active = w.filter(x => x.work_status === "Active" || !x.work_status).length;
    const idle = w.filter(x => x.work_status === "Idle").length;
    const terminated = w.filter(x => x.work_status === "Terminated").length;

    // Clients count
    const { data: cls } = await insforge.database.from("clients").select("id");
    // Sponsors count
    const { data: sps } = await insforge.database.from("sponsors").select("id");

    // Payroll total this month
    const thisMonth = new Date().toISOString().slice(0, 7);
    const { data: payrolls } = await insforge.database.from("payrolls").select("net_salary, client_id, clients(legal_name), workers(name_en, emp_id)");
    const payrollTotal = (payrolls || []).reduce((s: number, p: any) => s + (p.net_salary || 0), 0);

    // Salary by client
    const byClient: Record<string, number> = {};
    (payrolls || []).forEach((p: any) => {
      const cl = p.clients?.legal_name || "Unknown";
      byClient[cl] = (byClient[cl] || 0) + (p.net_salary || 0);
    });
    setSalaryByClient(byClient);

    // Recent payrolls
    setRecentPayrolls((payrolls || []).slice(0, 6).map((p: any) => ({
      worker: p.workers?.name_en || "Unknown",
      emp_id: p.workers?.emp_id || "—",
      client: p.clients?.legal_name || "—",
      net: p.net_salary || 0,
    })));

    setStats({
      workers: w.length,
      active,
      idle,
      terminated,
      clients: cls?.length || 0,
      sponsors: sps?.length || 0,
      payrollTotal,
    });

    // Iqama expiry alerts
    const now = new Date();
    const d90 = new Date(now.getTime() + 90 * 86400000);
    const expiring = w.filter(x => {
      if (!x.iqama_expiry) return false;
      const exp = new Date(x.iqama_expiry);
      return exp <= d90 && exp >= now;
    }).map(x => ({
      name: x.name_en || "Unknown",
      iqama_no: x.iqama_no,
      expiry: x.iqama_expiry,
      days_left: Math.ceil((new Date(x.iqama_expiry).getTime() - now.getTime()) / 86400000),
    })).sort((a, b) => a.days_left - b.days_left);
    setExpiringIqama(expiring);
  };

  const maxSalary = Math.max(...Object.values(salaryByClient), 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-zinc-400 mt-2">Welcome back to Sovereign ERP Engine.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKPI title="Total Workers" value={stats.workers} icon={<Users className="w-5 h-5" />} color="emerald" subtitle={`${stats.active} active, ${stats.idle} idle`} />
        <DashboardKPI title="Active Clients" value={stats.clients} icon={<UserSquare2 className="w-5 h-5" />} color="blue" />
        <DashboardKPI title="Payroll Total" value={`SAR ${stats.payrollTotal.toLocaleString("en", { minimumFractionDigits: 2 })}`} icon={<DollarSign className="w-5 h-5" />} color="purple" />
        <DashboardKPI title="Sponsors" value={stats.sponsors} icon={<Building2 className="w-5 h-5" />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salary by Client Bar Chart */}
        <div className="glass p-6 rounded-3xl border border-white/5">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-6">Payroll by Client</h3>
          {Object.keys(salaryByClient).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(salaryByClient).map(([client, total]) => (
                <div key={client} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-32 truncate shrink-0">{client}</span>
                  <div className="flex-1 h-7 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000"
                      style={{ width: `${(total / maxSalary) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-emerald-400 w-24 text-right shrink-0">{total.toLocaleString("en", { minimumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm text-center py-8">No payroll data yet. Save a batch to populate.</p>
          )}
        </div>

        {/* Recent Payrolls */}
        <div className="glass p-6 rounded-3xl border border-white/5">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-6">Recent Payroll Activity</h3>
          <div className="space-y-3">
            {recentPayrolls.length > 0 ? recentPayrolls.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-[10px]">
                    {p.worker?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{p.worker}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{p.emp_id} · {p.client}</p>
                  </div>
                </div>
                <span className="text-sm font-mono text-emerald-400 font-bold">SAR {p.net.toFixed(2)}</span>
              </div>
            )) : (
              <p className="text-zinc-500 text-sm text-center py-8">No payroll records saved yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Worker Status Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass p-5 rounded-2xl border border-emerald-500/10 text-center">
          <p className="text-3xl font-bold text-emerald-400">{stats.active}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Active Workers</p>
        </div>
        <div className="glass p-5 rounded-2xl border border-amber-500/10 text-center">
          <p className="text-3xl font-bold text-amber-400">{stats.idle}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Idle Workers</p>
        </div>
        <div className="glass p-5 rounded-2xl border border-red-500/10 text-center">
          <p className="text-3xl font-bold text-red-400">{stats.terminated}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Terminated</p>
        </div>
      </div>

      {/* Iqama Expiry Alerts */}
      {expiringIqama.length > 0 && (
        <div className="glass rounded-2xl border border-red-500/20 overflow-hidden">
          <div className="px-6 py-4 bg-red-500/5 border-b border-red-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Iqama Expiry Alerts</h3>
            </div>
            <Link href="/reports" className="text-[10px] text-red-400 underline font-bold">View Full Report →</Link>
          </div>
          <div className="divide-y divide-white/5">
            {expiringIqama.slice(0, 5).map((w, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3 hover:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <Shield className={`w-4 h-4 ${w.days_left <= 30 ? "text-red-500" : "text-amber-400"}`} />
                  <div>
                    <p className="text-sm text-white font-medium">{w.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{w.iqama_no}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-mono font-bold ${w.days_left <= 30 ? "text-red-500" : "text-amber-400"}`}>{w.days_left} days</p>
                  <p className="text-[10px] text-zinc-500">expires {w.expiry}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
