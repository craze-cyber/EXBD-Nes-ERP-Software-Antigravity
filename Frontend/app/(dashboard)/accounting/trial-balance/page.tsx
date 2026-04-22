"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { ArrowLeft, CheckCircle2, AlertCircle, Download } from "lucide-react";
import Link from "next/link";

export default function TrialBalance() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [rows, setRows] = useState<{ id: string; code: string; name: string; type: string; debit: number; credit: number }[]>([]);

  useEffect(() => {
    fetchData();
  }, [periodFrom, periodTo]);

  const fetchData = async () => {
    // Fetch all accounts
    const { data: accts } = await insforge.database.from("accounts").select("*").order("code");
    if (!accts) return;
    setAccounts(accts);

    // Fetch all journal lines with entry dates
    let query = insforge.database
      .from("journal_lines")
      .select("account_id, debit, credit, journal_entries!inner(entry_date, status)");

    // Only posted entries
    query = query.eq("journal_entries.status", "posted");
    if (periodFrom) query = query.gte("journal_entries.entry_date", periodFrom);
    if (periodTo) query = query.lte("journal_entries.entry_date", periodTo);

    const { data: lines } = await query;

    // Aggregate per account
    const agg: Record<string, { debit: number; credit: number }> = {};
    (lines || []).forEach((l: any) => {
      if (!agg[l.account_id]) agg[l.account_id] = { debit: 0, credit: 0 };
      agg[l.account_id].debit += l.debit || 0;
      agg[l.account_id].credit += l.credit || 0;
    });

    // Build rows — only accounts with activity
    const result = accts
      .map(a => ({
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        debit: agg[a.id]?.debit || 0,
        credit: agg[a.id]?.credit || 0,
      }))
      .filter(r => r.debit > 0 || r.credit > 0);

    setRows(result);
  };

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const TYPE_COLORS: Record<string, string> = {
    asset: "text-blue-400",
    liability: "text-red-400",
    equity: "text-purple-400",
    revenue: "text-emerald-400",
    expense: "text-amber-400",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/accounting" className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trial Balance</h1>
            <p className="text-zinc-400 mt-1">Verify that total debits equal total credits across all accounts.</p>
          </div>
        </div>
      </div>

      {/* Balance Check */}
      <div className={`glass p-4 rounded-2xl border flex items-center gap-4 ${isBalanced ? "border-emerald-500/20" : "border-red-500/20"}`}>
        {isBalanced ? (
          <>
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <div>
              <p className="text-sm font-bold text-emerald-400">Books are balanced ✓</p>
              <p className="text-xs text-zinc-500">Total Debits = Total Credits</p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <p className="text-sm font-bold text-red-400">Books are NOT balanced!</p>
              <p className="text-xs text-zinc-500">Difference: SAR {Math.abs(totalDebit - totalCredit).toFixed(2)}</p>
            </div>
          </>
        )}
        <div className="ml-auto flex gap-6">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase">Total Debit</p>
            <p className="text-lg font-mono font-bold text-emerald-400">{totalDebit.toLocaleString("en", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase">Total Credit</p>
            <p className="text-lg font-mono font-bold text-red-400">{totalCredit.toLocaleString("en", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Period Filter */}
      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row md:items-center gap-4">
        <div>
          <label className="text-[10px] uppercase text-zinc-500 font-bold">Period From</label>
          <input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
        </div>
        <div>
          <label className="text-[10px] uppercase text-zinc-500 font-bold">Period To</label>
          <input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-white/5 text-[10px] uppercase font-bold text-zinc-500 border-b border-white/5">
            <tr>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Account Name</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4 text-right">Debit</th>
              <th className="px-6 py-4 text-right">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-white/[0.02]">
                <td className="px-6 py-3 font-mono text-zinc-400">{r.code}</td>
                <td className="px-6 py-3 text-white font-medium">{r.name}</td>
                <td className="px-6 py-3">
                  <span className={`text-xs font-bold uppercase ${TYPE_COLORS[r.type] || "text-zinc-400"}`}>{r.type}</span>
                </td>
                <td className="px-6 py-3 text-right font-mono text-emerald-400">
                  {r.debit > 0 ? r.debit.toLocaleString("en", { minimumFractionDigits: 2 }) : ""}
                </td>
                <td className="px-6 py-3 text-right font-mono text-red-400">
                  {r.credit > 0 ? r.credit.toLocaleString("en", { minimumFractionDigits: 2 }) : ""}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No journal entries found for this period.</td></tr>
            )}
          </tbody>
          <tfoot className="border-t-2 border-white/10 bg-white/[0.02]">
            <tr className="font-bold">
              <td className="px-6 py-4" colSpan={3}>
                <span className="text-xs text-zinc-400 uppercase tracking-wider">Totals</span>
              </td>
              <td className="px-6 py-4 text-right font-mono text-emerald-400 text-base">{totalDebit.toLocaleString("en", { minimumFractionDigits: 2 })}</td>
              <td className="px-6 py-4 text-right font-mono text-red-400 text-base">{totalCredit.toLocaleString("en", { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
