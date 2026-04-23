"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";
import JournalEntryCard from "@/components/erp/JournalEntry";
import { useApprovalAction } from "@/hooks/useApprovalAction";

export default function JournalsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { submitChange, saveLabel } = useApprovalAction();

  // Manual Entry Form State
  const [form, setForm] = useState({ entry_date: new Date().toISOString().split("T")[0], description: "", reference: "" });
  const [lines, setLines] = useState<{ account_id: string; debit: string; credit: string; description: string }[]>([
    { account_id: "", debit: "", credit: "", description: "" },
    { account_id: "", debit: "", credit: "", description: "" },
  ]);

  useEffect(() => {
    fetchEntries();
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const { data } = await insforge.database.from("accounts").select("*").order("code");
    if (data) setAccounts(data);
  };

  const fetchEntries = async () => {
    const { data: je } = await insforge.database
      .from("journal_entries")
      .select("*")
      .order("entry_date", { ascending: false });

    if (!je) return;

    // Fetch lines for each entry with account info
    const enriched = [];
    for (const entry of je) {
      const { data: jl } = await insforge.database
        .from("journal_lines")
        .select("*, accounts(code, name)")
        .eq("journal_entry_id", entry.id);

      enriched.push({
        ...entry,
        lines: (jl || []).map((l: any) => ({
          id: l.id,
          account_name: l.accounts?.name || "Unknown",
          account_code: l.accounts?.code || "—",
          debit: l.debit || 0,
          credit: l.credit || 0,
          description: l.description,
        })),
      });
    }
    setEntries(enriched);
  };

  const addLine = () => {
    setLines(prev => [...prev, { account_id: "", debit: "", credit: "", description: "" }]);
  };

  const removeLine = (idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: string, value: string) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const handleSubmit = async () => {
    if (!form.description) { toast.error("Description is required."); return; }

    const totalDR = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const totalCR = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);

    if (Math.abs(totalDR - totalCR) > 0.01) {
      toast.error(`Journal does not balance! DR: ${totalDR.toFixed(2)} ≠ CR: ${totalCR.toFixed(2)}`);
      return;
    }

    const validLines = lines.filter(l => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (validLines.length < 2) {
      toast.error("At least 2 valid lines are required.");
      return;
    }

    const journalPayload = {
      entry_date: form.entry_date,
      description: form.description,
      reference: form.reference || null,
      status: "posted",
      lines: validLines.map(l => ({
        account_id: l.account_id,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description || null,
      })),
    };

    const result = await submitChange({
      action: "journal_create",
      module: "Accounting",
      recordLabel: form.description,
      afterData: journalPayload,
    });

    if (result?.status === "executed") {
      try {
        const { data: je, error: jeErr } = await insforge.database.from("journal_entries").insert([{
          entry_date: form.entry_date,
          description: form.description,
          reference: form.reference || null,
          status: "posted",
        }]).select().single();

        if (jeErr) throw jeErr;

        const linePayloads = validLines.map(l => ({
          journal_entry_id: je.id,
          account_id: l.account_id,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description || null,
        }));

        const { error: lErr } = await insforge.database.from("journal_lines").insert(linePayloads);
        if (lErr) throw lErr;

        toast.success("Journal entry posted successfully!");
        setShowForm(false);
        setForm({ entry_date: new Date().toISOString().split("T")[0], description: "", reference: "" });
        setLines([
          { account_id: "", debit: "", credit: "", description: "" },
          { account_id: "", debit: "", credit: "", description: "" },
        ]);
        fetchEntries();
      } catch (err: any) {
        toast.error("Failed: " + err.message);
      }
    } else if (result?.status === "pending") {
      setShowForm(false);
      setForm({ entry_date: new Date().toISOString().split("T")[0], description: "", reference: "" });
      setLines([
        { account_id: "", debit: "", credit: "", description: "" },
        { account_id: "", debit: "", credit: "", description: "" },
      ]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/accounting" className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Journal Entries</h1>
            <p className="text-zinc-400 mt-1">Double-entry bookkeeping records.</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </div>

      {/* Entry List */}
      <div className="space-y-3">
        {entries.map(entry => (
          <JournalEntryCard key={entry.id} entry={entry} />
        ))}
        {entries.length === 0 && (
          <div className="glass rounded-2xl border border-white/5 p-12 text-center text-zinc-500">
            No journal entries found. Create one or save a payroll batch to auto-generate.
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#050505] border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">New Journal Entry</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase">Date *</label>
                  <input type="date" value={form.entry_date} onChange={e => setForm(p => ({ ...p, entry_date: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Description *</label>
                  <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" placeholder="e.g. Payroll - First Cry - Feb 2026" />
                </div>
              </div>

              {/* Lines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Journal Lines</label>
                  <button onClick={addLine} className="text-xs text-emerald-400 font-bold flex items-center gap-1 hover:underline"><Plus className="w-3 h-3" /> Add Line</button>
                </div>
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-[10px] uppercase text-zinc-500 font-bold">
                      <tr>
                        <th className="px-3 py-2 text-left">Account</th>
                        <th className="px-3 py-2 text-right w-28">Debit</th>
                        <th className="px-3 py-2 text-right w-28">Credit</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <select value={line.account_id} onChange={e => updateLine(idx, "account_id", e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-emerald-500/50 appearance-none">
                              <option value="">Select account...</option>
                              {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" step="0.01" value={line.debit} onChange={e => updateLine(idx, "debit", e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-right font-mono outline-none focus:border-emerald-500/50" placeholder="0.00" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" step="0.01" value={line.credit} onChange={e => updateLine(idx, "credit", e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-right font-mono outline-none focus:border-emerald-500/50" placeholder="0.00" />
                          </td>
                          <td className="px-3 py-2">
                            {lines.length > 2 && (
                              <button onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-white/10 bg-white/[0.02]">
                      <tr className="font-bold">
                        <td className="px-3 py-2 text-xs text-zinc-400 uppercase">Totals</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-400 text-xs">{lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono text-red-400 text-xs">{lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0).toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-white/10 bg-black/40 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSubmit} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-all">Post Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
