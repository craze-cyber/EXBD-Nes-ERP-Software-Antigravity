"use client";

import React, { useState, useEffect, useRef } from "react";
import { UploadCloud, Users, CheckCircle2 } from "lucide-react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import ManageWorkerModal from "@/components/erp/payroll/ManageWorkerModal";
import LogicCard from "@/components/erp/payroll/LogicCard";
import * as XLSX from "xlsx";
import { parseDabdoobMonthlyWorkbook, DabdoobMonthlyWorkerRow } from "@/lib/dabdoob-monthly-parser";

export default function DabdoobLogisticsPayrollPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [payPeriod, setPayPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [salaryRows, setSalaryRows] = useState<DabdoobMonthlyWorkerRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [manageWorker, setManageWorker] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await insforge.database.from("clients").select("*").eq("client_code", "DBL_YS").single();
      if (data) {
        setClients([data]);
        setSelectedClient(data.id);
      }
    };
    fetchClients();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClient) {
        if (!selectedClient) toast.error("Client data not loaded yet.");
        return;
    }
    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { cellDates: true, raw: true });
      const parsed = await parseDabdoobMonthlyWorkbook(wb, selectedClient, payPeriod, clients[0]);
      
      setSalaryRows(parsed.workers);
      toast.success(`✅ Dabdoob Logistics: ${parsed.workers.length} drivers parsed`);
    } catch (err: any) {
      toast.error("Could not parse file: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-700">
       <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
            <span className="bg-emerald-500 p-2 rounded-xl border border-emerald-400/20 shadow-lg shadow-emerald-500/20">
              <Users className="w-8 h-8 text-black" />
            </span>
            DABDOOB <span className="text-emerald-500 font-light italic">LOGISTICS</span>
          </h1>
          <p className="text-zinc-500 mt-1 font-medium">Order-based delivery billing engine with delay penalty scaling</p>
        </div>

        <div className="flex items-center gap-3">
           <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-emerald-500 text-black px-6 py-2.5 rounded-xl font-black text-sm hover:scale-105 transition-all shadow-lg"
            >
                {isUploading ? "Uploading..." : "Import Billing XLSX"}
           </button>
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        </div>
       </header>

       {salaryRows.length > 0 ? (
           <div className="space-y-6">
          <LogicCard clientSlug="dabdoob-logistics" />
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Associates Card */}
                  <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 shadow-2xl relative group">
                    <div className="flex justify-between items-start">
                      <div>
                         <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Associates</p>
                         <h3 className="text-4xl font-black text-white mt-2 group-hover:scale-105 transition-transform origin-left">{salaryRows.length}</h3>
                      </div>
                      <Users className="w-8 h-8 text-pink-500/20" />
                    </div>
                    <p className="text-pink-500 font-black text-[10px] mt-4 uppercase">ACTIVE IN {payPeriod}</p>
                  </div>

                  {/* Gross Card */}
                  <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 shadow-2xl relative group">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Total Gross</p>
                    <h3 className="text-4xl font-black text-emerald-400 mt-2 tracking-tighter">
                       {salaryRows.reduce((a, b) => a + (b.monthly_pay || 0), 0).toLocaleString()}
                    </h3>
                    <p className="text-zinc-500 font-bold text-[10px] mt-4 uppercase">SAR (ESTIMATED)</p>
                  </div>

                  {/* Net Card */}
                  <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 shadow-2xl relative group">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Total Net</p>
                    <h3 className="text-4xl font-black text-pink-500 mt-2 tracking-tighter">
                       {salaryRows.reduce((a, b) => a + (b.net_salary || 0), 0).toLocaleString()}
                    </h3>
                    <p className="text-zinc-500 font-bold text-[10px] mt-4 uppercase">SAR (TO DISBURSE)</p>
                  </div>

                  {/* Template Type Card */}
                  <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 shadow-2xl relative group">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Template Type</p>
                    <div className="flex items-center gap-2 mt-3">
                       <CheckCircle2 className="w-5 h-5 text-pink-500" />
                       <h3 className="text-2xl font-black text-white leading-tight">Truth Map<br/>Engine</h3>
                    </div>
                    <p className="text-zinc-500 font-bold text-[10px] mt-3 uppercase">Matched via Summary_KSA</p>
                  </div>
               </div>

               <div className="bg-[#121214] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                   <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#0a0a0c] text-[10px] uppercase font-black text-zinc-500 border-b border-white/5">
                                <tr>
                                    <th className="px-5 py-4">Driver</th>
                                    <th className="px-5 py-4">Region</th>
                                    <th className="px-5 py-4 text-right">Orders</th>
                                    <th className="px-5 py-4 text-right">Rate</th>
                                    <th className="px-5 py-4 text-right text-emerald-400 font-black">Gross</th>
                                    <th className="px-5 py-4 text-right text-red-400 font-black">Penalty Deduct</th>
                                    <th className="px-5 py-4 text-right text-emerald-400 font-black">Total Net</th>
                                  <th className="px-5 py-4 text-center">Status</th>
                                  <th className="px-5 py-4 text-center">Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {salaryRows.map((r, i) => (
                                    <tr key={i} className="hover:bg-white/[0.02]">
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-white">{r.name}</div>
                                            <div className="text-[10px] text-zinc-500 font-mono">{r.emp_id} • {r._dabdoob?.vendor || 'N/A'}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase bg-emerald-500/10 text-emerald-500">
                                                {r._dabdoob?.location || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right font-mono">{r._dabdoob?.total || 0}</td>
                                        <td className="px-5 py-4 text-right font-mono text-zinc-400">{r._dabdoob?.basic_rate || 0} SAR</td>
                                        <td className="px-5 py-4 text-right font-mono">{r.monthly_pay.toLocaleString()}</td>
                                        <td className="px-5 py-4 text-right font-mono text-red-400 font-bold">{r._dabdoob?.delay_deduction || r._dabdoob?.deduction || 0}</td>
                                        <td className="px-5 py-4 text-right font-mono text-emerald-400 font-black">{r.net_salary.toLocaleString()}</td>
                                                          <td className="px-5 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${isSaved ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-zinc-800 text-zinc-300 border-white/5'}`}>
                          {isSaved ? "PENDING" : "UNSAVED"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button 
                          onClick={() => setManageWorker(r)}
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
           <div className="bg-[#121214] border border-dashed border-white/10 rounded-[3rem] p-40 text-center flex flex-col items-center justify-center">
               <UploadCloud className="w-16 h-16 text-zinc-600 mb-6" />
               <h3 className="text-2xl font-black text-white">Dabdoob Logistics Engine</h3>
               <p className="text-zinc-500 mt-2 max-w-sm">Import the master salary delivery workbook to process exact payables securely.</p>
           </div>
       )}
      {manageWorker && (
        <ManageWorkerModal worker={manageWorker} onClose={() => setManageWorker(null)} period={payPeriod} clientSlug="dabdoob-logistics" />
      )}
    </div>
  );
}