"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { exportToXLSX } from "@/lib/report-generator";
import { ArrowLeft, Download, PieChart as PieChartIcon, TrendingUp, Filter } from "lucide-react";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function ExpenseReportsPage() {
  const [daily, setDaily] = useState<any[]>([]);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: d }, { data: m }] = await Promise.all([
      insforge.database.from("daily_expenses").select("*"),
      insforge.database.from("monthly_expenses").select("*")
    ]);
    
    setDaily(d || []);
    setMonthly(m || []);
    
    // Extract available month strings
    const months = new Set<string>();
    (m || []).forEach(r => months.add(r.expense_month));
    (d || []).forEach(r => {
      if (r.expense_date) {
        months.add(r.expense_date.substring(0, 7));
      }
    });
    
    const sorted = Array.from(months).sort().reverse();
    setAvailableMonths(sorted);
    if (sorted.length > 0) setSelectedMonth(sorted[0]);
    
    setLoading(false);
  };

  // ----- TREND DATA -----
  // Aggregate by month for the line chart (last 12 months available)
  const trendDataMap = new Map<string, { month: string, Daily: number, Company: number, Government: number }>();
  
  daily.forEach(r => {
    if (!r.expense_date) return;
    const m = r.expense_date.substring(0, 7);
    if (!trendDataMap.has(m)) trendDataMap.set(m, { month: m, Daily: 0, Company: 0, Government: 0 });
    trendDataMap.get(m)!.Daily += parseFloat(r.amount) || 0;
  });
  
  monthly.forEach(r => {
    const m = r.expense_month;
    if (!m) return;
    if (!trendDataMap.has(m)) trendDataMap.set(m, { month: m, Daily: 0, Company: 0, Government: 0 });
    if (r.category === "company_monthly") trendDataMap.get(m)!.Company += parseFloat(r.amount) || 0;
    if (r.category === "government_monthly") trendDataMap.get(m)!.Government += parseFloat(r.amount) || 0;
  });

  const trendData = Array.from(trendDataMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  // ----- SELECTED MONTH DATA -----
  const currentDaily = daily.filter(d => d.expense_date?.startsWith(selectedMonth));
  const currentMonthly = monthly.filter(m => m.expense_month === selectedMonth);
  
  const dailyTotal = currentDaily.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const companyTotal = currentMonthly.filter(m => m.category === "company_monthly").reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
  const govTotal = currentMonthly.filter(m => m.category === "government_monthly").reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
  
  const totalExpense = dailyTotal + companyTotal + govTotal;

  const pieData = [
    { name: "Daily", value: dailyTotal },
    { name: "Company", value: companyTotal },
    { name: "Government", value: govTotal }
  ].filter(d => d.value > 0);

  // Rankings
  const rankingsMap = new Map<string, number>();
  currentDaily.forEach(d => {
    const cat = d.category || "Uncategorized";
    rankingsMap.set(cat, (rankingsMap.get(cat) || 0) + (parseFloat(d.amount) || 0));
  });
  currentMonthly.forEach(m => {
    const cat = m.item_name;
    rankingsMap.set(cat, (rankingsMap.get(cat) || 0) + (parseFloat(m.amount) || 0));
  });
  
  const rankedExpenses = Array.from(rankingsMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const handleExport = () => {
    const exportData = [
      ...currentDaily.map(d => ({ Type: "Daily", Date: d.expense_date, Category: d.category, Description: d.description, Amount: d.amount })),
      ...currentMonthly.map(m => ({ Type: m.category, Date: m.expense_month, Category: m.item_name, Description: m.notes, Amount: m.amount }))
    ];
    exportToXLSX(exportData, `Expenses_${selectedMonth}`);
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading reports...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/expenses" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"><ArrowLeft className="w-4 h-4 text-zinc-400" /></Link>
            <h1 className="text-3xl font-bold tracking-tight">Expense Reports</h1>
          </div>
          <p className="text-zinc-400">Comprehensive overview of company outflows.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 glass px-3 rounded-xl border border-white/5">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent py-2.5 outline-none text-sm font-bold text-white">
              {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button onClick={handleExport} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20">
            <Download className="w-4 h-4" /> Export XLSX
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-3xl border border-white/5 flex flex-col justify-center bg-gradient-to-br from-emerald-500/10 to-transparent">
          <p className="text-[10px] text-emerald-500 uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5"><PieChartIcon className="w-3.5 h-3.5" /> Total Expense</p>
          <p className="text-3xl font-bold text-white tracking-tight">SAR {totalExpense.toFixed(2)}</p>
        </div>
        <div className="glass p-5 rounded-3xl border border-white/5 flex flex-col justify-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Company Monthly</p>
          <p className="text-2xl font-bold text-blue-400">SAR {companyTotal.toFixed(2)}</p>
        </div>
        <div className="glass p-5 rounded-3xl border border-white/5 flex flex-col justify-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Government Monthly</p>
          <p className="text-2xl font-bold text-amber-400">SAR {govTotal.toFixed(2)}</p>
        </div>
        <div className="glass p-5 rounded-3xl border border-white/5 flex flex-col justify-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Daily Operations</p>
          <p className="text-2xl font-bold text-pink-400">SAR {dailyTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pie Chart */}
        <div className="glass p-6 rounded-3xl border border-white/5 md:col-span-1 flex flex-col">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-emerald-400" /> Distribution
          </h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => `SAR ${Number(value).toFixed(2)}`}
                  contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Line Chart */}
        <div className="glass p-6 rounded-3xl border border-white/5 md:col-span-2 flex flex-col">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Month-Over-Month Trend
          </h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `SAR ${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: '#888', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="Company" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Government" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Daily" stroke="#ec4899" strokeWidth={3} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 10 Ranked Expenses */}
      <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Expenditures ({selectedMonth})</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-[#0a0a0a] text-[10px] uppercase font-bold text-zinc-500 border-b border-white/5">
            <tr>
              <th className="px-6 py-4 w-12 text-center">Rank</th>
              <th className="px-6 py-4">Expense Category / Item</th>
              <th className="px-6 py-4 text-right">Amount (SAR)</th>
              <th className="px-6 py-4 w-48 text-right">% of Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rankedExpenses.map((exp, i) => {
              const pct = totalExpense > 0 ? (exp.amount / totalExpense) * 100 : 0;
              return (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-zinc-600 text-center">{i + 1}</td>
                  <td className="px-6 py-4 font-medium text-zinc-200">{exp.name}</td>
                  <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">{exp.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className="font-mono text-zinc-400 text-xs w-10">{pct.toFixed(1)}%</span>
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
            {rankedExpenses.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500">No data available for this month.</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
