"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, DollarSign, Calendar, FileText } from "lucide-react";

interface JournalEntryProps {
  entry: {
    id: string;
    entry_date: string;
    description: string;
    reference: string | null;
    status: string;
    client_id: string | null;
    lines: {
      id: string;
      account_name: string;
      account_code: string;
      debit: number;
      credit: number;
      description: string | null;
    }[];
  };
}

export default function JournalEntryCard({ entry }: JournalEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalDebit = entry.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = entry.lines.reduce((s, l) => s + (l.credit || 0), 0);

  const statusColor = entry.status === "posted"
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : entry.status === "void"
    ? "bg-red-500/10 text-red-400 border-red-500/20"
    : "bg-amber-500/10 text-amber-400 border-amber-500/20";

  return (
    <div className="glass rounded-xl border border-white/5 overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-5 h-5 flex items-center justify-center">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
        </div>

        <div className="flex items-center gap-2 text-zinc-500 shrink-0">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-xs font-mono">{entry.entry_date}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{entry.description}</p>
          {entry.reference && <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Ref: {entry.reference}</p>}
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase">Debit</p>
            <p className="text-sm font-mono font-bold text-emerald-400">{totalDebit.toLocaleString("en", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase">Credit</p>
            <p className="text-sm font-mono font-bold text-red-400">{totalCredit.toLocaleString("en", { minimumFractionDigits: 2 })}</p>
          </div>
          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${statusColor}`}>
            {entry.status}
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-white/5 bg-white/[0.01]">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-zinc-500 font-bold">
              <tr>
                <th className="px-6 py-2 text-left">Account</th>
                <th className="px-6 py-2 text-left">Description</th>
                <th className="px-6 py-2 text-right">Debit</th>
                <th className="px-6 py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {entry.lines.map(line => (
                <tr key={line.id} className="hover:bg-white/[0.01]">
                  <td className="px-6 py-2">
                    <span className="font-mono text-xs text-zinc-500 mr-2">{line.account_code}</span>
                    <span className="text-zinc-300">{line.account_name}</span>
                  </td>
                  <td className="px-6 py-2 text-zinc-500 text-xs">{line.description || "—"}</td>
                  <td className="px-6 py-2 text-right font-mono text-emerald-400">
                    {line.debit > 0 ? line.debit.toLocaleString("en", { minimumFractionDigits: 2 }) : ""}
                  </td>
                  <td className="px-6 py-2 text-right font-mono text-red-400">
                    {line.credit > 0 ? line.credit.toLocaleString("en", { minimumFractionDigits: 2 }) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-white/10">
              <tr className="font-bold">
                <td className="px-6 py-3" colSpan={2}></td>
                <td className="px-6 py-3 text-right font-mono text-emerald-400">{totalDebit.toLocaleString("en", { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-3 text-right font-mono text-red-400">{totalCredit.toLocaleString("en", { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
