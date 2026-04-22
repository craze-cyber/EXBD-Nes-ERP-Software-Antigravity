"use client";

import React, { useState } from "react";
import { insforge } from "@/lib/insforge";
import { X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  asset: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MaintenanceModal({ asset, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    maintenance_type: "scheduled",
    description: "",
    cost: "",
    vendor: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    notes: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.description) {
      toast.error("Description is required.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Insert Maintenance Record
      const { error: maintErr } = await insforge.database.from("asset_maintenance").insert([{
        asset_id: asset.id,
        maintenance_type: form.maintenance_type,
        description: form.description,
        cost: parseFloat(form.cost) || 0,
        vendor: form.vendor || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        notes: form.notes || null,
        status: "in_progress"
      }]);
      
      if (maintErr) throw maintErr;

      // 2. Insert Movement
      await insforge.database.from("asset_movements").insert([{
        asset_id: asset.id,
        movement_type: "maintenance_in",
        movement_date: form.start_date,
        condition_before: asset.condition,
        notes: "Moved to maintenance - " + form.description
      }]);

      // 3. Update Asset Status
      const { error: astErr } = await insforge.database.from("assets").update({
        status: "under_maintenance"
      }).eq("id", asset.id);
      
      if (astErr) throw astErr;

      toast.success("Maintenance logged successfully");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-[#0c0c0e] border border-white/10 rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden">
        
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#050505]">
          <h2 className="text-lg font-bold text-white tracking-tight">Log Maintenance</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Target Asset</p>
              <p className="text-sm font-bold text-amber-400 mt-1">{asset.name}</p>
            </div>
            <p className="text-sm font-mono text-zinc-400">{asset.asset_code}</p>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Type</label>
            <select value={form.maintenance_type} onChange={e => setForm(f => ({...f, maintenance_type: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-zinc-300 outline-none appearance-none">
              <option value="scheduled">Scheduled</option>
              <option value="breakdown">Breakdown</option>
              <option value="preventive">Preventive</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Description *</label>
            <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none" placeholder="e.g. Oil Change, Screen Replacement..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Vendor / Service Center</label>
              <input value={form.vendor} onChange={e => setForm(f => ({...f, vendor: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none" placeholder="Company Name..." />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Est. Cost (SAR)</label>
              <input type="number" value={form.cost} onChange={e => setForm(f => ({...f, cost: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm font-mono text-white outline-none" placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white outline-none [color-scheme:dark]" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">End Date (Expected)</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white outline-none [color-scheme:dark]" />
            </div>
          </div>

          <div>
             <label className="text-xs font-bold text-zinc-500 uppercase">Notes</label>
             <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none resize-none" placeholder="Issues logged..." />
          </div>

        </div>

        <div className="p-6 border-t border-white/5 bg-[#050505] flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white">Cancel</button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
          >
            {isSubmitting ? "Logging..." : "Commit to Maintenance"}
          </button>
        </div>
      </div>
    </div>
  );
}
