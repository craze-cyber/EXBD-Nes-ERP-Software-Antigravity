"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { ArrowLeft, Download, ShieldAlert, Wrench, BarChart2, PieChart as PieIcon } from "lucide-react";
import Link from "next/link";
import { exportToXLSX } from "@/lib/report-generator";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function AssetReportsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [maint, setMaint] = useState<any[]>([]);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    const [{ data: aData }, { data: mData }] = await Promise.all([
      insforge.database.from("assets").select("*"),
      insforge.database.from("asset_maintenance").select("*")
    ]);
    setAssets(aData || []);
    setMaint(mData || []);
  };

  // 1. Assets by Category Value (Pie)
  const catMap = new Map();
  assets.forEach(a => {
    const c = a.category;
    catMap.set(c, (catMap.get(c) || 0) + (parseFloat(a.current_value) || 0));
  });
  const pieData = Array.from(catMap.entries()).map(([name, value]) => ({ name: name.replace('_', ' '), value })).filter(d => d.value > 0);

  // 2. Warranty Expirations 30/60/90
  const today = new Date();
  const getDaysDiff = (dStr: string) => {
    const d = new Date(dStr);
    return Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };
  
  const expiring = assets.filter(a => a.warranty_expiry && getDaysDiff(a.warranty_expiry) > 0 && getDaysDiff(a.warranty_expiry) <= 90)
    .map(a => ({ ...a, daysLeft: getDaysDiff(a.warranty_expiry) }))
    .sort((a,b) => a.daysLeft - b.daysLeft);

  // 3. Maintenance Cost by Month (Bar)
  const mntMap = new Map();
  maint.forEach(m => {
    if(!m.start_date) return;
    const mo = m.start_date.substring(0, 7);
    mntMap.set(mo, (mntMap.get(mo) || 0) + (parseFloat(m.cost) || 0));
  });
  const barData = Array.from(mntMap.entries()).map(([month, cost]) => ({ month, cost })).sort((a,b) => a.month.localeCompare(b.month));

  const handleExport = () => {
    const expData = assets.map(a => ({ Code: a.asset_code, Name: a.name, Category: a.category, Status: a.status, CurrentValue: a.current_value, Warranty: a.warranty_expiry }));
    exportToXLSX(expData, "Asset_Registry_Report");
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/assets" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"><ArrowLeft className="w-4 h-4 text-zinc-400" /></Link>
            <h1 className="text-3xl font-bold tracking-tight">Asset Reports & Analytics</h1>
          </div>
          <p className="text-zinc-400">Holistic view of valuations, maintenance burns, and warranties.</p>
        </div>
        <button onClick={handleExport} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20">
          <Download className="w-4 h-4" /> Export Registry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pie: Value by Category */}
        <div className="glass p-6 rounded-[24px] border border-white/5 flex flex-col">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2"><PieIcon className="w-4 h-4 text-emerald-400"/> Value Distribution by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {pieData.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `SAR ${Number(v).toLocaleString()}`} contentStyle={{ backgroundColor:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', fontSize:'12px' }} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', textTransform: 'capitalize' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar: Maintenance Cost */}
        <div className="glass p-6 rounded-[24px] border border-white/5 flex flex-col">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2"><BarChart2 className="w-4 h-4 text-amber-400"/> Monthly Maintenance Spend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `SAR ${v}`} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{ backgroundColor:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', fontSize:'12px' }} />
                <Bar dataKey="cost" fill="#f59e0b" radius={[4,4,0,0]} name="Maintenance Cost" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Warranties expiring */}
      <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-warning/10 bg-amber-500/5">
           <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> Warranty Expirations (Next 90 Days)</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-[#050505] text-[10px] uppercase font-bold text-zinc-500 border-b border-white/5">
             <tr>
               <th className="px-6 py-4">Asset Code</th>
               <th className="px-6 py-4">Name</th>
               <th className="px-6 py-4">Status</th>
               <th className="px-6 py-4">Expiry Date</th>
               <th className="px-6 py-4 text-right">Days Left</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {expiring.map(a => (
              <tr key={a.id} className="hover:bg-white/[0.02]">
                <td className="px-6 py-3 font-mono text-zinc-400">{a.asset_code}</td>
                <td className="px-6 py-3 text-white font-bold">{a.name}</td>
                <td className="px-6 py-3"><span className="text-xs uppercase font-bold text-zinc-400">{a.status.replace('_',' ')}</span></td>
                <td className="px-6 py-3 text-zinc-300 font-mono">{a.warranty_expiry}</td>
                <td className="px-6 py-3 text-right">
                  <span className={`px-2 py-1 rounded text-xs font-bold border ${a.daysLeft <= 30 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                    {a.daysLeft} Days
                  </span>
                </td>
              </tr>
            ))}
            {expiring.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No warranties expiring soon.</td></tr>}
          </tbody>
        </table>
      </div>

    </div>
  );
}
