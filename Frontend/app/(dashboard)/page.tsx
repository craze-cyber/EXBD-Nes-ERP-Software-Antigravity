"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import {
  Users, UserSquare2, DollarSign, Building2, Shield, AlertTriangle,
  Truck, Package, Clock, CheckCircle2, XCircle, FileWarning,
  TrendingUp, Banknote, ChevronRight, RefreshCw,
} from "lucide-react";
import DashboardKPI from "@/components/erp/DashboardKPI";
import Link from "next/link";

interface Alert {
  type: "critical" | "warning" | "info";
  label: string;
  value: string | number;
  href: string;
  detail?: string;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    workers: 0, active: 0, idle: 0, terminated: 0,
    clients: 0, sponsors: 0, payrollTotal: 0,
    activeLiabilities: 0, pendingSettlements: 0,
    fleetActive: 0, assetsAssigned: 0, pendingApprovals: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [salaryByClient, setSalaryByClient] = useState<Record<string, number>>({});
  const [recentPayrolls, setRecentPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    setLoading(true);

    const now = new Date();
    const d90 = new Date(now.getTime() + 90 * 86400000);
    const d30 = new Date(now.getTime() + 30 * 86400000);

    const [
      { data: workers },
      { data: cls },
      { data: sps },
      { data: payrolls },
      { data: liabilities },
      { data: settlements },
      { data: vehicles },
      { data: assets },
      { data: compliance },
      { data: pendingCR },
    ] = await Promise.all([
      insforge.database.from("workers").select("id, name_en, work_status, iqama_no, iqama_expiry"),
      insforge.database.from("clients").select("id"),
      insforge.database.from("sponsors").select("id"),
      insforge.database.from("payrolls").select("net_salary, client_id, clients(legal_name), workers(name_en, emp_id)"),
      insforge.database.from("liabilities").select("id, status, amount").eq("status", "active"),
      insforge.database.from("exit_settlements").select("id, status").eq("status", "pending"),
      insforge.database.from("vehicles").select("id, status"),
      insforge.database.from("assets").select("id, assignment_status"),
      insforge.database.from("compliance_documents").select("id, expiry_date, status, entity_type, document_type"),
      insforge.database.from("change_requests").select("id").eq("status", "pending"),
    ]);

    const w = workers || [];
    const active = w.filter(x => x.work_status === "Active" || !x.work_status).length;
    const idle = w.filter(x => x.work_status === "Idle").length;
    const terminated = w.filter(x => x.work_status === "Terminated").length;

    const payrollTotal = (payrolls || []).reduce((s: number, p: any) => s + (p.net_salary || 0), 0);

    const byClient: Record<string, number> = {};
    (payrolls || []).forEach((p: any) => {
      const cl = p.clients?.legal_name || "Unknown";
      byClient[cl] = (byClient[cl] || 0) + (p.net_salary || 0);
    });
    setSalaryByClient(byClient);
    setRecentPayrolls((payrolls || []).slice(0, 6).map((p: any) => ({
      worker: p.workers?.name_en || "Unknown",
      emp_id: p.workers?.emp_id || "—",
      client: p.clients?.legal_name || "—",
      net: p.net_salary || 0,
    })));

    const fleetActive = (vehicles || []).filter((v: any) => v.status === "active").length;
    const assetsAssigned = (assets || []).filter((a: any) => a.assignment_status === "assigned").length;

    setStats({
      workers: w.length, active, idle, terminated,
      clients: cls?.length || 0, sponsors: sps?.length || 0,
      payrollTotal, activeLiabilities: liabilities?.length || 0,
      pendingSettlements: settlements?.length || 0,
      fleetActive, assetsAssigned,
      pendingApprovals: pendingCR?.length || 0,
    });

    // Build smart alerts
    const newAlerts: Alert[] = [];

    // Iqama expiries
    const iqamaExpired = w.filter(x => x.iqama_expiry && new Date(x.iqama_expiry) < now);
    const iqamaExpiring30 = w.filter(x => x.iqama_expiry && new Date(x.iqama_expiry) >= now && new Date(x.iqama_expiry) <= d30);
    const iqamaExpiring90 = w.filter(x => x.iqama_expiry && new Date(x.iqama_expiry) > d30 && new Date(x.iqama_expiry) <= d90);

    if (iqamaExpired.length > 0)
      newAlerts.push({ type: "critical", label: "Iqama Expired", value: iqamaExpired.length, href: "/workers", detail: "workers require immediate renewal" });
    if (iqamaExpiring30.length > 0)
      newAlerts.push({ type: "critical", label: "Iqama Expiring (30d)", value: iqamaExpiring30.length, href: "/workers", detail: "workers expiring within 30 days" });
    if (iqamaExpiring90.length > 0)
      newAlerts.push({ type: "warning", label: "Iqama Expiring (90d)", value: iqamaExpiring90.length, href: "/workers", detail: "workers expiring within 90 days" });

    // Compliance docs
    const docs = compliance || [];
    const docsExpired = docs.filter((d: any) => d.status === "expired" || (d.expiry_date && new Date(d.expiry_date) < now));
    const docsExpiring = docs.filter((d: any) => d.expiry_date && new Date(d.expiry_date) >= now && new Date(d.expiry_date) <= d30);
    if (docsExpired.length > 0)
      newAlerts.push({ type: "critical", label: "Documents Expired", value: docsExpired.length, href: "/fleet", detail: "compliance documents have expired" });
    if (docsExpiring.length > 0)
      newAlerts.push({ type: "warning", label: "Documents Expiring Soon", value: docsExpiring.length, href: "/fleet", detail: "compliance documents expire within 30 days" });

    // Pending settlements
    if ((settlements?.length || 0) > 0)
      newAlerts.push({ type: "warning", label: "Pending Settlements", value: settlements!.length, href: "/exit-settlement", detail: "exit settlements awaiting processing" });

    // Pending approvals
    if ((pendingCR?.length || 0) > 0)
      newAlerts.push({ type: "info", label: "Pending Approvals", value: pendingCR!.length, href: "/settings/system", detail: "change requests awaiting review" });

    setAlerts(newAlerts);
    setLoading(false);
  };

