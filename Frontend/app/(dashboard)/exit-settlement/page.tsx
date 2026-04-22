"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { Plus, Search, FileText, CheckCircle, Download, CreditCard } from "lucide-react";
import { exportToXLSX } from "@/lib/report-generator";
import SettlementModal from "@/components/erp/settlement/SettlementModal";
import Link from "next/link";
import { toast } from "sonner";

export default function ExitSettlementPage() {
  const [exits, setExits] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: cData } = await insforge.database.from("clients").select("id, legal_name");
    setClients(cData || []);
    fetchExits();
  };

  const fetchExits = async () => {
    let q = insforge.database
      .from("worker_exits")
      .select("*, clients(legal_name)")
      .order("created_at", { ascending: false });
      
    if (filterClient) q = q.eq("client_id", filterClient);
    if (filterStatus) q = q.eq("status", filterStatus);
    
    const { data } = await q;
    setExits(data || []);
  };

  const filteredExits = exits.filter(e => {
    if (!searchQuery) return true;
    const sq = searchQuery.toLowerCase();
    return e.worker_name?.toLowerCase().includes(sq) || e.emp_id?.toLowerCase().includes(sq) || e.iqama_no?.toLowerCase().includes(sq);
  });

  const handleApprove = async (id: string, total: number) => {
    // Approve creates journal entries
    const { error } = await insforge.database
      .from("worker_exits")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", id);
      
    if (!error && total > 0) {
      await insforge.database.from("journal_entries").insert([
        { date: new Date().toISOString().split('T')[0], description: "EOSB Expense", account_code: "5300", debit: total, credit: 0 },
        { date: new Date().toISOString().split('T')[0], description: "Accrued EOSB Liability", account_code: "2100", debit: 0, credit: total }
      ]);
      toast.success("Approved and Accounting entries triggered");
      fetchExits();
    } else if (error) {
      toast.error(error.message);
    }
  };

  const handleMarkPaid = async (id: string, total: number) => {
    const { error } = await insforge.database
      .from("worker_exits")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
      
    if (!error && total > 0) {
      await insforge.database.from("journal_entries").insert([
        { date: new Date().toISOString().split('T')[0], description: "Clear Accrued EOSB", account_code: "2100", debit: total, credit: 0 },
        { date: new Date().toISOString().split('T')[0], description: "Bank Transfer", account_code: "1000", debit: 0, credit: total }
      ]);
      toast.success("Marked Paid and Bank reconciled");
      fetchExits();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worker Exit & Settlement</h1>
          <p className="text-zinc-400 mt-2">Manage end-of-service processes and labor clearances.</p>
        </div>
        <div className="flex gap-2">
          {/* Also requested 'as a full page', we provide link if they don't want modal */}
          <Link href="/exit-settlement/calculator">
            <button className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold border border-white/5 transition-all hidden md:block">
              Open Full Page Calc
            </button>
          </Link>
          <button 
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all"
          >
            <Plus className="w-4 h-4" /> New Settlement
          </button>
        </div>
      </div>

      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search employee..." className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm outline-none" />
        </div>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none appearance-none">
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none appearance-none">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="calculated">Calculated</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>
        <button onClick={() => exportToXLSX(filteredExits, "Settlements")} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors border border-white/5">
          <Download className="w-4 h-4" />
        </button>
      </div>

      <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#050505] text-[10px] uppercase font-bold text-zinc-500 border-b border-white/5">
            <tr>
              <th className="px-5 py-4">Worker</th>
              <th className="px-5 py-4">Exit Type</th>
              <th className="px-5 py-4 text-center">Service Yrs</th>
              <th className="px-5 py-4 text-right">EOSB</th>
              <th className="px-5 py-4 text-right">Net Settled</th>
              <th className="px-5 py-4 text-center">Status</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredExits.map(e => (
              <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3">
                  <p className="font-bold text-white">{e.worker_name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">{e.emp_id}</p>
                </td>
                <td className="px-5 py-3 text-zinc-400 capitalize">{e.exit_type?.replace(/_/g, " ")}</td>
                <td className="px-5 py-3 text-center font-mono font-bold text-zinc-300">{e.total_service_years}</td>
                <td className="px-5 py-3 text-right font-mono text-zinc-400">{e.eosb_amount?.toFixed(2)}</td>
                <td className="px-5 py-3 text-right font-mono font-bold text-indigo-400">{e.net_settlement?.toFixed(2)}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase
                    ${e.status === 'draft' ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' : 
                      e.status === 'calculated' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                      e.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      'bg-teal-500/10 text-teal-400 border-teal-500/20'}`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono text-zinc-500 text-xs">{e.termination_date}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors" title="View PDF">
                      <FileText className="w-4 h-4" />
                    </button>
                    {e.status === 'calculated' && (
                      <button onClick={() => handleApprove(e.id, e.net_settlement)} className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-emerald-400 transition-colors" title="Approve">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {e.status === 'approved' && (
                      <button onClick={() => handleMarkPaid(e.id, e.net_settlement)} className="p-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 rounded-lg text-teal-400 transition-colors" title="Mark Paid">
                        <CreditCard className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredExits.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-zinc-500">No settlement records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <SettlementModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchExits(); }} />
      )}
    </div>
  );
}
