"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { X, Search } from "lucide-react";
import { toast } from "sonner";

interface Props {
  asset: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignAssetModal({ asset, onClose, onSuccess }: Props) {
  const [workerSearch, setWorkerSearch] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState("");
  const [condition, setCondition] = useState(asset.condition || "good");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (workerSearch.length >= 3) {
      const delay = setTimeout(async () => {
        const { data } = await insforge.database
          .from("workers")
          .select("id, name_en, iqama_no, emp_id")
          .or(`iqama_no.ilike.%${workerSearch}%,emp_id.ilike.%${workerSearch}%,name_en.ilike.%${workerSearch}%`)
          .limit(5);
        setSearchResults(data || []);
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
    }
  }, [workerSearch]);

  const selectWorker = (w: any) => {
    setSelectedWorker(w);
    setWorkerSearch("");
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (!selectedWorker) {
      toast.error("Please select a worker to assign.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Insert Movement Record
      const { error: moveErr } = await insforge.database.from("asset_movements").insert([{
        asset_id: asset.id,
        movement_type: "assigned",
        to_worker: selectedWorker.id,
        movement_date: date,
        condition_before: asset.condition,
        notes: notes || null
      }]);
      if (moveErr) throw moveErr;

      // 2. Update Asset
      const { error: assignErr } = await insforge.database.from("assets").update({
        status: "assigned",
        assigned_to_worker: selectedWorker.id,
        assigned_date: date,
        expected_return_date: returnDate || null,
        condition: condition
      }).eq("id", asset.id);
      
      if (assignErr) throw assignErr;

      toast.success("Asset assigned successfully");
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
          <h2 className="text-lg font-bold text-white tracking-tight">Assign Asset</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Target Asset</p>
              <p className="text-sm font-bold text-emerald-400 mt-1">{asset.name}</p>
            </div>
            <p className="text-sm font-mono text-zinc-400">{asset.asset_code}</p>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Worker Search</label>
            {selectedWorker ? (
              <div className="mt-1 flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-white">{selectedWorker.name_en}</p>
                  <p className="text-xs text-blue-400 font-mono mt-0.5">{selectedWorker.emp_id} · {selectedWorker.iqama_no}</p>
                </div>
                <button onClick={() => setSelectedWorker(null)} className="text-xs font-bold text-red-400 hover:text-red-300">Change</button>
              </div>
            ) : (
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                <input 
                  value={workerSearch} 
                  onChange={e => setWorkerSearch(e.target.value)} 
                  placeholder="Search by Iqama or EMP ID..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-[#15151a] border border-white/10 rounded-xl text-sm font-mono text-white outline-none focus:border-emerald-500" 
                />
                {searchResults.length > 0 && (
                  <div className="absolute w-full mt-1 bg-[#222] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                    {searchResults.map(w => (
                      <button key={w.id} onClick={() => selectWorker(w)} className="w-full text-left px-4 py-2.5 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors border-b border-white/5 last:border-0 group">
                        <p className="text-sm font-bold text-white group-hover:text-emerald-400">{w.name_en}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{w.iqama_no} · {w.emp_id}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Assignment Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white outline-none [color-scheme:dark]" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Return Date (Expected)</label>
              <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white outline-none [color-scheme:dark]" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Condition Handed Over</label>
            <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-zinc-300 outline-none appearance-none">
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="damaged">Damaged</option>
            </select>
          </div>

          <div>
             <label className="text-xs font-bold text-zinc-500 uppercase">Assignment Notes</label>
             <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none resize-none" placeholder="Any initial remarks or missing components..." />
          </div>

        </div>

        <div className="p-6 border-t border-white/5 bg-[#050505] flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white">Cancel</button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedWorker}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all"
          >
            {isSubmitting ? "Assigning..." : "Assign & Log Movement"}
          </button>
        </div>
      </div>
    </div>
  );
}
