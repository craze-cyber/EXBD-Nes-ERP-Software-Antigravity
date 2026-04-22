"use client";

import React, { useState } from "react";
import { X, Search, CheckCircle2, AlertTriangle, UserPlus } from "lucide-react";

interface DriverMatch {
  rawId: string;
  normalized: string;
  matchedWorkerId: string | null;
  confidence: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mappings: Record<string, string>) => void;
  unmatchedDrivers: DriverMatch[];
  workers: any[];
}

export default function DriverMappingModal({ isOpen, onClose, onConfirm, unmatchedDrivers, workers }: Props) {
  const [mappings, setMappings] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSelect = (rawId: string, workerId: string) => {
    setMappings(prev => ({ ...prev, [rawId]: workerId }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="glass w-full max-w-4xl max-h-[90vh] flex flex-col p-8 rounded-[32px] border-white/10 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <AlertTriangle className="text-orange-500 w-8 h-8" />
              Unmatched Drivers Detected
            </h2>
            <p className="text-zinc-400 mt-2">
              Some driver IDs in the XLSX don't match any worker in your system. Map them manually to continue.
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/5">
              <tr className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                <th className="px-4 py-3">Driver ID in XLSX</th>
                <th className="px-4 py-3">Suggested Normalization</th>
                <th className="px-4 py-3">Map to Worker</th>
                <th className="px-4 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {unmatchedDrivers.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-4 font-mono text-sm text-white">{item.rawId}</td>
                  <td className="px-4 py-4 font-mono text-sm text-zinc-400">{item.normalized}</td>
                  <td className="px-4 py-4">
                    <select 
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm w-full focus:ring-1 focus:ring-emerald-500 outline-none"
                      onChange={(e) => handleSelect(item.rawId, e.target.value)}
                      value={mappings[item.rawId] || ""}
                    >
                      <option value="">-- Select Worker --</option>
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>{w.name_en} ({w.emp_id})</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500" style={{ width: '30%' }} />
                      </div>
                      <span className="text-[10px] text-orange-500 font-bold">LOW</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-bold transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(mappings)}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            Apply Mappings & Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
