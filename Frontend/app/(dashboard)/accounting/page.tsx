"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import AccountTree from "@/components/erp/AccountTree";
import { Plus, X, BookOpen, BarChart3, FileText, Scale } from "lucide-react";
import Link from "next/link";
import { useApprovalAction } from "@/hooks/useApprovalAction";

export default function AccountingDashboard() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ code: "", name: "", type: "asset", parent_id: "", description: "" });
  const { submitChange, saveLabel } = useApprovalAction();

  useEffect(() => {
    fetchAccounts();
    fetchBalances();
  }, []);

  const fetchAccounts = async () => {
    const { data } = await insforge.database.from("accounts").select("*").order("code");
    if (data) setAccounts(data);
  };

  const fetchBalances = async () => {
    const { data } = await insforge.database.from("journal_lines").select("account_id, debit, credit");
    if (data) {
      const bals: Record<string, number> = {};
      data.forEach((line: any) => {
        const id = line.account_id;
        if (!bals[id]) bals[id] = 0;
        bals[id] += (line.debit || 0) - (line.credit || 0);
      });
      setBalances(bals);
    }
  };

  const handleAddAccount = async () => {
    if (!formData.code || !formData.name) {
      toast.error("Code and Name are required.");
      return;
    }
    const payload: any = {
      code: formData.code,
      name: formData.name,
      type: formData.type,
      description: formData.description || null,
      parent_id: formData.parent_id || null,
    };
    const result = await submitChange({
      action: "account_create",
      module: "Accounting",
      recordLabel: `${payload.code} - ${payload.name}`,
      afterData: payload,
    });

    if (result?.status === "executed") {
      const { error } = await insforge.database.from("accounts").insert([payload]);
      if (error) { toast.error(error.message); return; }
      toast.success("Account created successfully!");
      setShowForm(false);
      setFormData({ code: "", name: "", type: "asset", parent_id: "", description: "" });
      fetchAccounts();
    } else if (result?.status === "pending") {
      setShowForm(false);
      setFormData({ code: "", name: "", type: "asset", parent_id: "", description: "" });
    }
  };

  const navCards = [
    { label: "General Ledger", desc: "All transactions with running balances", href: "/accounting/ledger", icon: BookOpen, color: "text-blue-400 bg-blue-500/10" },
    { label: "Journal Entries", desc: "Create & view double-entry journals", href: "/accounting/journals", icon: FileText, color: "text-purple-400 bg-purple-500/10" },
    { label: "Trial Balance", desc: "Verify DR = CR across all accounts", href: "/accounting/trial-balance", icon: Scale, color: "text-amber-400 bg-amber-500/10" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting & Ledger</h1>
          <p className="text-zinc-400 mt-2">Chart of Accounts, journal entries, and financial reporting.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          <Plus className="w-4 h-4" /> New Account
        </button>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {navCards.map(card => (
          <Link key={card.href} href={card.href}>
            <div className="glass p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{card.label}</h3>
              </div>
              <p className="text-xs text-zinc-500">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Chart of Accounts Tree */}
      <AccountTree accounts={accounts} balances={balances} onAddAccount={() => setShowForm(true)} />

      {/* Add Account Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#050505] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">New Account</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Account Code *</label>
                <input value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono" placeholder="e.g. 5600" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Account Name *</label>
                <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" placeholder="e.g. Insurance Expense" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Type</label>
                <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 appearance-none">
                  <option value="asset" className="bg-[#050505]">Asset</option>
                  <option value="liability" className="bg-[#050505]">Liability</option>
                  <option value="equity" className="bg-[#050505]">Equity</option>
                  <option value="revenue" className="bg-[#050505]">Revenue</option>
                  <option value="expense" className="bg-[#050505]">Expense</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Parent Account</label>
                <select value={formData.parent_id} onChange={e => setFormData(p => ({ ...p, parent_id: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 appearance-none">
                  <option value="" className="bg-[#050505]">— None (Root) —</option>
                  {accounts.map(a => <option key={a.id} value={a.id} className="bg-[#050505]">{a.code} - {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Description</label>
                <input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" />
              </div>
              <button onClick={handleAddAccount} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all text-sm">Create Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
