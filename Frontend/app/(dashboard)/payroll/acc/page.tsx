"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, UploadCloud, Save, Calendar, RefreshCw, X, FileSpreadsheet, Users, DollarSign, ChevronRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import ManageWorkerModal from "@/components/erp/payroll/ManageWorkerModal";
import LogicCard from "@/components/erp/payroll/LogicCard";
import * as XLSX from "xlsx";
import { processACCPayroll } from "@/lib/acc-engine";
import { generateACCTemplate } from "@/lib/acc-salary-parser";

export default function ACCPayrollPage() {
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
      const { data } = await insforge.database.from("clients").select("*").eq("client_code", "ACC_EXBD").single();
      if (data) {
        setClients([data]);
        setSelectedClient(data.id);
      } else {
          const { data: all } = await insforge.database.from("clients").select("*");
          setClients(all || []);
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
      const result = processACCPayroll(wb);
      
      if (!result.workers || result.workers.length === 0) {
        toast.error("No worker data found. Please check headers for 'Name' and 'Category'.");
        return;
      }
      
      setParseResult(result);
      toast.success(`✅ Parsed ${result.workers.length} workers for ACC`);
    } catch (err) {
      toast.error("Cloud not parse file");
    } finally {
      setIsUploading(false);
    }
  };

  const saveBatch = async () => {
    if (!parseResult || !selectedClient) return;
    setIsSaving(true);
    try {
      // 1. Create Run
      const { data: run, error: runError } = await insforge.database.from("acc_payroll_run").insert({
        client_id: selectedClient,
        pay_period: payPeriod,
        total_gross: parseResult.totals.gross,
        total_net: parseResult.totals.net,
        status: 'draft'
      }).select().single();

      if (runError) throw runError;

      // 2. Insert Details
      const details = parseResult.workers.map((w: any) => ({
        run_id: run.id,
        emp_id: w.emp_id,
        name: w.name,
        iqama: w.iqama,
        designation: w.designation,
        location: w.location,
        vendor: w.vendor,
        basic_salary: w.basic_salary,
        working_days: w.working_days,
        working_hours: w.working_hours,
        salary: w.salary,
        net_payable: w.net_payable
      }));

      const { error: detError } = await insforge.database.from("acc_payroll_details").insert(details);
      if (detError) throw detError;

      toast.success("✅ ACC Payroll Batch Saved Successfully");
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
            <span className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl border border-blue-400/20 shadow-lg shadow-blue-500/20">
              <Users className="w-8 h-8 text-white" />
            </span>
            ACC <span className="text-blue-500 font-light">PAYROLL</span>
          </h1>
          <p className="text-zinc-500 mt-1 font-medium italic">Alexandra Construction Company - Manpower Billing</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#121214] border border-white/5 rounded-xl p-1 flex items-center shadow-inner">
            <input 
              type="month" 
              value={payPeriod} 
              onChange={(e) => setPayPeriod(e.target.value)}
              className="bg-transparent text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 rounded-lg transition-all"
            />
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="group flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg"
          >
            {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />}
            Import ACC Data
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
              Save Run
            </button>
          )}

          <button 
            onClick={() => {
              const buffer = generateACCTemplate();
              const blob = new Blob([buffer], { type: 'application/octet-stream' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `ACC_Template_${payPeriod}.xlsx`;
              a.click();
            }}
            className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-700 border border-white/5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel Template
          </button>
        </div>
      </header>

      {/* SEARCH BAR */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
        <input
          type="text"
          placeholder="Filter personnel by name, id or designation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#121214] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all shadow-xl"
        />
      </div>

      {parseResult ? (
        <div className="space-y-6">
          <LogicCard clientSlug="acc" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 shadow-xl relative group overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Users className="w-16 h-16 text-blue-500" />
               </div>
               <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Total Personnel</p>
               <h3 className="text-4xl font-black text-white mt-1">{parseResult.workers.length}</h3>
               <div className="h-1 w-12 bg-blue-500 mt-4 rounded-full"></div>
            </div>
            
            <div className="bg-[#0f172a]/40 border border-blue-500/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-blue-500/[0.02] pointer-events-none"></div>
               <p className="text-blue-400/60 text-[10px] font-black uppercase tracking-widest italic">Est. Gross Billing</p>
               <h3 className="text-4xl font-black text-white mt-1 tracking-tighter">
                 {parseResult.totals.net.toLocaleString()} <span className="text-zinc-600 font-light text-xl italic uppercase">sar</span>
               </h3>
               <p className="text-zinc-500 text-[10px] mt-2 font-medium">Sum of Total Payable in Worksheet</p>
            </div>

            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 shadow-xl">
               <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Work Period</p>
               <h3 className="text-2xl font-black text-zinc-300 mt-2 uppercase italic">{payPeriod}</h3>
               <p className="text-zinc-600 text-[9px] mt-2 leading-relaxed">System using 10hr shift default for Unskilled labor calculations</p>
            </div>
          </div>

          <div className="bg-[#121214]/50 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-2xl">
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0a0a0c] text-[10px] uppercase font-black text-zinc-500 border-b border-white/5 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-5">Personnel ID</th>
                    <th className="px-6 py-5">Full Name</th>
                    <th className="px-6 py-5">Iqama Info</th>
                    <th className="px-6 py-5">Designation</th>
                    <th className="px-6 py-5 text-right">Days</th>
                    <th className="px-6 py-5 text-right">Hours</th>
                    <th className="px-6 py-5 text-right">Basic</th>
                    <th className="px-6 py-5 text-right text-blue-400 font-black">Net Pay</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRows.map((w: any, idx: number) => (
                    <tr key={idx} className="hover:bg-blue-500/[0.04] transition-all group">
                      <td className="px-6 py-5 font-mono text-zinc-400 font-bold group-hover:text-blue-400">{w.emp_id}</td>
                      <td className="px-6 py-5">
                        <div className="font-black text-white tracking-tight uppercase group-hover:translate-x-1 transition-transform">{w.name}</div>
                        <div className="text-[10px] font-medium text-zinc-500 mt-0.5">{w.vendor} • {w.location || 'SITE-A'}</div>
                      </td>
                      <td className="px-6 py-5 text-zinc-400 font-mono text-xs">{w.iqama}</td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] bg-zinc-900 border border-white/5 px-2 py-1 rounded-md text-zinc-400 font-black uppercase italic">
                          {w.designation}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right font-mono text-zinc-400 font-bold">{w.working_days}</td>
                      <td className="px-6 py-5 text-right font-mono text-zinc-400 font-bold">{w.working_hours}</td>
                      <td className="px-6 py-5 text-right font-mono text-zinc-500">{w.basic_salary?.toLocaleString()}</td>
                      <td className="px-6 py-5 text-right font-mono text-white bg-blue-500/10 font-black border-l border-blue-500/20">{w.net_payable?.toLocaleString()}</td>
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
          </div>
        </div>
      ) : (
        <div className="bg-[#121214] border border-white/5 rounded-[3rem] p-32 text-center flex flex-col items-center justify-center space-y-8 relative overflow-hidden group shadow-3xl">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/[0.03] to-transparent"></div>
          <div className="w-32 h-32 bg-zinc-900 rounded-[3rem] border border-white/5 flex items-center justify-center shadow-3xl group-hover:scale-110 group-hover:bg-blue-500 transition-all duration-700 ease-out backdrop-blur-md">
            <UploadCloud className="w-12 h-12 text-zinc-500 group-hover:text-white transition-colors" />
          </div>
          <div className="max-w-lg">
            <h3 className="text-3xl font-black text-white tracking-tight">Ready for ACC Import</h3>
            <p className="text-zinc-500 mt-4 leading-relaxed font-medium">Drag & drop the Alexandra Construction Company salary sheet here. The system will automatically map IDs, Names, and Categories from any tab provided.</p>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-black px-12 py-5 rounded-[1.5rem] font-black hover:bg-blue-500 hover:text-white transition-all shadow-2xl active:scale-95 tracking-tight group"
          >
            <span className="group-hover:tracking-[0.1em] transition-all">CHOOSE SPREADSHEET</span>
          </button>
        </div>
      )}
    </div>
  );
}
