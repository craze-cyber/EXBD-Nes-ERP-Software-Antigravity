"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, UploadCloud, Save, Calendar, RefreshCw, X, FileSpreadsheet, Users, DollarSign, ChevronRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import ManageWorkerModal from "@/components/erp/payroll/ManageWorkerModal";
import LogicCard from "@/components/erp/payroll/LogicCard";
import * as XLSX from "xlsx";
import { parseGiftsgateWorkbook, generateGiftsgateTemplate } from "@/lib/giftsgate-parser";

export default function GiftsgatePayrollPage() {
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
      const { data } = await insforge.database.from("clients").select("*").eq("client_code", "GG_YS").single();
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
      
      const { data: clientData } = await insforge.database
        .from("clients").select("*").eq("id", selectedClient).single();
        
      const result = await parseGiftsgateWorkbook(wb, selectedClient!, payPeriod, clientData);
      
      if (!result.workers || result.workers.length === 0) {
        toast.error("No worker data found. Ensuring sheets have 'Associate name' or 'Gifts Gate' headers.");
        return;
      }
      
      setParseResult(result);
      toast.success(`✅ Parsed ${result.workers.length} workers for Giftsgate`);
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
      const { data: run, error: runError } = await insforge.database.from("giftsgate_payroll_run").insert({
        client_id: selectedClient,
        pay_period: payPeriod,
        total_gross_salary: parseResult.invoice.subtotal,
        total_net_salary: parseResult.invoice.grand_total,
        status: 'draft'
      }).select().single();

      if (runError) throw runError;

      // 2. Insert Details
      const details = parseResult.workers.map((w: any) => ({
        run_id: run.id,
        emp_id: w.emp_id,
        name: w.name,
        iqama_no: w._giftsgate.iqama_no,
        designation: w._giftsgate.designation,
        location: w._giftsgate.location,
        vendor: w._giftsgate.vendor,
        basic_salary: w._giftsgate.basic_salary,
        per_day_rate: w._giftsgate.per_day_rate,
        ot_rate: w._giftsgate.ot_rate,
        working_days: w._giftsgate.working_days,
        weekly_off: w._giftsgate.weekly_off,
        total_payable_days: w._giftsgate.total_payable_days,
        salary: w._giftsgate.salary,
        ot_amount: w._giftsgate.ot_amount,
        tips: w._giftsgate.tips,
        ns_amount: w._giftsgate.ns_amount,
        last_month_adj: w._giftsgate.last_month_adj,
        total_salary: w._giftsgate.total_salary,
        advance: w._giftsgate.advance,
        deduction: w._giftsgate.deduction,
        other_adj: w._giftsgate.other_adj,
        total_payable: w._giftsgate.total_payable,
        payment_status: w._giftsgate.payment_status
      }));

      const { error: detError } = await insforge.database.from("giftsgate_payroll_details").insert(details);
      if (detError) throw detError;

      toast.success("✅ Giftsgate Payroll Batch Saved Successfully");
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
            <span className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-xl border border-amber-400/20 shadow-lg shadow-amber-500/20">
              <DollarSign className="w-8 h-8 text-white" />
            </span>
            GIFTSGATE <span className="text-amber-500 font-light tracking-widest">WAGES</span>
          </h1>
          <p className="text-zinc-500 mt-1 font-medium tracking-tight">Luxury Hospitality & Gifts Manpower Engine</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#121214] border border-white/5 rounded-xl p-1 flex items-center shadow-inner">
            <Calendar className="w-4 h-4 ml-3 text-zinc-500" />
            <input 
              type="month" 
              value={payPeriod} 
              onChange={(e) => setPayPeriod(e.target.value)}
              className="bg-transparent text-white px-3 py-2 text-sm focus:outline-none rounded-lg transition-all font-bold"
            />
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="group flex items-center gap-2 bg-amber-500 text-black px-5 py-2.5 rounded-xl font-black text-sm hover:bg-amber-400 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg shadow-amber-500/20"
          >
            {isUploading ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <UploadCloud className="w-4 h-4 group-hover:scale-125 transition-transform" />}
            IMPORT XLSX
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
              SAVE WAGES
            </button>
          )}

          <button 
            onClick={() => {
              const buffer = generateGiftsgateTemplate();
              const blob = new Blob([new Uint8Array(buffer)], { type: 'application/octet-stream' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Giftsgate_Template_${payPeriod}.xlsx`;
              a.click();
            }}
            className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-700 border border-white/5 transition-all shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel Tool
          </button>
        </div>
      </header>

      {/* SEARCH FIELD */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-amber-500 transition-all" />
        <input
          type="text"
          placeholder="Filter by associate name, iqama or id..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#121214] border border-white/5 rounded-3xl py-5 pl-16 pr-6 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/30 transition-all shadow-2xl font-medium"
        />
      </div>

      {parseResult ? (
        <div className="space-y-6">
          <LogicCard clientSlug="giftsgate" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#18181b] to-[#09090b] border border-white/5 rounded-3xl p-6 shadow-2xl relative group overflow-hidden">
               <div className="absolute inset-0 bg-amber-500/[0.01] group-hover:bg-amber-500/[0.03] transition-colors"></div>
               <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Personnel</p>
               <h3 className="text-4xl font-black text-white mt-1 group-hover:scale-105 transition-transform origin-left">{parseResult.workers.length}</h3>
            </div>
            
            <div className="bg-gradient-to-br from-[#18181b] to-[#09090b] border border-white/5 rounded-3xl p-6 shadow-2xl">
               <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Gross Sum</p>
               <h3 className="text-4xl font-black text-amber-500 mt-1 tracking-tighter">
                 {parseResult.invoice.subtotal.toLocaleString()}
               </h3>
               <p className="text-zinc-600 text-[10px] mt-2 font-bold italic">BEFORE VAT & DEDUCTIONS</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-3xl p-6 shadow-2xl">
               <p className="text-amber-500/70 text-[10px] font-black uppercase tracking-[0.2em]">Net Disburse</p>
               <h3 className="text-4xl font-black text-white mt-1">
                 {parseResult.invoice.grand_total.toLocaleString()}
               </h3>
               <p className="text-zinc-400 text-[10px] mt-2 font-black">SAR (FINAL PAYROLL)</p>
            </div>

            <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col justify-center">
               <div className="flex items-center gap-3">
                 <div className="bg-emerald-500/20 p-2 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                 </div>
                 <div>
                    <p className="text-white font-black text-sm">Engine Verified</p>
                    <p className="text-zinc-500 text-[10px] font-medium">Giftsgate Specific Parser</p>
                 </div>
               </div>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-3xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0a0a0c] text-[10px] uppercase font-black text-zinc-500 border-b border-white/5 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-6">ID</th>
                    <th className="px-6 py-6">Associate</th>
                    <th className="px-6 py-6">Unit / Loc</th>
                    <th className="px-6 py-6 text-right">Days</th>
                    <th className="px-6 py-6 text-right">Basic</th>
                    <th className="px-6 py-6 text-right">OT Pay</th>
                    <th className="px-6 py-6 text-right">Tips/NS</th>
                    <th className="px-6 py-6 text-right text-red-400">Ded/Adv</th>
                    <th className="px-6 py-6 text-right text-amber-500 font-black">Net Salary</th>
                    <th className="px-6 py-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRows.map((w: any, idx: number) => {
                    const g = w._giftsgate || {};
                    return (
                      <tr key={idx} className="hover:bg-amber-500/[0.03] transition-all group">
                        <td className="px-6 py-6 font-mono text-zinc-500 font-bold text-xs">{w.emp_id}</td>
                        <td className="px-6 py-6">
                          <div className="font-extrabold text-white tracking-tight group-hover:text-amber-400 transition-colors">{w.name}</div>
                          <div className="text-[10px] font-medium text-zinc-500 mt-1 uppercase tracking-widest">{g.designation}</div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="text-zinc-400 font-bold text-xs">{g.location || 'HQ'}</div>
                          <div className="text-[10px] text-zinc-600 mt-0.5">{g.vendor}</div>
                        </td>
                        <td className="px-6 py-6 text-right font-mono text-zinc-400">{g.total_payable_days}</td>
                        <td className="px-6 py-6 text-right font-mono text-zinc-400 font-medium">{g.salary?.toLocaleString()}</td>
                        <td className="px-6 py-6 text-right font-mono text-zinc-400">{(g.ot_amount || 0).toLocaleString()}</td>
                        <td className="px-6 py-6 text-right font-mono text-zinc-400">{( (g.tips || 0) + (g.ns_amount || 0) ).toLocaleString()}</td>
                        <td className="px-6 py-6 text-right font-mono text-red-500/80">{( (g.advance || 0) + (g.deduction || 0) + (g.other_adj || 0) ).toLocaleString()}</td>
                        <td className="px-6 py-6 text-right font-mono text-amber-500 bg-amber-500/5 font-black border-r-4 border-amber-500/50">{g.total_payable?.toLocaleString()}</td>
                        <td className="px-6 py-6">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${g.payment_status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                             {g.payment_status || 'Unpaid'}
                           </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#121214] border border-white/5 rounded-[4rem] p-40 text-center flex flex-col items-center justify-center space-y-10 relative overflow-hidden group shadow-3xl">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.05),transparent_70%)]"></div>
           <div className="w-40 h-40 bg-zinc-900 rounded-[4rem] border border-white/5 flex items-center justify-center shadow-3xl group-hover:rotate-12 group-hover:scale-105 transition-all duration-700 ease-in-out cursor-pointer">
              <UploadCloud className="w-16 h-16 text-zinc-700 group-hover:text-amber-500 transition-colors" />
           </div>
           <div className="max-w-xl">
             <h3 className="text-4xl font-black text-white leading-none tracking-tighter">Luxury Payroll Upload</h3>
             <p className="text-zinc-500 mt-6 text-lg font-medium leading-relaxed">Securely upload the Giftsgate salary reconciliation spreadsheet. Our custom engine will handle per-day rates, tips, and night-shift adjustments automatically across all city tabs.</p>
           </div>
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="bg-amber-500 text-black px-16 py-6 rounded-3xl font-black text-lg hover:bg-white transition-all shadow-2xl active:scale-95 group flex items-center gap-3"
           >
             <FileSpreadsheet className="w-6 h-6" />
             SELECT WORKBOOK
           </button>
        </div>
      )}
    </div>
  );
}