  const maxSalary = Math.max(...Object.values(salaryByClient), 1);

  const alertColor = (t: Alert["type"]) => ({
    critical: "bg-red-500/10 border-red-500/30 text-red-400",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  }[t]);

  const alertIconColor = (t: Alert["type"]) => ({
    critical: "text-red-400",
    warning: "text-yellow-400",
    info: "text-blue-400",
  }[t]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Welcome back to EXBD ERP.</p>
        </div>
        <button
          onClick={loadDashboard}
          className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <DashboardKPI title="Total Workers" value={stats.workers} icon={<Users className="w-5 h-5" />} color="emerald" subtitle={`${stats.active} active`} />
        <DashboardKPI title="Active Clients" value={stats.clients} icon={<UserSquare2 className="w-5 h-5" />} color="blue" />
        <DashboardKPI title="Fleet Vehicles" value={stats.fleetActive} icon={<Truck className="w-5 h-5" />} color="purple" subtitle="active" />
        <DashboardKPI title="Assets Assigned" value={stats.assetsAssigned} icon={<Package className="w-5 h-5" />} color="amber" />
        <DashboardKPI title="Active Liabilities" value={stats.activeLiabilities} icon={<Banknote className="w-5 h-5" />} color="red" />
        <DashboardKPI title="Pending Approvals" value={stats.pendingApprovals} icon={<Clock className="w-5 h-5" />} color={stats.pendingApprovals > 0 ? "amber" : "emerald"} />
      </div>

      {/* Payroll KPI + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payroll total */}
        <div className="glass p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Payroll Total (All Time)</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400 mt-2">
            SAR {stats.payrollTotal.toLocaleString("en", { minimumFractionDigits: 0 })}
          </p>
          <div className="flex gap-4 mt-4 text-xs text-gray-500">
            <span className="text-green-400">{stats.active} active</span>
            <span className="text-yellow-400">{stats.idle} idle</span>
            <span className="text-red-400">{stats.terminated} terminated</span>
          </div>
        </div>

        {/* Smart Alerts Panel */}
        <div className="lg:col-span-2 glass p-6 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Smart Alerts</span>
            </div>
            {alerts.length > 0 && (
              <span className="text-xs font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                {alerts.filter(a => a.type === "critical").length} critical
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-3 py-4">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <span className="text-sm text-green-400">All systems clear — no alerts at this time.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <Link key={i} href={alert.href} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-opacity hover:opacity-80 ${alertColor(alert.type)}`}>
                  <div className={`text-2xl font-bold tabular-nums w-8 shrink-0 ${alertIconColor(alert.type)}`}>
                    {alert.value}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.label}</p>
                    {alert.detail && <p className="text-xs opacity-70 truncate">{alert.detail}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payroll by Client */}
        <div className="glass p-6 rounded-2xl border border-white/5">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-5">Payroll by Client</h3>
          {Object.keys(salaryByClient).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(salaryByClient)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([client, total]) => (
                <div key={client} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-28 truncate shrink-0">{client}</span>
                  <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--primary)] to-emerald-400 rounded-full transition-all duration-1000"
                      style={{ width: `${(total / maxSalary) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-emerald-400 w-20 text-right shrink-0 tabular-nums">
                    {(total / 1000).toFixed(1)}k
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm text-center py-8">No payroll data yet.</p>
          )}
        </div>

        {/* Recent Payrolls */}
        <div className="glass p-6 rounded-2xl border border-white/5">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-5">Recent Payroll Activity</h3>
          <div className="space-y-2">
            {recentPayrolls.length > 0 ? recentPayrolls.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs shrink-0">
                    {p.worker?.charAt(0) || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.worker}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{p.emp_id} · {p.client}</p>
                  </div>
                </div>
                <span className="text-sm font-mono text-emerald-400 font-bold shrink-0 ml-2">
                  {p.net.toLocaleString("en", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )) : (
              <p className="text-zinc-500 text-sm text-center py-8">No payroll records yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Worker Status + Pending Settlements Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass p-5 rounded-2xl border border-emerald-500/10 text-center">
          <p className="text-3xl font-bold text-emerald-400">{stats.active}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Active Workers</p>
        </div>
        <div className="glass p-5 rounded-2xl border border-amber-500/10 text-center">
          <p className="text-3xl font-bold text-amber-400">{stats.idle}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Idle Workers</p>
        </div>
        <div className="glass p-5 rounded-2xl border border-orange-500/10 text-center">
          <p className="text-3xl font-bold text-orange-400">{stats.pendingSettlements}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Pending Settlements</p>
          {stats.pendingSettlements > 0 && (
            <Link href="/exit-settlement" className="text-[10px] text-orange-400 hover:text-orange-300 mt-1 block">
              View →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
