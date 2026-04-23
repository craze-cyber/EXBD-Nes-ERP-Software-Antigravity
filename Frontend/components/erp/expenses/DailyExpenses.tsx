"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import { Plus, X, Search, FileText, Calendar, Filter } from "lucide-react";
import { useApprovalAction } from "@/hooks/useApprovalAction";

export default function DailyExpenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const { submitChange, saveLabel } = useApprovalAction();

  const [showModal, setShowModal] = useState(false);
  const [dateFilter, setDateFilter] = useState("this_month");
  
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: "",
    description: "",
    amount: "",
    paid_by: "",
    payment_method: "cash",
    client_id: "",
    worker_search: "",
    worker_id: "",
    notes: "",
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [selectedWorkerFull, setSelectedWorkerFull] = useState<any>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [dateFilter]);

  const load = async () => {
    const [{ data: c }, { data: w }] = await Promise.all([
      insforge.database.from("clients").select("*").order("legal_name"),
      insforge.database.from("workers").select("id, name_en, emp_id, iqama_no")
    ]);
    setClients(c || []);
    setWorkers(w || []);
    fetchExpenses();
  };

  const fetchExpenses = async () => {
    let q = insforge.database.from("daily_expenses")
      .select("*, clients(legal_name), workers(name_en, emp_id)")
      .order("expense_date", { ascending: false });
      
    // Apply naive date filter
    const today = new Date();
    if (dateFilter === "today") {
      q = q.eq("expense_date", today.toISOString().split('T')[0]);
    } else if (dateFilter === "this_month") {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      q = q.gte("expense_date", monthStart);
    }
    
    const { data } = await q;
    setExpenses(data || []);
  };

  const searchedWorkers = workers.filter(w => {
    if (!form.worker_search) return false;
    const q = form.worker_search.toLowerCase();
    return w.name_en?.toLowerCase().includes(q) || w.emp_id?.toLowerCase().includes(q) || w.iqama_no?.toLowerCase().includes(q);
  }).slice(0, 5);

  const handleCreate = async () => {
    if (!form.expense_date || !form.category || !form.description || !form.amount) {
      toast.error("Please fill in all required fields.");
      return;
    }

    let receipt_url = null;
    
    // Upload receipt if provided
    if (file) {
      const ext = file.name.split('.').pop();
      const fileName = `daily-${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadErr } = await insforge.storage.from("receipts").upload(fileName, file);
      if (uploadErr) {
        toast.error("Failed to upload receipt: " + uploadErr.message);
      } else {
        const rawUrl = insforge.storage.from("receipts").getPublicUrl(fileName);
        // Supabase returns { data: { publicUrl } } but older or different SDKs might return string directly
        receipt_url = typeof rawUrl === "string" ? rawUrl : ((rawUrl as any).data?.publicUrl ?? null);
      }
    }

    const expensePayload = {
      expense_date: form.expense_date,
      category: form.category,
      description: form.description,
      amount: parseFloat(form.amount),
      paid_by: form.paid_by || null,
      payment_method: form.payment_method,
      client_id: form.client_id || null,
      worker_id: form.worker_id || null,
      notes: form.notes || null,
      receipt_url: receipt_url,
      status: "pending",
    };

    const result = await submitChange({
      action: "expense_create",
      module: "Expenses",
      recordLabel: `${form.category} - SAR ${form.amount}`,
      afterData: expensePayload,
    });

    if (result?.status === "executed") {
      const { error } = await insforge.database.from("daily_expenses").insert([expensePayload]);
      if (error) { toast.error(error.message); return; }
      setShowModal(false);
      resetForm();
      fetchExpenses();
    } else if (result?.status === "pending") {
      setShowModal(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setForm({
      expense_date: new Date().toISOString().split('T')[0],
      category: "", description: "", amount: "", paid_by: "", payment_method: "cash",
      client_id: "", worker_search: "", worker_id: "", notes: ""
    });
    setFile(null);
    setSelectedWorkerFull(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between glass p-4 rounded-2xl border border-white/5">
        <div className="flex gap-2 items-center">
          <Filter className="w-4 h-4 text-zinc-400" />
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)} 
            className="bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm outline-none appearance-none min-w-[150px]"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
          </select>
        </div>
        
        <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-white/5 text-[10px] uppercase font-bold text-zinc-500 border-b border-white/5">
            <tr>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Description</th>
              <th className="px-5 py-4 text-right">Amount (SAR)</th>
              <th className="px-5 py-4">Paid By</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-center">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-white/[0.02]">
                <td className="px-5 py-3 font-mono text-zinc-300">{e.expense_date}</td>
                <td className="px-5 py-3 text-white font-medium">{e.category}</td>
                <td className="px-5 py-3 text-zinc-400 max-w-[200px] truncate">{e.description}</td>
                <td className="px-5 py-3 text-right font-mono font-bold text-red-400">{e.amount?.toFixed(2)}</td>
                <td className="px-5 py-3 text-zinc-400">{e.paid_by || "—"}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase
                    ${e.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                      e.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  {e.receipt_url ? (
                    <a href={e.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-1.5 hover:bg-white/10 rounded-lg text-emerald-400 transition-colors">
                      <FileText className="w-4 h-4" />
                    </a>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-zinc-500">No daily expenses found for this period.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#050505] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Add Daily Expense</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase">Expense Date *</label>
                  <div className="relative mt-1">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm outline-none [color-scheme:dark]" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase">Amount (SAR) *</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none font-mono" placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Category *</label>
                <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none placeholder:text-zinc-600" placeholder="e.g. Office Supplies, Food, Transport..." list="categories" />
                <datalist id="categories">
                  <option value="Office Supplies" />
                  <option value="Food & Beverages" />
                  <option value="Transportation" />
                  <option value="Maintenance" />
                  <option value="Miscellaneous" />
                </datalist>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Description *</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none" placeholder="Brief description of the specific expense..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase">Paid By</label>
                  <input type="text" value={form.paid_by} onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none" placeholder="Name of person..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase">Payment Method</label>
                  <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none appearance-none">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase">Client (Optional)</label>
                  <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none appearance-none">
                    <option value="">No specific client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
                  </select>
                </div>
                
                <div className="relative">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Worker (Optional)</label>
                  {selectedWorkerFull ? (
                    <div className="mt-1 flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <p className="text-sm text-white font-medium pl-2">{selectedWorkerFull.name_en}</p>
                      <button onClick={(e) => { e.preventDefault(); setForm(f => ({ ...f, worker_id: "" })); setSelectedWorkerFull(null); }} className="p-1 hover:bg-emerald-500/20 rounded text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input value={form.worker_search} onChange={e => setForm(f => ({...f, worker_search: e.target.value}))} placeholder="Search by name, EMP ID..." className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm outline-none" />
                      </div>
                      {searchedWorkers.length > 0 && (
                        <div className="absolute w-full mt-1 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-10 shadow-xl">
                          {searchedWorkers.map(w => (
                            <button key={w.id} onClick={(e) => { e.preventDefault(); setForm(f => ({...f, worker_id: w.id, worker_search: ""})); setSelectedWorkerFull(w); }} className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm">
                              {w.name_en} <span className="text-zinc-500 text-xs">({w.emp_id})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Receipt Upload</label>
                <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20" />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Notes (Optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none resize-none" />
              </div>

            </div>
            <div className="p-6 border-t border-white/10 bg-black/40 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white">Cancel</button>
              <button onClick={handleCreate} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-all">Save Expense</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
