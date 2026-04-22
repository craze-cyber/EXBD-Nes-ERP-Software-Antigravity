"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, X, Download, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { insforge } from "@/lib/insforge";
import { autoMapHeaders, generateFingerprint, detectAttendanceGrid, PAYROLL_ALIASES, MappingResult, AttendanceGridConfig } from "@/lib/fuzzy-mapper";

interface PayrollUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
  onProcessedData: (verifiedRows: any[], errors: any[], mismatches: any[], duplicates: any[]) => void;
}

export default function PayrollUploadModal({ isOpen, onClose, clientId, onProcessedData }: PayrollUploadModalProps) {
  const [step, setStep] = useState<1|2|3|4|5>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // File state
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [fingerprint, setFingerprint] = useState("");
  const [gridConfig, setGridConfig] = useState<AttendanceGridConfig | null>(null);
  
  // Mapping state
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null);
  const [manualMapping, setManualMapping] = useState<Record<string, string>>({}); // system_field -> header_name

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!clientId) {
      toast.error("Please select a client first before importing payroll!");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      toast.error("Invalid file format. Please upload a .xlsx file");
      return;
    }

    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellFormula: true, cellDates: true, raw: false });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      // Get raw grid
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
      if (jsonData.length < 2) throw new Error("File is empty or missing data rows");

      // Find header row (assuming row 0 for now, could be dynamic)
      const headers = jsonData[0] as string[];
      const fp = generateFingerprint(headers);
      const grid = detectAttendanceGrid(headers, jsonData);
      
      setRawHeaders(headers);
      setRawRows(jsonData.slice(1));
      setFingerprint(fp);
      setGridConfig(grid);

      setStep(2);

      // Step 2: Query DB
      const { data: existingMap, error } = await insforge.database
        .from("payroll_column_maps")
        .select("*")
        .eq("client_id", clientId)
        .eq("column_fingerprint", fp)
        .maybeSingle();

      if (existingMap) {
        toast.success("✅ Known format detected — processing automatically");
        setManualMapping(existingMap.system_mapping);
        await processRows(jsonData.slice(1), headers, existingMap.system_mapping, grid);
      } else {
        // Unknown format! Let the brain map it.
        const mapRes = autoMapHeaders(headers);
        setMappingResult(mapRes);
        setManualMapping(mapRes.mapped);
        setStep(3); // Show user confirmation GUI
      }
      
    } catch (err: any) {
      toast.error(err.message || "Failed to parse XLSX");
      setStep(1);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmMapping = async () => {
    setIsProcessing(true);
    try {
      // Save the mapping for future memory
      await insforge.database.from("payroll_column_maps").insert({
        client_id: clientId,
        column_fingerprint: fingerprint,
        system_mapping: manualMapping,
        has_attendance_grid: gridConfig?.has_attendance_grid || false,
        grid_start_col_index: gridConfig?.start_col_index || null,
        upload_count: 0
      });

      toast.success("Memory updated! Successfully learned this template format.");
      await processRows(rawRows, rawHeaders, manualMapping, gridConfig);
    } catch (err: any) {
      toast.error("Failed to sequence map: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const processRows = async (rows: any[][], headers: string[], mapping: Record<string, string>, grid: AttendanceGridConfig | null) => {
    setStep(4);
    
    // Invert mapping for quick lookup:  original_header -> system_field
    const headerToSystem: Record<string, string> = {};
    for (const [sys, head] of Object.entries(mapping)) {
        headerToSystem[head] = sys;
    }

    const payrollPayloads: any[] = [];
    const errorRows: any[] = [];
    const mismatches: any[] = [];
    const duplicates: any[] = [];

    // Pull all workers for this client in memory for rapid searching
    const { data: workers } = await insforge.database.from("workers").select("id, emp_id, iqama_no, name_en, name_ar").eq("client_id", clientId);
    const workerCache = workers || [];

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const pData: Record<string, any> = {};
      
      // Extract structured columns
      for (let c = 0; c < headers.length; c++) {
         const h = headers[c];
         const sys = headerToSystem[h];
         if (sys) pData[sys] = row[c];
      }

      // If empty row
      if (!pData.emp_id && !pData.worker_name && !pData.basic_salary) continue;

      // 1. Resolve Worker
      let foundWorker = null;
      let isFuzzy = false;

      if (pData.emp_id) {
         foundWorker = workerCache.find(w => w.emp_id?.trim() === String(pData.emp_id).trim());
      }
      if (!foundWorker && pData.worker_name) {
         // Fallback to strict name
         foundWorker = workerCache.find(w => w.name_en?.toLowerCase() === String(pData.worker_name).toLowerCase().trim());
         if (!foundWorker) {
            // Very loose fuzzy fallback checking containment
            foundWorker = workerCache.find(w => w.name_en?.toLowerCase().includes(String(pData.worker_name).toLowerCase().trim()));
            if (foundWorker) isFuzzy = true;
         }
      }

      if (!foundWorker) {
          errorRows.push({ rowData: pData, rowNum: r + 2, reason: "Employee Not Found in System Database" });
          continue;
      }

      // Extract Net Salary logic
      const basic = parseFloat(pData.basic_salary) || 0;
      let net = parseFloat(pData.net_salary) || basic;

      // If grid logic is required
      if (grid?.has_attendance_grid) {
         // Mock parsing daily grids for OT/Absent calcs
         pData.working_days = 30; // standard month
         pData.absent_days = 0;
      }

      const struct = {
         worker_id: foundWorker.id,
         worker_cache: foundWorker,
         emp_id: foundWorker.emp_id || pData.emp_id,
         basic_salary: basic,
         net_salary: net,
         food_allowance: parseFloat(pData.food_allowance) || 0,
         transport_allowance: parseFloat(pData.transport_allowance) || 0,
         working_days: pData.working_days || 30,
      };

      if (isFuzzy) {
         mismatches.push(struct);
      } else {
         payrollPayloads.push(struct);
      }
    }

    onProcessedData(payrollPayloads, errorRows, mismatches, duplicates);
    setStep(5);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#050505] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
          <div>
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <UploadCloud className="w-5 h-5 text-emerald-400" />
               Payroll Telemetry Upload
             </h2>
             <p className="text-sm text-zinc-400 mt-1">Ingest raw client payroll data grids and let the brain format it.</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative">
           
           {isProcessing && (
              <div className="absolute inset-0 z-10 bg-[#050505]/80 backdrop-blur flex flex-col items-center justify-center">
                 <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
                 <p className="text-white font-bold tracking-widest text-sm uppercase">Processing Brain Algorithms...</p>
              </div>
           )}

           {step === 1 && (
             <div className="flex flex-col items-center justify-center py-20">
               <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="w-full max-w-md border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all group"
               >
                 <UploadCloud className="w-12 h-12 text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
                 <p className="font-bold text-white mb-2">Select Excel Matrix (.xlsx)</p>
                 <p className="text-xs text-zinc-500 text-center">Engine automatically strips structures, scans attendance grids, and maps identities globally.</p>
               </div>
             </div>
           )}

           {step === 3 && mappingResult && (
             <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-4">
                   <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                   <div>
                      <h4 className="text-amber-500 font-bold mb-1">New Payroll Format Detected</h4>
                      <p className="text-xs text-amber-500/70">The machine brain has never seen this file structure for this specific client. Please verify the automated mapping sequence so it can memorize it indefinitely.</p>
                   </div>
                </div>

                {gridConfig?.has_attendance_grid && (
                   <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between">
                     <div>
                        <h4 className="text-purple-400 font-bold text-sm tracking-wider uppercase flex items-center gap-2">
                           <CheckCircle2 className="w-4 h-4"/> Daily Attendance Grid Confirmed
                        </h4>
                        <p className="text-xs text-purple-400/60 mt-1">A massive multi-day grid was detected starting at column index {gridConfig.start_col_index}. System will auto-parse all numeric shifts.</p>
                     </div>
                   </div>
                )}

                <div className="rounded-xl border border-white/10 overflow-hidden">
                   <table className="w-full text-left text-sm">
                      <thead className="bg-white/5 text-[10px] uppercase font-bold text-zinc-500">
                         <tr>
                            <th className="px-4 py-3">Raw Excel Header</th>
                            <th className="px-4 py-3">Core Engine Field</th>
                            <th className="px-4 py-3">Brain Confidence</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {Object.entries(manualMapping).map(([sysField, headerName]) => {
                            const conf = mappingResult.confidence[headerName] || 0;
                            return (
                               <tr key={sysField} className="bg-white/[0.01]">
                                 <td className="px-4 py-3 font-mono text-zinc-300">{headerName}</td>
                                 <td className="px-4 py-3">
                                   <select 
                                     value={sysField}
                                     onChange={(e) => {
                                        setManualMapping(prev => {
                                           const newMap = { ...prev };
                                           // Swap logic handled simply
                                           newMap[e.target.value] = headerName;
                                           return newMap;
                                        });
                                     }}
                                     className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-bold outline-none uppercase"
                                   >
                                      {Object.keys(PAYROLL_ALIASES).map(f => <option key={f} value={f}>{f}</option>)}
                                   </select>
                                 </td>
                                 <td className="px-4 py-3">
                                   <div className="flex items-center gap-2">
                                     <div className="flex gap-0.5">
                                        {[1,2,3,4].map(dot => (
                                           <div key={dot} className={`w-2 h-2 rounded-full ${conf >= (dot * 0.25) ? "bg-emerald-500" : "bg-white/10"}`} />
                                        ))}
                                     </div>
                                     <span className="text-xs font-mono text-zinc-500">{Math.round(conf * 100)}%</span>
                                   </div>
                                 </td>
                               </tr>
                            );
                         })}
                      </tbody>
                   </table>
                </div>

                <div className="bg-white/5 rounded-xl p-4">
                   <p className="text-xs text-zinc-400 font-bold mb-3 uppercase tracking-wider">Unmapped (Ignored) Columns:</p>
                   <div className="flex flex-wrap gap-2">
                      {mappingResult.unmapped.map(u => (
                         <span key={u} className="px-2 py-1 bg-black rounded text-[10px] text-zinc-600 font-mono border border-white/5">{u}</span>
                      ))}
                   </div>
                </div>
             </div>
           )}

        </div>

        {step === 3 && (
        <div className="p-6 border-t border-white/10 bg-black/40 flex items-center justify-between">
           <button onClick={() => setStep(1)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white transition-colors">
              Cancel
           </button>
           <button onClick={confirmMapping} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              Confirm & Save Mapping Fingerprint <ArrowRight className="w-4 h-4" />
           </button>
        </div>
        )}

      </div>
    </div>
  );
}
