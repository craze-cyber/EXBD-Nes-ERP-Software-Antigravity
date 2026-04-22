"use client";

import React, { useState, useRef } from "react";
import { Upload, X, Check, Loader2, AlertCircle } from "lucide-react";
import { insforge } from "@/lib/insforge";
import { parseWorkerXLSX, ParsedRow } from "@/lib/xlsx-parser";
import { toast } from "sonner";

interface WorkerUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: any[];
  dbColumns: string[];
}

export default function WorkerUploadModal({ isOpen, onClose, onSuccess, clients, dbColumns }: WorkerUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [columnsMap, setColumnsMap] = useState<Record<string, string>>({});
  
  const [summary, setSummary] = useState({ new: 0, update: 0, error: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setFile(selected);
    setIsParsing(true);
    
    try {
      const { rows, columnsMap } = await parseWorkerXLSX(selected, dbColumns, clients);
      
      // Verification Pass: Check DB for existing records to mark "Update" vs "New"
      // In production, batch this. For now, doing it via a DB RPC if available, or simple selects
      const iqamas = rows.map(r => r.mapped.iqama_no).filter(Boolean).map(String);
      
      let existingIqamas = new Set<string>();
      if (iqamas.length > 0) {
        const { data } = await insforge.database.from("workers").select("iqama_no").in("iqama_no", iqamas);
        (data || []).forEach(d => existingIqamas.add(String(d.iqama_no)));
      }

      const verifiedRows = rows.map(r => {
        if (r.status === "Error") return r;
        
        let isUpdate = false;
        const iqamaStr = r.mapped.iqama_no ? String(r.mapped.iqama_no) : "";
        
        if (iqamaStr && existingIqamas.has(iqamaStr)) {
            isUpdate = true;
        }
        
        if (iqamaStr) {
            existingIqamas.add(iqamaStr);
        }
        // Handling emp_id + client_id is complex in bulk without a specific compound query,
        // relying on iqama_no primarily for this preview demo.

        return { ...r, status: isUpdate ? ("Update" as const) : ("New" as const) };
      });

      setColumnsMap(columnsMap);
      setParsedRows(verifiedRows);

      setSummary({
        new: verifiedRows.filter(r => r.status === "New").length,
        update: verifiedRows.filter(r => r.status === "Update").length,
        error: verifiedRows.filter(r => r.status === "Error").length,
      });

    } catch (err: any) {
      toast.error(err.message || "Failed to parse file");
    } finally {
      setIsParsing(false);
    }
  };

  const handleUpload = async () => {
    const validRows = parsedRows.filter(r => r.status !== "Error");
    if (validRows.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    // Use bulk upsert feature via our own loop to guarantee business logic
    const handledNewPairs = new Map<string, string>(); // stores emp_id_client_id -> db_id

    for (const row of validRows) {
      const payload = row.mapped;
      const pairKey = payload.emp_id && payload.client_id ? `${String(payload.emp_id)}_${String(payload.client_id)}` : null;

      try {
        if (row.status === "Update") {
           const { error } = await insforge.database.from("workers").update(payload).eq("iqama_no", payload.iqama_no);
           if (error) throw error;
        } else {
           // Insert fallback, checking emp_id + client combination
           let existingId = pairKey ? handledNewPairs.get(pairKey) : null;
           
           if (!existingId && pairKey) {
             const { data: existing } = await insforge.database.from("workers").select("id").eq("emp_id", String(payload.emp_id)).eq("client_id", String(payload.client_id)).maybeSingle();
             if (existing) {
               existingId = existing.id;
             }
           }

           if (existingId) {
             const { error } = await insforge.database.from("workers").update(payload).eq("id", existingId);
             if (error) throw error;
           } else {
             // Supabase / InsForge requires an array wrapper for bulk `.insert([payload])`, or single object `.insert(payload)`
             const { data: inserted, error } = await insforge.database.from("workers").insert([payload]).select("id").maybeSingle();
             if (error) throw error;
             
             if (inserted && pairKey) {
                 handledNewPairs.set(pairKey, inserted.id);
             }
           }
        }
        successCount++;
      } catch (err: any) {
        console.error("Row failed:", err.message || err);
        toast.error(`Row insertion failed: ${err.message || 'Unknown DB Error'}`);
      }
    }

    setIsUploading(false);
    toast.success(`Successfully processed ${successCount} workers`);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[32px] border-white/10 relative animate-in zoom-in-95 duration-200">
        <div className="p-8 pb-4 shrink-0 border-b border-white/5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Upload className="w-6 h-6 text-emerald-500" /> Bulk Import Workers
            </h2>
            <p className="text-zinc-400 text-sm mt-1">Upload records via XLSX format.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          {!file ? (
            <div 
               className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer"
               onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold">Click to Upload XLSX</h3>
              <p className="text-sm text-zinc-400 mt-2">Maximum file size 10MB.</p>
              <input type="file" accept=".xlsx" className="hidden" ref={fileInputRef} onChange={handleFileDrop} />
            </div>
          ) : isParsing ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
              <p className="text-zinc-400 text-sm animate-pulse">Mapping columns and validating records...</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-3 gap-4">
                <div className="glass p-4 rounded-2xl border-emerald-500/20 text-center">
                  <p className="text-2xl font-bold text-emerald-500">{summary.new}</p>
                  <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">New Inserts</p>
                </div>
                <div className="glass p-4 rounded-2xl border-amber-500/20 text-center">
                  <p className="text-2xl font-bold text-amber-500">{summary.update}</p>
                  <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Existing Updates</p>
                </div>
                <div className="glass p-4 rounded-2xl border-red-500/20 text-center">
                  <p className="text-2xl font-bold text-red-500">{summary.error}</p>
                  <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Invalid Records</p>
                </div>
              </div>

              <div className="glass border border-white/10 rounded-2xl overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className="bg-white/5 sticky top-0 backdrop-blur-md">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-zinc-400">STATUS</th>
                        <th className="px-4 py-3 font-semibold text-zinc-400">IQAMA NO</th>
                        <th className="px-4 py-3 font-semibold text-zinc-400">NAME (EN)</th>
                        <th className="px-4 py-3 font-semibold text-zinc-400">CLIENT</th>
                        <th className="px-4 py-3 font-semibold text-zinc-400">ISSUES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {parsedRows.map((r, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2">
                             {r.status === "New" && <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3"/> New</span>}
                             {r.status === "Update" && <span className="text-amber-400 flex items-center gap-1"><Check className="w-3 h-3"/> Update</span>}
                             {r.status === "Error" && <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Error</span>}
                          </td>
                          <td className="px-4 py-2 font-mono">{r.mapped.iqama_no || "—"}</td>
                          <td className="px-4 py-2">{r.mapped.name_en || "—"}</td>
                          <td className="px-4 py-2 opacity-60 truncate max-w-[100px]">{r.mapped.client_id || "—"}</td>
                          <td className="px-4 py-2 text-red-400 max-w-[200px] truncate" title={r.errorMsg}>{r.errorMsg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 pt-4 shrink-0 border-t border-white/5 flex gap-4">
          <button 
             onClick={onClose}
             className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium"
          >
            Cancel
          </button>
          <button 
             onClick={handleUpload}
             disabled={!file || parsedRows.filter(r => r.status !== "Error").length === 0 || isUploading}
             className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition-all flex items-center justify-center gap-2"
          >
             {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Finalize & Import (${summary.new + summary.update})`}
          </button>
        </div>
      </div>
    </div>
  );
}
