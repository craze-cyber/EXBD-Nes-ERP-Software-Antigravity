"use client";

import React, { useState, useEffect, useMemo } from "react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import { X, Search, Calculator, CheckCircle, AlertTriangle } from "lucide-react";
import { calculateSettlement } from "@/lib/settlement-calculator";

interface SettlementModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function SettlementModal({ onClose, onSuccess }: SettlementModalProps) {
  // Section 1: Personnel Lookup
  const [iqamaQuery, setIqamaQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  
  // Form fields
  const [exitType, setExitType] = useState("resignation");
  const [joiningDate, setJoiningDate] = useState("");
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [annualLeaveBalance, setAnnualLeaveBalance] = useState<number>(0);
  
  // Financials
  const [eosbAmount, setEosbAmount] = useState<number>(0);
  const [leaveAllowance, setLeaveAllowance] = useState<string>("0");
  const [noticePeriodPay, setNoticePeriodPay] = useState<string>("0");
  const [flightTicket, setFlightTicket] = useState<string>("0");
  const [reEntryFee, setReEntryFee] = useState<string>("0");
  const [otherBenefits, setOtherBenefits] = useState<string>("0");
  
  // Deductions
  const [extraLeaveNotes, setExtraLeaveNotes] = useState("");
  const [liabilitiesList, setLiabilitiesList] = useState<any[]>([]);
  const [liabilityDeduction, setLiabilityDeduction] = useState<number>(0);
  const [noticePeriodDeduction, setNoticePeriodDeduction] = useState<string>("0");
  const [otherDeductions, setOtherDeductions] = useState<string>("0");

  const [serviceYears, setServiceYears] = useState<number>(0);
  const [serviceDays, setServiceDays] = useState<number>(0);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live search for worker
  useEffect(() => {
    if (iqamaQuery.length >= 3) {
      const delay = setTimeout(async () => {
        const { data } = await insforge.database
          .from("workers")
          .select("*, clients(legal_name)")
          .or(`iqama_no.ilike.%${iqamaQuery}%,emp_id.ilike.%${iqamaQuery}%,name_en.ilike.%${iqamaQuery}%`)
          .limit(5);
        setSearchResults(data || []);
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
    }
  }, [iqamaQuery]);

  const selectWorker = async (w: any) => {
    setSelectedWorker(w);
    setIqamaQuery(w.iqama_no || "");
    setSearchResults([]);
    setJoiningDate(w.joining_date || new Date().toISOString().split('T')[0]);
    
    // Fetch liabilities explicitly
    const { data: libs } = await insforge.database
      .from("worker_liabilities")
      .select("*")
      .eq("worker_id", w.id)
      .eq("status", "active");
      
    setLiabilitiesList(libs || []);
  };

  // Auto-calculate on deps change
  useEffect(() => {
    if (selectedWorker && joiningDate && terminationDate) {
      runEngine();
    }
  }, [selectedWorker, exitType, joiningDate, terminationDate, annualLeaveBalance]);

  const runEngine = async () => {
    if (!selectedWorker) return;
    try {
      const result = await calculateSettlement({
        worker: { id: selectedWorker.id, basic_salary: selectedWorker.basic_salary },
        exitType,
        joiningDate: new Date(joiningDate),
        terminationDate: new Date(terminationDate),
        leaveData: { annual_leave_balance: annualLeaveBalance }
      });
      setServiceDays(result.serviceDays);
      setServiceYears(result.serviceYears);
      setEosbAmount(result.eosb);
      setLeaveAllowance(result.leaveEncashment.toString());
      setLiabilityDeduction(result.totalLiabilityDeduction);
      
      // Auto logic for notice period
      if (exitType === 'termination_by_company') {
        setNoticePeriodPay(selectedWorker.basic_salary.toString());
        setNoticePeriodDeduction("0");
      } else if (exitType === 'resignation') {
        setNoticePeriodDeduction(selectedWorker.basic_salary.toString());
        setNoticePeriodPay("0");
      } else {
        setNoticePeriodDeduction("0");
        setNoticePeriodPay("0");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Computations
  const totalBen = useMemo(() => {
    return eosbAmount + parseFloat(leaveAllowance||"0") + parseFloat(flightTicket||"0") + parseFloat(reEntryFee||"0") + parseFloat(noticePeriodPay||"0") + parseFloat(otherBenefits||"0");
  }, [eosbAmount, leaveAllowance, flightTicket, reEntryFee, noticePeriodPay, otherBenefits]);

  const totalDed = useMemo(() => {
    return liabilityDeduction + parseFloat(noticePeriodDeduction||"0") + parseFloat(otherDeductions||"0");
  }, [liabilityDeduction, noticePeriodDeduction, otherDeductions]);

  const netSettlement = totalBen - totalDed;

  const handleConfirm = async () => {
    if (!selectedWorker) {
      toast.error("Please select a worker first");
      return;
    }
    if (!leaveStart || !leaveEnd) {
      toast.error("Leave Start and End dates are required");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 1. Create worker_exit record
      const { data: exitData, error: exitErr } = await insforge.database
        .from("worker_exits")
        .insert([{
          worker_id: selectedWorker.id,
          client_id: selectedWorker.client_id,
          worker_name: selectedWorker.name_en,
          iqama_no: selectedWorker.iqama_no,
          emp_id: selectedWorker.emp_id,
          basic_salary: selectedWorker.basic_salary,
          position: selectedWorker.profession || "Worker",
          exit_type: exitType,
          joining_date: joiningDate,
          termination_date: terminationDate,
          leave_start: leaveStart,
          leave_end: leaveEnd,
          annual_leave_balance: annualLeaveBalance,
          extra_leave_notes: extraLeaveNotes,
          eosb_amount: eosbAmount,
          leave_allowance: parseFloat(leaveAllowance||"0"),
          notice_period_pay: parseFloat(noticePeriodPay||"0"),
          flight_ticket: parseFloat(flightTicket||"0"),
          re_entry_fee: parseFloat(reEntryFee||"0"),
          other_benefits: parseFloat(otherBenefits||"0"),
          total_benefits: totalBen,
          total_liability_deduction: liabilityDeduction,
          notice_period_deduction: parseFloat(noticePeriodDeduction||"0"),
          other_deductions: parseFloat(otherDeductions||"0"),
          total_deductions: totalDed,
          status: "calculated" // Draft by default, making it pre-approved state
        }]);

      if (exitErr) throw new Error(exitErr.message);

      // 2. Update Worker status
      await insforge.database
        .from("workers")
        .update({ work_status: "terminated" })
        .eq("id", selectedWorker.id);

      // 3. Clear liabilities
      if (liabilitiesList.length > 0) {
        const libIds = liabilitiesList.map(l => l.id);
        await insforge.database
          .from("worker_liabilities")
          .update({ status: "written_off", notes: "Written off during Final Settlement" })
          .in("id", libIds);
      }

      toast.success("Settlement Processed successfully.");
      onSuccess();
    } catch (err: any) {
      toast.error("Failed processing: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full h-full md:w-[95vw] md:h-[90vh] bg-[#0c0c0e] md:rounded-[24px] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 bg-[#050505] border-b border-white/5">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <Calculator className="w-6 h-6 text-emerald-500" />
              Final Settlement & EOSB Engine
            </h2>
            <p className="text-sm text-zinc-500 mt-1">Full lifecycle closeout adhering to Saudi Labor Law</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body - 2 Columns */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0c0c0e]">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-[1600px] mx-auto">
            
            {/* Left Column */}
            <div className="space-y-6">
              
              {/* SECTION 1 */}
              <div className="bg-[#15151a] border border-white/5 rounded-2xl p-6 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Search className="w-24 h-24" /></div>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-xs font-bold tracking-wider uppercase">
                    1. Smart Personnel Lookup
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono tracking-widest border border-white/10 px-2 rounded-sm bg-black/20">IQAMA SEARCH</span>
                </div>
                
                <div className="relative z-10 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Search by Iqama, EMP ID, or Name</label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                      <input 
                        value={iqamaQuery} 
                        onChange={e => setIqamaQuery(e.target.value)} 
                        placeholder="Search employee..." 
                        className="w-full pl-10 pr-4 py-3 bg-[#0a0a0c] border border-emerald-500/30 rounded-xl text-sm font-mono text-white outline-none focus:border-emerald-500 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]" 
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="absolute w-full mt-1 bg-[#222] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                        {searchResults.map(w => (
                          <button key={w.id} onClick={() => selectWorker(w)} className="w-full text-left px-4 py-3 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors border-b border-white/5 last:border-0 group">
                            <p className="text-sm font-bold text-white group-hover:text-emerald-400">{w.name_en}</p>
                            <p className="text-xs text-zinc-500 font-mono">{w.iqama_no} · {w.emp_id}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Full Name</label>
                      <input value={selectedWorker?.name_en || ""} readOnly className="w-full mt-1 bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-zinc-300 outline-none" placeholder="Auto-populated" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Job Location / Client</label>
                      <input value={selectedWorker?.clients?.legal_name || ""} readOnly className="w-full mt-1 bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-zinc-300 outline-none" placeholder="Auto-populated" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2 */}
              <div className="bg-[#15151a] border border-white/5 rounded-2xl p-6 shadow-inner">
                <div className="flex items-center gap-3 mb-6">
                  <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md text-xs font-bold tracking-wider uppercase">
                    2. Deployment Timeline
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Exit Type</label>
                    <select value={exitType} onChange={e => setExitType(e.target.value)} className="w-full mt-1 bg-[#0a0a0c] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none appearance-none">
                      <option value="resignation">Resignation</option>
                      <option value="contract_end">Contract End</option>
                      <option value="termination_by_company">Termination (By Company)</option>
                      <option value="termination_for_cause">Termination (For Cause)</option>
                      <option value="medical_exit">Medical Exit</option>
                      <option value="mutual_agreement">Mutual Agreement</option>
                    </select>
                  </div>
                  <div />
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Joining Date</label>
                    <input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} className="w-full mt-1 bg-[#0a0a0c] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Termination Date</label>
                    <input type="date" value={terminationDate} onChange={e => setTerminationDate(e.target.value)} className="w-full mt-1 bg-[#0a0a0c] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Leave Start Date *</label>
                    <input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} className="w-full mt-1 bg-[#0a0a0c] border border-emerald-500/30 rounded-xl py-2.5 px-4 text-sm text-white outline-none [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Leave End Date *</label>
                    <input type="date" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} className="w-full mt-1 bg-[#0a0a0c] border border-emerald-500/30 rounded-xl py-2.5 px-4 text-sm text-white outline-none [color-scheme:dark]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Unused Annual Leave Days</label>
                    <input type="number" value={annualLeaveBalance} onChange={e => setAnnualLeaveBalance(Number(e.target.value))} className="w-full mt-1 bg-[#0a0a0c] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none" min="0" />
                  </div>
                </div>

                {serviceYears > 0 && (
                  <div className="mt-6 p-4 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-400">Total Active Service</span>
                    <span className="text-lg font-mono font-bold text-indigo-400">{serviceYears} Years</span>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column */}
            <div className="space-y-6">
              
              {/* SECTION 3 */}
              <div className="bg-[#15151a] border border-emerald-500/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.02)] relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-bold tracking-wider uppercase flex items-center gap-1">
                    3. Financial Benefits (SAR)
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-black/20 border border-emerald-500/10 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-zinc-300">EOSB Amount</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-1">Labor Law Autocalc (Basic: {selectedWorker?.basic_salary||0})</p>
                    </div>
                    <div className="text-xl font-mono font-bold text-emerald-400">
                      {eosbAmount.toFixed(2)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Leave Allowance</label>
                      <input type="number" value={leaveAllowance} onChange={e => setLeaveAllowance(e.target.value)} className="w-full mt-1 bg-[#0a0a0c] border border-white/10 rounded-xl py-2.5 px-4 text-sm font-mono text-white outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Notice Period Pay</label>
                      <input type="number" value={noticePeriodPay} onChange={e => setNoticePeriodPay(e.target.value)} className="w-full mt-1 bg-[#0a0a0c] border border-white/10 rounded-xl py-2.5 px-4 text-sm font-mono text-white outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Flight Ticket</label>
                      <input type="number" value={flightTicket} onChange={e => setFlightTicket(e.target.value)} className="w-full mt-1 bg-[#0a0a0c] border border-white/10 rounded-xl py-2.5 px-4 text-sm font-mono text-white outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Re-entry Fee</label>
                      <input type="number" value={reEntryFee} onChange={e => setReEntryFee(e.target.value)} className="w-full mt-1 bg-[#0a0a0c] border border-white/10 rounded-xl py-2.5 px-4 text-sm font-mono text-white outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Other Benefits</label>
                      <input type="number" value={otherBenefits} onChange={e => setOtherBenefits(e.target.value)} className="w-full mt-1 bg-[#0a0a0c] border border-white/10 rounded-xl py-2.5 px-4 text-sm font-mono text-white outline-none" />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center px-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Gross Output</span>
                    <span className="text-2xl font-mono font-bold text-emerald-500">{totalBen.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 4 */}
              <div className="bg-[#15151a] border border-red-500/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(239,68,68,0.02)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-xs font-bold tracking-wider uppercase flex items-center gap-1">
                    4. Adjustments & Deductions
                  </div>
                </div>

                <div className="space-y-4">
                  {liabilitiesList.length > 0 && (
                    <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                      <p className="text-xs font-bold text-red-400 mb-2 flex items-center gap-2"><AlertTriangle className="w-3 h-3"/> Active Liabilities Found</p>
                      {liabilitiesList.map((l, i) => {
                        const rem = (l.total_amount || 0) - (l.recovered_amount || 0);
                        return (
                          <div key={i} className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                            <span>{l.liability_name || "Advance/Penalty"}</span>
                            <span className="text-red-400">SAR {rem.toFixed(2)} remaining</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Total Liability Deduct</label>
                      <input type="number" readOnly value={liabilityDeduction} className="w-full mt-1 bg-red-500/5 text-red-400 font-bold border border-red-500/20 rounded-xl py-2.5 px-4 text-sm font-mono outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Notice Period Deduct</label>
                      <input type="number" value={noticePeriodDeduction} onChange={e => setNoticePeriodDeduction(e.target.value)} className="w-full mt-1 bg-[#0a0a0c] border border-white/10 rounded-xl py-2.5 px-4 text-sm font-mono text-white outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Other Deductions</label>
                      <input type="number" value={otherDeductions} onChange={e => setOtherDeductions(e.target.value)} className="w-full mt-1 bg-[#0a0a0c] border border-white/10 rounded-xl py-2.5 px-4 text-sm font-mono text-white outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Extra Leave Notes / Justification</label>
                    <textarea value={extraLeaveNotes} onChange={e => setExtraLeaveNotes(e.target.value)} rows={2} className="w-full mt-1 bg-[#0a0a0c] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none resize-none" placeholder="Details of extra deductions or leaves..." />
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center px-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Slashed</span>
                    <span className="text-2xl font-mono font-bold text-red-400">{totalDed.toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Floating Bottom Action Bar */}
        <div className="flex-shrink-0 bg-[#050505] border-t border-white/5 p-6 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div>
              <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-widest">Total Benefits</p>
              <p className="font-mono text-xl text-white">SAR {totalBen.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-red-500 uppercase font-bold tracking-widest">Total Deductions</p>
              <p className="font-mono text-xl text-white">SAR {totalDed.toFixed(2)}</p>
            </div>
            <div className="pl-8 border-l border-white/10">
              <p className="text-[12px] text-indigo-400 uppercase font-bold tracking-widest">Final Net Settlement</p>
              <p className="font-mono text-4xl font-bold text-white tracking-tight">SAR {netSettlement.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-zinc-400 hover:text-white transition-colors">DISCARD</button>
            <button 
              onClick={handleConfirm}
              disabled={isSubmitting || !selectedWorker}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-full text-sm font-bold tracking-widest flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            >
              {isSubmitting ? "PROCESSING..." : "CONFIRM & POST SETTLEMENT"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
