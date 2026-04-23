"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import { Plus, X, Search, AlertTriangle, DollarSign, Calendar, FileText, ChevronRight, Download } from "lucide-react";
import { exportToXLSX } from "@/lib/report-generator";
import Link from "next/link";
import { useApprovalAction } from "@/hooks/useApprovalAction";

export default function LiabilitiesPage() {
  const [liabilities, setLiabilities] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const { submitChange, saveLabel } = useApprovalAction();

  // Filters
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [form, setForm] = useState({
    liability_type_id: "", total_amount: "", recovery_method: "fixed",
    fixed_deduction: "", percentage_deduction: "", incident_date: "",
    reference_no: "", notes: "",
  });

  // Detail drawer
  const [selectedLiability, setSelectedLiability] = useState<any>(null);
  const [recoveries, setRecoveries] = useState<any[]>([]);

  useEffect(() => { load(); }, []);
  useEffect(() => { fetchLiabilities(); }, [filterClient, filterStatus, filterType]);

  const load = async () => {
    const { data: t } = await insforge.database.from("liability_types").select("*").eq("is_active", true).order("name");
    setTypes(t || []);
    const { data: c } = await insforge.database.from("clients").select("*").order("legal_name");
    setClients(c || []);
    const { data: w } = await insforge.database.from("workers").select("id, name_en, emp_id, iqama_no, client_id, basic_salary, clients(legal_name)");
    setWorkers(w || []);
    fetchLiabilities();
  };

  const fetchLiabilities = async () => {
    let q = insforge.database.from("worker_liabilities")
      .select("*, workers(name_en, emp_id, iqama_no), clients(legal_name), liability_types(name)")
      .order("created_at", { ascending: false });
    if (filterClient) q = q.eq("client_id", filterClient);
    if (filterStatus) q = q.eq("status", filterStatus);
    if (filterType) q = q.eq("liability_type_id", filterType);
    const { data } = await q;
    setLiabilities(data || []);
  };

  const filteredLiabilities = liabilities.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return l.workers?.name_en?.toLowerCase().includes(q) || l.workers?.emp_id?.toLowerCase().includes(q) || l.workers?.iqama_no?.toLowerCase().includes(q);
  });

  const searchedWorkers = workers.filter(w => {
    if (!workerSearch) return false;
    const q = workerSearch.toLowerCase();
    return w.name_en?.toLowerCase().includes(q) || w.emp_id?.toLowerCase().includes(q) || w.iqama_no?.toLowerCase().includes(q);
  }).slice(0, 8);

  const handleCreate = async () => {
    if (!selectedWorker) { toast.error("Select a worker first."); return; }
    if (!form.liability_type_id) { toast.error("Select a liability type."); return; }
    if (!form.total_amount || parseFloat(form.total_amount) <= 0) { toast.error("Enter a valid amount."); return; }

    const typeName = types.find(t => t.id === form.liability_type_id)?.name || "Liability";

    const liabilityPayload = {
      worker_id: selectedWorker.id,
      client_id: selectedWorker.client_id,
      liability_type_id: form.liability_type_id,
      liability_name: typeName,
      total_amount: parseFloat(form.total_amount),
      recovered_amount: 0,
      recovery_method: form.recovery_method,
      fixed_deduction: form.recovery_method === "fixed" ? parseFloat(form.fixed_deduction) || 0 : null,
      percentage_deduction: form.recovery_method === "percentage" ? parseFloat(form.percentage_deduction) || 0 : null,
      incident_date: form.incident_date || null,
      reference_no: form.reference_no || null,
      notes: form.notes || null,
      status: "active",
    };

    const result = await submitChange({
      action: "liability_create",
      module: "Liabilities",
      recordLabel: `${typeName} - ${selectedWorker.name_en}`,
      afterData: liabilityPayload,
    });

    if (result?.status === "executed") {
      const { error } = await insforge.database.from("worker_liabilities").insert([liabilityPayload]);
      if (error) { toast.error(error.message); return; }
      setShowModal(false);
      resetForm();
      fetchLiabilities();
    } else if (result?.status === "pending") {
      setShowModal(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setSelectedWorker(null);
    setWorkerSearch("");
    setForm({ liability_type_id: "", total_amount: "", recovery_method: "fixed", fixed_deduction: "", percentage_deduction: "", incident_date: "", reference_no: "", notes: "" });
  };

  const openDetail = async (lib: any) => {
    setSelectedLiability(lib);
    const { data } = await insforge.database.from("liability_recoveries")
      .select("*")
      .eq("liability_id", lib.id)
      .order("created_at", { ascending: false });
    setRecoveries(data || []);
  };

  const statusColor: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    fully_recovered: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    written_off: "bg-red-500/10 text-red-400 border-red-500/20",
    suspended: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  const estMonths = () => {
    const total = parseFloat(form.total_amount) || 0;
    if (form.recovery_method === "fixed") {
      const monthly = parseFloat(form.fixed_deduction) || 0;
      return monthly > 0 ? Math.ceil(total / monthly) : 0;
    } else {
      const pct = parseFloat(form.percentage_deduction) || 0;
      const salary = selectedWorker?.basic_salary || 4000;
      const monthly = salary * pct / 100;
      return monthly > 0 ? Math.ceil(total / monthly) : 0;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liability Management</h1>
          <p className="text-zinc-400 mt-2">Track worker obligations and auto-deduct from payroll.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/liabilities/types">
            <button className="px-4 py-2.5 border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-all">Manage Types</button>
          </Link>
          <Link href="/liabilities/recovery-report">
            <button className="px-4 py-2.5 border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-all">Recovery Report</button>
          </Link>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Plus className="w-4 h-4" /> New Liability
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search worker name, EMP ID, iqama..." className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500/50" />
        </div>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none min-w-[150px] appearance-none">
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none appearance-none">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="fully_recovered">Fully Recovered</option>
          <option value="written_off">Written Off</option>
          <option value="suspended">Suspended</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none appearance-none">
          <option value="">All Types</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button onClick={() => exportToXLSX(filteredLiabilities.map(l => ({ Worker: l.workers?.name_en, EMP_ID: l.workers?.emp_id, Type: l.liability_name, Total: l.total_amount, Recovered: l.recovered_amount, Remaining: (l.total_amount || 0) - (l.recovered_amount || 0), Method: l.recovery_method, Status: l.status })), "Liabilities")} className="px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold flex items-center gap-1 border border-white/5">
          <Download className="w-3 h-3" /> Export
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active", val: liabilities.filter(l => l.status === "active").length, color: "text-emerald-400" },
          { label: "Total Outstanding", val: `SAR ${liabilities.filter(l => l.status === "active").reduce((s, l) => s + ((l.total_amount || 0) - (l.recovered_amount || 0)), 0).toFixed(2)}`, color: "text-red-400" },
          { label: "Fully Recovered", val: liabilities.filter(l => l.status === "fully_recovered").length, color: "text-blue-400" },
          { label: "Total Recovered", val: `SAR ${liabilities.reduce((s, l) => s + (l.recovered_amount || 0), 0).toFixed(2)}`, color: "text-emerald-400" },
        ].map((s, i) => (
          <div key={i} className="glass p-4 rounded-2xl border border-white/5 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-white/5 text-[10px] uppercase font-bold text-zinc-500 border-b border-white/5">
            <tr>
              <th className="px-5 py-4">Worker</th>
              <th className="px-5 py-4">EMP ID</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4 text-right">Total</th>
              <th className="px-5 py-4 text-right">Recovered</th>
              <th className="px-5 py-4 text-right">Remaining</th>
              <th className="px-5 py-4">Method</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredLiabilities.map(l => {
              const remaining = (l.total_amount || 0) - (l.recovered_amount || 0);
              return (
                <tr key={l.id} className="hover:bg-white/[0.02] cursor-pointer" onClick={() => openDetail(l)}>
                  <td className="px-5 py-3 font-bold text-white">{l.workers?.name_en || "—"}</td>
                  <td className="px-5 py-3 font-mono text-zinc-400">{l.workers?.emp_id || "—"}</td>
                  <td className="px-5 py-3 text-zinc-300">{l.liability_name}</td>
                  <td className="px-5 py-3 text-right font-mono text-zinc-300">{l.total_amount?.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-mono text-emerald-400">{l.recovered_amount?.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-mono text-red-400 font-bold">{remaining.toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 uppercase">{l.recovery_method === "fixed" ? `SAR ${l.fixed_deduction}/mo` : `${l.percentage_deduction}%/mo`}</span>
                  </td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${statusColor[l.status] || ""}`}>{l.status}</span></td>
                  <td className="px-5 py-3"><ChevronRight className="w-4 h-4 text-zinc-600" /></td>
                </tr>
              );
            })}
            {filteredLiabilities.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-zinc-500">No liabilities found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      {selectedLiability && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedLiability(null)}>
          <div className="w-full max-w-lg bg-[#050505] border-l border-white/10 h-full overflow-y-auto animate-in slide-in-from-right-8 duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Liability Detail</h2>
              <button onClick={() => setSelectedLiability(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[10px] text-zinc-500 uppercase">Worker</p><p className="font-bold text-white">{selectedLiability.workers?.name_en}</p></div>
                <div><p className="text-[10px] text-zinc-500 uppercase">Type</p><p className="text-white">{selectedLiability.liability_name}</p></div>
                <div><p className="text-[10px] text-zinc-500 uppercase">Total Amount</p><p className="font-mono text-white">SAR {selectedLiability.total_amount?.toFixed(2)}</p></div>
                <div><p className="text-[10px] text-zinc-500 uppercase">Remaining</p><p className="font-mono text-red-400 font-bold">SAR {((selectedLiability.total_amount || 0) - (selectedLiability.recovered_amount || 0)).toFixed(2)}</p></div>
                <div><p className="text-[10px] text-zinc-500 uppercase">Method</p><p className="text-white uppercase">{selectedLiability.recovery_method}</p></div>
                <div><p className="text-[10px] text-zinc-500 uppercase">Status</p><p className={`font-bold uppercase ${selectedLiability.status === "active" ? "text-emerald-400" : "text-zinc-400"}`}>{selectedLiability.status}</p></div>
              </div>
              {selectedLiability.notes && <div><p className="text-[10px] text-zinc-500 uppercase">Notes</p><p className="text-xs text-zinc-400 mt-1">{selectedLiability.notes}</p></div>}

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-zinc-500">Recovery Progress</span><span className="text-emerald-400 font-bold">{Math.round(((selectedLiability.recovered_amount || 0) / (selectedLiability.total_amount || 1)) * 100)}%</span></div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${((selectedLiability.recovered_amount || 0) / (selectedLiability.total_amount || 1)) * 100}%` }} /></div>
              </div>

              {/* Recovery History */}
              <div>
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Recovery Timeline</h4>
                {recoveries.length > 0 ? (
                  <div className="space-y-2">
                    {recoveries.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                        <div>
                          <p className="text-xs font-mono text-zinc-300">{r.pay_period}</p>
                          <p className="text-[10px] text-zinc-500">Net at time: SAR {r.net_salary_at_time?.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono text-red-400 font-bold">-{r.deducted_amount?.toFixed(2)}</p>
                          <p className="text-[10px] text-zinc-500">Rem: {r.remaining_after?.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 text-center py-4">No recovery transactions yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Liability Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#050505] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">New Liability</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Worker */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">1. Select Worker</h3>
                {selectedWorker ? (
                  <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                    <div>
                      <p className="font-bold text-white">{selectedWorker.name_en}</p>
                      <p className="text-xs text-zinc-500 font-mono">{selectedWorker.emp_id} · {selectedWorker.iqama_no} · {selectedWorker.clients?.legal_name}</p>
                    </div>
                    <button onClick={() => setSelectedWorker(null)} className="text-xs text-red-400 font-bold">Change</button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input value={workerSearch} onChange={e => setWorkerSearch(e.target.value)} placeholder="Search by name, EMP ID, or Iqama..." className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500/50" />
                    </div>
                    {searchedWorkers.length > 0 && (
                      <div className="mt-2 border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                        {searchedWorkers.map(w => (
                          <button key={w.id} onClick={() => { setSelectedWorker(w); setWorkerSearch(""); }} className="w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors">
                            <p className="text-sm font-medium text-white">{w.name_en}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">{w.emp_id} · {w.iqama_no}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Liability Info */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">2. Liability Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500">Type *</label>
                    <select value={form.liability_type_id} onChange={e => setForm(p => ({ ...p, liability_type_id: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none appearance-none">
                      <option value="">Select type...</option>
                      {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500">Total Amount (SAR) *</label>
                    <input type="number" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none font-mono" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500">Incident Date</label>
                    <input type="date" value={form.incident_date} onChange={e => setForm(p => ({ ...p, incident_date: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500">Reference No</label>
                    <input value={form.reference_no} onChange={e => setForm(p => ({ ...p, reference_no: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-zinc-500">Notes</label>
                    <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none resize-none" />
                  </div>
                </div>
              </div>

              {/* Section 3: Recovery Settings */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">3. Recovery Settings</h3>
                <div className="flex gap-2 mb-4">
                  {["fixed", "percentage"].map(m => (
                    <button key={m} onClick={() => setForm(p => ({ ...p, recovery_method: m }))} className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${form.recovery_method === m ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-zinc-400"}`}>
                      {m === "fixed" ? "Fixed SAR/month" : "% of Net Salary/month"}
                    </button>
                  ))}
                </div>
                {form.recovery_method === "fixed" ? (
                  <div>
                    <label className="text-xs font-bold text-zinc-500">Monthly Deduction (SAR)</label>
                    <input type="number" value={form.fixed_deduction} onChange={e => setForm(p => ({ ...p, fixed_deduction: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none font-mono" placeholder="500" />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-zinc-500">Monthly Percentage (%)</label>
                    <input type="number" value={form.percentage_deduction} onChange={e => setForm(p => ({ ...p, percentage_deduction: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none font-mono" placeholder="10" />
                    {selectedWorker && form.percentage_deduction && (
                      <p className="text-xs text-zinc-500 mt-2">≈ SAR {((selectedWorker.basic_salary || 4000) * parseFloat(form.percentage_deduction) / 100).toFixed(2)}/month based on current salary</p>
                    )}
                  </div>
                )}
                {form.total_amount && (form.fixed_deduction || form.percentage_deduction) && (
                  <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <p className="text-xs text-amber-400 font-bold">Estimated recovery in {estMonths()} months</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-white/10 bg-black/40 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white">Cancel</button>
              <button onClick={handleCreate} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-all">Create Liability</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
