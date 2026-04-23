"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, UploadCloud, Save, Calendar, RefreshCw, X, FileSpreadsheet, Users, DollarSign, ChevronRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import ManageWorkerModal from "@/components/erp/payroll/ManageWorkerModal";
import LogicCard from "@/components/erp/payroll/LogicCard";
import * as XLSX from "xlsx";
import { processFirstCryPayroll } from "@/lib/first-cry-engine";
import { generateFCTemplate } from "@/lib/first-cry-parser";

export default function FirstCryPayrollPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [payPeriod, setPayPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [searchQuery, setSearchQuery] = useState("");
  const [parseResult, setParseResult] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [manageWorker, setManageWorker] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await insforge.database.from("clients").select("*").eq("client_code", "FC_YS").single();
      if (data) {
        setClients([data]);
        setSelectedClient(data.id);
      } else {
          // Fallback to all clients if no specific slug found
          const { data: all } = await insforge.database.from("clients").select("*");
          setClients(all || []);
          if (all && all.length > 0) {
            setSelectedClient(all[0].id);
          }
      }
    };
    fetchClients();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { cellDates: true, raw: true });
      const result = processFirstCryPayroll(wb);
      
      if (!result.workers || result.workers.length === 0) {
        toast.error("No worker data found in 'ksa_payable' or other sheets. Please check the file.");
        return;
      }
      
      setParseResult(result);
      toast.success(`✅ Parsed ${result.workers.length} workers for FirstCry`);
    } catch (err) {
      toast.error("Cloud not parse file");
    } finally {
      setIsUploading(false);
    }
  };

  const saveBatch = async () => {
    if (!parseResult) {
      toast.error("No data to save. Please upload a file first.");
      return;
    }
    if (!selectedClient) {
      toast.error("No client selected. Please refresh or configure the client.");
      return;
    }
    setIsSaving(true);
    try {
      // 1. Create Run
      const { data: run, error: runError } = await insforge.database.from("fc_payroll_run").insert({
        client_id: selectedClient,
        pay_period: payPeriod,
        total_gross: parseResult.workers.reduce((s: any, w: any) => s + (w.total_basic || 0), 0),
        total_net: parseResult.workers.reduce((s: any, w: any) => s + (w.net_payable || 0), 0),
        status: 'draft'
      }).select().single();

      if (runError) throw runError;

      // 2. Insert Details
      const details = parseResult.workers.map((w: any) => ({
        run_id: run.id,
        emp_id: w.emp_id,
        name: w.name,
        position: w.position,
        vendor_name: w.vendor_name,
        working_days: w.working_days,
        ot_hours: w.ot_hours,
        paid_days: w.working_days, // Simplification
        monthly_pay: w.total_basic,
        ot_day_amount: 0,
        ot_hour_amount: 0,
        deduction_add: 0,
        net_salary: w.net_payable,
        remarks: w.remarks
      }));

      const { error: detError } = await insforge.database.from("fc_payroll_details").insert(details);
      if (detError) throw detError;

      toast.success("✅ FirstCry Payroll Batch Saved Successfully");
      setIsSaved(true);
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRows = (parseResult?.workers || []).filter((w: any) => 
    w.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    w.emp_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
            <span className="bg-gradient-to-br from-pink-500 to-rose-600 p-2 rounded-xl border border-pink-400/20 shadow-lg shadow-pink-500/20">
              <Users className="w-8 h-8 text-white" />
            </span>
            FIRSTCRY <span className="text-pink-500 font-light">PAYROLL</span>
          </h1>
          <p className="text-zinc-500 mt-1 font-medium">Attendance-based salary engine with 12hr shift logic</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#121214] border border-white/5 rounded-xl p-1 flex items-center shadow-inner">
            <input 
              type="month" 
              value={payPeriod} 
              onChange={(e) => setPayPeriod(e.target.value)}
              className="bg-transparent text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500/50 rounded-lg transition-all"
            />
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="group flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg shadow-white/5"
          >
            {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />}
            Upload Sheets
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".xlsx,.xls"
          />

          {parseResult && (
            <button 
              onClick={saveBatch}
              disabled={isSaving}
              className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all hover:shadow-emerald-500/25 shadow-lg"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Sync Liabilities
            </button>
          )}

          <button 
            onClick={() => {
              const buffer = generateFCTemplate();
              const blob = new Blob([new Uint8Array(buffer)], { type: 'application/octet-stream' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `FirstCry_Template_${payPeriod}.xlsx`;
              a.click();
            }}
            className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-700 border border-white/5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Template
          </button>
        </div>
      </header>

      {/* SEARCH & FILTERS */}
      <div className="flex gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-pink-400 transition-colors" />
          <input
            type="text"
            placeholder="Search associates by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121214] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/40 transition-all shadow-xl"
          />
        </div>
      </div>

      {parseResult ? (
        <div className="space-y-6">
          <LogicCard clientSlug="firstcry" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users className="w-12 h-12 text-pink-500" />
              </div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Associates</p>
              <h3 className="text-3xl font-black text-white mt-2">{parseResult.workers.length}</h3>
              <p className="text-pink-500 text-[10px] mt-1 font-bold">ACTIVE IN {payPeriod}</p>
            </div>
            
            <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-xl">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Total Gross</p>
              <h3 className="text-3xl font-black text-emerald-400 mt-2">
                {parseResult.workers.reduce((s: any, w: any) => s + (w.total_basic || 0), 0).toLocaleString()}
              </h3>
              <p className="text-zinc-600 text-[10px] mt-1 font-bold">SAR (ESTIMATED)</p>
            </div>

            <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-xl">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Total Net</p>
              <h3 className="text-3xl font-black text-pink-500 mt-2">
                {parseResult.workers.reduce((s: any, w: any) => s + (w.net_payable || 0), 0).toLocaleString()}
              </h3>
              <p className="text-zinc-600 text-[10px] mt-1 font-bold">SAR (TO DISBURSE)</p>
            </div>

            <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 shadow-xl overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent pointer-none"></div>
               <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Template Type</p>
               <h3 className="text-xl font-black text-white mt-3 flex items-center gap-2">
                 <CheckCircle2 className="w-5 h-5 text-pink-500" />
                 Attendance Grid
               </h3>
               <p className="text-zinc-400 text-[10px] mt-1 font-medium">Mapped via 'ksa_payable'</p>
            </div>
          </div>

          <div className="bg-[#121214]/50 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0c0c0e] text-[9px] uppercase font-black text-zinc-500 border-b border-white/5">
                  <tr>
                    <th className="px-5 py-4 text-center">#</th>
                    <th className="px-5 py-4">EMP ID</th>
                    <th className="px-5 py-4">Associate Name</th>
                    <th className="px-5 py-4">Designation</th>
                    <th className="px-5 py-4 text-center">Duty Days</th>
                    <th className="px-5 py-4 text-right">Basic Pay</th>
                    <th className="px-5 py-4 text-right">OT Amount</th>
                    <th className="px-5 py-4 text-right text-emerald-400">Net Payable</th>
                    <th className="px-5 py-4">Remarks</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRows.map((w: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-4 text-center text-zinc-600 font-mono text-xs">{w.serial}</td>
                      <td className="px-5 py-4 font-black text-zinc-300 font-mono">{w.emp_id}</td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-white group-hover:text-pink-400 transition-colors uppercase tracking-tight">{w.name}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{w.vendor_name}</div>
                      </td>
                      <td className="px-5 py-4 text-zinc-400 font-medium">{w.position}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md font-mono text-xs font-bold border border-white/5">
                          {w.working_days}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-zinc-300">{w.total_basic?.toLocaleString()}</td>
                      <td className="px-5 py-4 text-right font-mono text-amber-500">{(w.total_ot_pay || 0).toLocaleString()}</td>
                      <td className="px-5 py-4 text-right font-mono text-emerald-400 font-black tracking-tight">{w.net_payable?.toLocaleString()}</td>
                      <td className="px-5 py-4 text-[10px] text-zinc-600 italic max-w-[150px] truncate">{w.remarks}</td>
                                          <td className="px-5 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${isSaved ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-zinc-800 text-zinc-300 border-white/5'}`}>
                          {isSaved ? "PENDING" : "UNSAVED"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button 
                          onClick={() => setManageWorker(w)}
                          disabled={!isSaved}
                          className="text-blue-500 hover:text-blue-400 font-bold text-xs bg-blue-500/10 px-4 py-2 rounded-lg hover:bg-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          MANAGE
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredRows.length === 0 && (
              <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
                 <div className="bg-zinc-800/50 p-6 rounded-full border border-white/5">
                   <Search className="w-10 h-10 text-zinc-600" />
                 </div>
                 <div>
                   <p className="text-white font-bold text-lg">No associates match your search</p>
                   <p className="text-zinc-500 text-sm">Try using a different name or employee ID</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#121214] border border-dashed border-white/10 rounded-[2.5rem] p-20 text-center flex flex-col items-center justify-center space-y-6 group hover:border-pink-500/30 transition-all duration-500 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-pink-500/[0.02] to-transparent pointer-none"></div>
          <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] border border-white/5 flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform duration-500">
            <UploadCloud className="w-10 h-10 text-zinc-500 group-hover:text-pink-500 transition-colors" />
          </div>
          <div className="max-w-md">
            <h3 className="text-2xl font-black text-white">Upload FirstCry Wage Sheet</h3>
            <p className="text-zinc-500 mt-2 font-medium">Please upload the payroll file for <span className="text-zinc-300 underline underline-offset-4 decoration-pink-500/50">{payPeriod}</span>. The system will look for the 'ksa_payable' sheet automatically.</p>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-black px-10 py-4 rounded-2xl font-black tracking-tighter hover:bg-pink-500 hover:text-white transition-all shadow-xl active:scale-95"
          >
            SELECT WORKBOOK
          </button>
        </div>
      )}
    </div>
  );
}
