"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { Calendar, Search, Download, ArrowLeft, ChevronRight, X, ExternalLink, Users } from "lucide-react";
import Link from "next/link";

export default function GeneralLedger() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  
  // Drawer state
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // Drill-down state
  const [drillDownData, setDrillDownData] = useState<any[]>([]);
  const [showDrillDown, setShowDrillDown] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (selectedAccount) fetchTransactions();
  }, [selectedAccount, dateFrom, dateTo]);

  const fetchSummary = async () => {
    const { data: accts } = await insforge.database.from("accounts").select("*").order("code");
    const { data: lines } = await insforge.database.from("journal_lines").select("account_id, debit, credit");
    
    if (accts) setAccounts(accts);
    
    const bals: Record<string, number> = {};
    (lines || []).forEach((line: any) => {
      const id = line.account_id;
      if (!bals[id]) bals[id] = 0;
      bals[id] += (line.debit || 0) - (line.credit || 0);
    });
    setBalances(bals);
  };

  const fetchTransactions = async () => {
    let query = insforge.database
      .from("journal_lines")
      .select("*, journal_entries!inner(id, entry_date, description, reference, status, client_id)")
      .eq("account_id", selectedAccount.id)
      .order("journal_entries(entry_date)", { ascending: false });

    if (dateFrom) query = query.gte("journal_entries.entry_date", dateFrom);
    if (dateTo) query = query.lte("journal_entries.entry_date", dateTo);

    const { data } = await query;
    setTransactions(data || []);
  };

  const handleDrillDown = async (entry: any) => {
    if (!entry.reference?.startsWith("PAY-") && !entry.reference?.startsWith("INV-")) return;
    
    const period = entry.reference.split("-").slice(1).join("-"); // e.g. 2026-04
    const { data } = await insforge.database
      .from("payrolls")
      .select("*, workers(name_en, emp_id)")
      .eq("client_id", entry.client_id)
      .gte("pay_period", `${period}-01`)
      .lte("pay_period", `${period}-28`);
    
    setDrillDownData(data || []);
    setShowDrillDown(true);
  };

  const filteredAccounts = accounts.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.code.includes(searchQuery)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/accounting" className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">General Ledger</h1>
          <p className="text-zinc-400 mt-1">Summary of all accounts and detailed transaction history.</p>
        </div>
      </div>

      {/* Account List / Search */}
      <div className="glass p-4 rounded-2xl flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            placeholder="Search account by name or code..." 
            className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Summary Table */}
      <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-white/5 text-[10px] uppercase font-bold text-zinc-500 border-b border-white/5">
            <tr>
              <th className="px-6 py-4">Account Code</th>
              <th className="px-6 py-4">Account Name</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4 text-right">Balance (SAR)</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredAccounts.map(account => (
              <tr key={account.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4 font-mono text-emerald-400">{account.code}</td>
                <td className="px-6 py-4 font-bold text-white">{account.name}</td>
                <td className="px-6 py-4 uppercase text-[10px] text-zinc-500 font-bold">{account.type}</td>
                <td className={`px-6 py-4 text-right font-mono font-bold ${(balances[account.id] || 0) >= 0 ? "text-white" : "text-red-400"}`}>
                  {(balances[account.id] || 0).toLocaleString("en", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setSelectedAccount(account)}
                    className="px-4 py-1.5 bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/10 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ml-auto opacity-0 group-hover:opacity-100"
                  >
                    View Transactions <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transactions Drawer */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedAccount(null)}>
          <div className="w-full max-w-4xl bg-[#050505] border-l border-white/10 h-full flex flex-col animate-in slide-in-from-right-8 duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedAccount.code} — {selectedAccount.name}</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Transaction History</p>
              </div>
              <button onClick={() => setSelectedAccount(null)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X className="w-6 h-6 text-zinc-500" /></button>
            </div>
            
            {/* Drawer Filters */}
            <div className="p-4 bg-white/[0.02] border-b border-white/5 flex gap-4">
              <div className="flex-1">
                <label className="text-[10px] uppercase text-zinc-500 font-bold ml-1">From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase text-zinc-500 font-bold ml-1">To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/5 text-[10px] uppercase font-bold text-zinc-500 border-b border-white/10 sticky top-0">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Reference</th>
                    <th className="px-6 py-4 text-right">Debit</th>
                    <th className="px-6 py-4 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02] group">
                      <td className="px-6 py-4 font-mono text-zinc-400 text-xs">{t.journal_entries?.entry_date}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{t.journal_entries?.description}</span>
                          {(t.journal_entries?.reference?.startsWith("PAY-") || t.journal_entries?.reference?.startsWith("INV-")) && (
                            <button 
                              onClick={() => handleDrillDown(t.journal_entries)}
                              className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 opacity-0 group-hover:opacity-100 transition-all"
                              title="Drill down to payroll details"
                            >
                              <Users className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-zinc-500 text-[10px]">{t.journal_entries?.reference || "—"}</td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-400">{t.debit > 0 ? t.debit.toLocaleString("en", { minimumFractionDigits: 2 }) : ""}</td>
                      <td className="px-6 py-4 text-right font-mono text-red-400">{t.credit > 0 ? t.credit.toLocaleString("en", { minimumFractionDigits: 2 }) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-between items-center">
              <span className="text-xs text-zinc-500 uppercase font-bold">Total Balance</span>
              <span className={`text-2xl font-mono font-bold ${(balances[selectedAccount.id] || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                SAR {(balances[selectedAccount.id] || 0).toLocaleString("en", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Drill-down Modal (Payroll Details) */}
      {showDrillDown && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" /> Payroll Breakdown
                </h3>
                <p className="text-xs text-zinc-500 mt-1">Workers contributing to this transaction.</p>
              </div>
              <button onClick={() => setShowDrillDown(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X className="w-5 h-5 text-zinc-500" /></button>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/5 text-[10px] uppercase font-bold text-zinc-500 border-b border-white/10 sticky top-0">
                  <tr>
                    <th className="px-6 py-4">Worker</th>
                    <th className="px-6 py-4">EMP ID</th>
                    <th className="px-6 py-4 text-right">Basic</th>
                    <th className="px-6 py-4 text-right">OT Pay</th>
                    <th className="px-6 py-4 text-right">Deductions</th>
                    <th className="px-6 py-4 text-right text-emerald-400">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {drillDownData.map((p, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-bold text-white">{p.workers?.name_en}</td>
                      <td className="px-6 py-4 font-mono text-zinc-400 text-xs">{p.workers?.emp_id}</td>
                      <td className="px-6 py-4 text-right font-mono text-zinc-300">{p.basic_salary?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-400">{p.ot_amount?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono text-red-400">{p.deductions?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">{p.net_salary?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-white/10 bg-black/40 flex justify-between items-center">
              <span className="text-xs text-zinc-500 uppercase font-bold">Total Transaction Contribution</span>
              <span className="text-xl font-mono font-bold text-white">
                SAR {drillDownData.reduce((s, p) => s + (p.net_salary || 0), 0).toLocaleString("en", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
