"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import { Plus, X, Edit2, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LiabilityTypesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", default_recovery_method: "fixed" });

  useEffect(() => { fetchTypes(); }, []);

  const fetchTypes = async () => {
    const { data } = await insforge.database.from("liability_types").select("*").order("name");
    setTypes(data || []);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required."); return; }
    if (editId) {
      const { error } = await insforge.database.from("liability_types").update({ name: form.name, description: form.description || null, default_recovery_method: form.default_recovery_method }).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Type updated!");
    } else {
      const { error } = await insforge.database.from("liability_types").insert([{ name: form.name, description: form.description || null, default_recovery_method: form.default_recovery_method }]);
      if (error) { toast.error(error.message); return; }
      toast.success("Type created!");
    }
    setShowForm(false); setEditId(null);
    setForm({ name: "", description: "", default_recovery_method: "fixed" });
    fetchTypes();
  };

  const handleDelete = async (id: string) => {
    // Check if linked to active liabilities
    const { data } = await insforge.database.from("worker_liabilities").select("id").eq("liability_type_id", id).eq("status", "active").limit(1);
    if (data && data.length > 0) { toast.error("Cannot delete — linked to active liabilities."); return; }
    if (!window.confirm("Delete this liability type?")) return;
    await insforge.database.from("liability_types").delete().eq("id", id);
    toast.success("Type deleted.");
    fetchTypes();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/liabilities" className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liability Types</h1>
          <p className="text-zinc-400 mt-1">Manage category names for worker liabilities.</p>
        </div>
      </div>

      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
        <div className="divide-y divide-white/5">
          {types.map(t => (
            <div key={t.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02]">
              <div>
                <p className="text-sm font-bold text-white">{t.name}</p>
                <p className="text-[10px] text-zinc-500">{t.description || "No description"} · Default: {t.default_recovery_method}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditId(t.id); setForm({ name: t.name, description: t.description || "", default_recovery_method: t.default_recovery_method }); setShowForm(true); }} className="p-2 bg-white/5 hover:bg-emerald-500/20 rounded-lg transition-all"><Edit2 className="w-3.5 h-3.5 text-zinc-400" /></button>
                <button onClick={() => handleDelete(t.id)} className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5 text-zinc-400" /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 border-t border-white/5 bg-black/20">
          <button onClick={() => { setEditId(null); setForm({ name: "", description: "", default_recovery_method: "fixed" }); setShowForm(true); }} className="text-xs text-emerald-400 font-bold flex items-center gap-1"><Plus className="w-3 h-3" /> Add New Type</button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#050505] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-white">{editId ? "Edit Type" : "New Type"}</h2><button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <div><label className="text-xs font-bold text-zinc-400">Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none" /></div>
            <div><label className="text-xs font-bold text-zinc-400">Description</label><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none" /></div>
            <div><label className="text-xs font-bold text-zinc-400">Default Recovery Method</label>
              <select value={form.default_recovery_method} onChange={e => setForm(p => ({ ...p, default_recovery_method: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none appearance-none">
                <option value="fixed">Fixed Amount</option><option value="percentage">Percentage</option>
              </select>
            </div>
            <button onClick={handleSave} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-sm">{editId ? "Update" : "Create"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
