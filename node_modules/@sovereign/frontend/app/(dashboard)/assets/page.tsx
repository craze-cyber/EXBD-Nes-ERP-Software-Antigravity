"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { Plus, Search, Eye, Filter, Settings, Hammer, Trash2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import AddAssetModal from "@/components/erp/assets/AddAssetModal";
import AssignAssetModal from "@/components/erp/assets/AssignAssetModal";
import MaintenanceModal from "@/components/erp/assets/MaintenanceModal";
import { toast } from "sonner";

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  const [showAdd, setShowAdd] = useState(false);
  const [assignAsset, setAssignAsset] = useState<any>(null);
  const [maintAsset, setMaintAsset] = useState<any>(null);

  useEffect(() => {
    fetchAssets();
  }, [activeTab]);

  const fetchAssets = async () => {
    let q = insforge.database
      .from("assets")
      .select("*, workers(name_en, emp_id)")
      .order("created_at", { ascending: false });
      
    if (activeTab !== "all") {
      q = q.eq("category", activeTab);
    }
    
    const { data } = await q;
    setAssets(data || []);
  };

  const filteredAssets = assets.filter(a => {
    if (!searchQuery) return true;
    const sq = searchQuery.toLowerCase();
    return a.name?.toLowerCase().includes(sq) || 
           a.asset_code?.toLowerCase().includes(sq) || 
           a.serial_number?.toLowerCase().includes(sq) ||
           a.workers?.name_en?.toLowerCase().includes(sq);
  });

  const totalAssets = assets.length;
  const totalAssigned = assets.filter(a => a.status === 'assigned').length;
  const totalMaint = assets.filter(a => a.status === 'under_maintenance').length;
  const totalValue = assets.reduce((sum, a) => sum + (parseFloat(a.current_value) || 0), 0);

  const handleDispose = async (id: string, condition: string) => {
    if(!confirm("Are you sure you want to mark this asset as disposed?")) return;
    try {
      await insforge.database.from("asset_movements").insert([{
        asset_id: id,
        movement_type: "disposed",
        movement_date: new Date().toISOString().split('T')[0],
        condition_before: condition,
        notes: "Marked as disposed by user"
      }]);
      
      const { error } = await insforge.database.from("assets").update({ status: "disposed" }).eq("id", id);
      if (error) throw error;
      
      toast.success("Asset disposed.");
      fetchAssets();
    } catch(e:any) {
      toast.error(e.message);
    }
  };

  const catMap:Record<string,string> = {
    it_equipment: "IT Equipment", office_furniture: "Furniture", vehicle: "Vehicle", tools: "Tools", safety_equipment: "Safety", communication: "Comms", medical: "Medical", other: "Other"
  };
  const statusColor:Record<string,string> = {
    available: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    assigned: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    under_maintenance: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    disposed: "bg-red-500/10 text-red-500 border-red-500/20",
    lost: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset & Equipment</h1>
          <p className="text-zinc-400 mt-2">Manage lifecycle, assignments, and depreciations.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/assets/reports">
            <button className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold border border-white/5 transition-all">
              Reports & Depreciations
            </button>
          </Link>
          <button 
            onClick={() => setShowAdd(true)}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-bold tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
          >
            <Plus className="w-4 h-4" /> Register Asset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-2xl border border-white/5 text-center">
          <p className="text-3xl font-bold text-white">{totalAssets}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Total Assets</p>
        </div>
        <div className="glass p-5 rounded-2xl border border-white/5 text-center">
          <p className="text-3xl font-bold text-blue-400">{totalAssigned}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Assigned</p>
        </div>
        <div className="glass p-5 rounded-2xl border border-white/5 text-center">
          <p className="text-3xl font-bold text-amber-400">{totalMaint}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Maintenance</p>
        </div>
        <div className="glass p-5 rounded-2xl border border-white/5 text-center">
          <p className="text-2xl font-bold text-emerald-400 mt-1">SAR {totalValue.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Total Value</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex space-x-1 border-b border-white/10 overflow-x-auto pb-px">
          {["all", "it_equipment", "vehicle", "tools", "safety_equipment", "other"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`relative px-4 py-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === t ? "text-emerald-400 border-b-2 border-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}>
              {t === "all" ? "All Assets" : catMap[t]}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by Code, Name, Serial or Worker..." className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-sm outline-none" />
        </div>
      </div>

      <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#050505] text-[10px] uppercase font-bold text-zinc-500 border-b border-white/5">
            <tr>
              <th className="px-5 py-4">Asset Details</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4 text-center">Status</th>
              <th className="px-5 py-4">Assigned To</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4 text-right">Value (SAR)</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredAssets.map(a => (
              <tr key={a.id} className="hover:bg-white/[0.02]">
                <td className="px-5 py-3">
                  <p className="font-bold text-white">{a.name} <span className="text-zinc-500 text-xs ml-1 font-normal">({a.brand})</span></p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{a.asset_code} · SN: {a.serial_number || "N/A"}</p>
                </td>
                <td className="px-5 py-3 text-zinc-400 text-xs">{catMap[a.category]}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${statusColor[a.status]}`}>{a.status.replace('_', ' ')}</span>
                </td>
                <td className="px-5 py-3">
                  {a.status === 'assigned' && a.workers ? (
                    <div><p className="text-xs font-bold text-blue-400">{a.workers.name_en}</p><p className="text-[10px] text-zinc-500">{a.workers.emp_id}</p></div>
                  ) : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-5 py-3 text-xs text-zinc-400">{a.location || a.camp_name || "Warehouse"}</td>
                <td className="px-5 py-3 text-right font-mono text-emerald-400 font-bold">{a.current_value?.toLocaleString()}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/assets/${a.id}`}>
                      <button className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors" title="View"><Eye className="w-4 h-4"/></button>
                    </Link>
                    {a.status === 'available' && (
                      <button onClick={() => setAssignAsset(a)} className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 transition-colors" title="Assign"><ShieldAlert className="w-4 h-4"/></button>
                    )}
                    {(a.status === 'available' || a.status === 'assigned') && (
                      <button onClick={() => setMaintAsset(a)} className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg text-amber-400 transition-colors" title="Maintenance"><Hammer className="w-4 h-4"/></button>
                    )}
                    {a.status !== 'disposed' && (
                      <button onClick={() => handleDispose(a.id, a.condition)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 transition-colors" title="Dispose"><Trash2 className="w-4 h-4"/></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredAssets.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-zinc-500">No assets found.</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && <AddAssetModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); fetchAssets(); }} />}
      {assignAsset && <AssignAssetModal asset={assignAsset} onClose={() => setAssignAsset(null)} onSuccess={() => { setAssignAsset(null); fetchAssets(); }} />}
      {maintAsset && <MaintenanceModal asset={maintAsset} onClose={() => setMaintAsset(null)} onSuccess={() => { setMaintAsset(null); fetchAssets(); }} />}
    </div>
  );
}
