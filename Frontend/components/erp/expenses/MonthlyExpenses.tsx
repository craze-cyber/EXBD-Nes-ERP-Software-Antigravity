"use client";

import React, { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import { Lock, Save, FileSpreadsheet, Calendar, CheckCircle } from "lucide-react";

export default function MonthlyExpenses({ category, title }: { category: string, title?: string }) {
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [records, setRecords] = useState<Record<string, any>>({});
  const [currentMonth, setCurrentMonth] = useState<string>(
    new Date().toISOString().substring(0, 7) // "YYYY-MM"
  );
  
  const [monthStatus, setMonthStatus] = useState<string>("draft"); // draft, submitted, approved
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadLineItems();
  }, []);

  useEffect(() => {
    if (lineItems.length > 0) {
      loadMonthData();
    }
  }, [currentMonth, lineItems]);

  const loadLineItems = async () => {
    const { data } = await insforge.database
      .from("expense_line_items")
      .select("*")
      .eq("category", category)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    setLineItems(data || []);
  };

  const loadMonthData = async () => {
    const { data } = await insforge.database
      .from("monthly_expenses")
      .select("*")
      .eq("category", category)
      .eq("expense_month", currentMonth);

    const recs: Record<string, any> = {};
    let status = "draft";
    
    if (data && data.length > 0) {
      data.forEach((r: any) => {
        recs[r.line_item_id] = r;
      });
      status = data[0].status || "draft";
    }

    setRecords(recs);
    setMonthStatus(status);
  };

  // Debounced auto-save function
  const saveRecord = async (itemId: string, itemCode: string, itemName: string, amount: number, notes: string) => {
    if (monthStatus === "approved" || monthStatus === "submitted") return;
    
    setIsSaving(true);
    
    const [year, monthNum] = currentMonth.split("-");
    const existing = records[itemId];

    if (existing) {
      // Update
      const { error } = await insforge.database
        .from("monthly_expenses")
        .update({ amount, notes, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) toast.error("Error updating: " + error.message);
    } else {
      // Insert
      const { data, error } = await insforge.database
        .from("monthly_expenses")
        .insert([{
          expense_month: currentMonth,
          expense_year: parseInt(year),
          expense_month_num: parseInt(monthNum),
          category: category,
          line_item_id: itemId,
          item_name: itemName,
          amount,
          notes,
          status: "draft"
        }])
        .select();
        
      if (error) {
        toast.error("Error saving: " + error.message);
      } else if (data && data[0]) {
        setRecords(prev => ({...prev, [itemId]: data[0]}));
      }
    }
    
    setIsSaving(false);
  };

  const handleBlur = (itemId: string, itemCode: string, itemName: string, value: string, type: "amount" | "notes") => {
    if (monthStatus !== "draft") return;
    
    const existing = records[itemId] || {};
    const currAmount = existing.amount || 0;
    const currNotes = existing.notes || "";
    
    let newAmount = currAmount;
    let newNotes = currNotes;
    
    let changed = false;
    if (type === "amount") {
      const val = parseFloat(value) || 0;
      if (val !== currAmount) {
        newAmount = val;
        changed = true;
      }
    } else {
      if (value !== currNotes) {
        newNotes = value;
        changed = true;
      }
    }

    if (changed) {
      // Optimiztic update
      setRecords(prev => ({
        ...prev,
        [itemId]: { ...existing, amount: newAmount, notes: newNotes }
      }));
      saveRecord(itemId, itemCode, itemName, newAmount, newNotes);
    }
  };

  const updateStatus = async (newStatus: "submitted" | "approved") => {
    const recordsList = Object.values(records);
    const ids = recordsList.map(r => r.id);
    if (ids.length === 0) {
      toast.error("No records to update.");
      return;
    }
    
    const { error } = await insforge.database
      .from("monthly_expenses")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .in("id", ids);

    if (error) {
      toast.error("Failed to update status.");
    } else {
      toast.success(`Month ${newStatus === 'approved' ? 'locked and approved' : 'submitted'}`);
      setMonthStatus(newStatus);
      
      // Accounting Integration: Auto-create journal entries when approved
      if (newStatus === "approved") {
        try {
          const totalAmount = recordsList.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
          if (totalAmount > 0) {
            // DR: Appropriate expense account
            // CR: Accounts Payable (2000) or Cash (1000)
            await insforge.database.from("journal_entries").insert([
              {
                date: new Date().toISOString().split('T')[0],
                description: `${category} sum for ${currentMonth}`,
                account_code: category === 'company_monthly' ? '5000' : '5100', // Expense Accounts
                debit: totalAmount,
                credit: 0,
                reference: `EXP-${currentMonth}`
              },
              {
                date: new Date().toISOString().split('T')[0],
                description: `${category} sum for ${currentMonth} payable`,
                account_code: '2000', // Accounts Payable
                debit: 0,
                credit: totalAmount,
                reference: `EXP-${currentMonth}`
              }
            ]);
            toast.success("Journal entries automatically created.");
          }
        } catch (err: any) {
          console.error("Journal entry creation failed:", err);
          // Non-blocking error
        }
      }
    }
  };

  const getAmount = (itemId: string) => records[itemId]?.amount || "";
  const getNotes = (itemId: string) => records[itemId]?.notes || "";
  
  const totalAmount = Object.values(records).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const enteredCount = Object.values(records).filter(r => r.amount > 0).length;
  const isLocked = monthStatus === "approved" || monthStatus === "submitted";

  return (
    <div className="space-y-6 animate-in fade-in">
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Expense Month</p>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <input 
              type="month" 
              value={currentMonth} 
              onChange={e => setCurrentMonth(e.target.value)} 
              className="bg-transparent text-lg font-bold outline-none text-white [color-scheme:dark]" 
            />
          </div>
        </div>
        
        <div className="glass p-4 rounded-2xl border border-white/5 justify-center flex flex-col text-center">
          <p className="text-2xl font-bold text-emerald-400">SAR {totalAmount.toFixed(2)}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Total Auto-sum</p>
        </div>
        
        <div className="glass p-4 rounded-2xl border border-white/5 justify-center flex flex-col text-center">
          <p className="text-2xl font-bold text-white">{enteredCount} / {lineItems.length}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Items Entered</p>
        </div>
        
        <div className="glass p-4 rounded-2xl border border-white/5 flex flex-col justify-center items-center">
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-2 border
            ${monthStatus === 'draft' ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" : 
              monthStatus === 'submitted' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
              "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
            {monthStatus === 'approved' && <Lock className="w-3 h-3" />}
            {monthStatus === 'submitted' && <CheckCircle className="w-3 h-3" />}
            {monthStatus === 'draft' && <Save className="w-3 h-3" />}
            Status: {monthStatus}
          </div>
          {isSaving && <p className="text-[10px] text-emerald-400 mt-2 animate-pulse font-mono">Saving...</p>}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        {monthStatus === "draft" && (
          <button onClick={() => updateStatus("submitted")} className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-bold transition-all border border-white/5">
            Submit for Approval
          </button>
        )}
        {monthStatus === "submitted" && (
          <button onClick={() => updateStatus("approved")} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20">
            <Lock className="w-4 h-4" /> Lock & Approve Month
          </button>
        )}
      </div>

      <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#0f0f0f] text-[10px] uppercase font-bold text-zinc-500 border-b border-white/5 shadow-md">
            <tr>
              <th className="px-5 py-4 w-12 text-center">#</th>
              <th className="px-5 py-4">Expense Item</th>
              <th className="px-5 py-4 w-[250px] text-right">Amount (SAR)</th>
              <th className="px-5 py-4 w-[40%]">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {lineItems.map((item, i) => (
              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3 text-center font-mono text-zinc-600 font-bold">{i + 1}</td>
                <td className="px-5 py-3">
                  <p className="font-bold text-zinc-200">{item.item_name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">{item.item_code}</p>
                </td>
                <td className="px-5 py-3 text-right group">
                  <input 
                    type="number" 
                    defaultValue={getAmount(item.id)}
                    disabled={isLocked}
                    placeholder="0.00"
                    onBlur={(e) => handleBlur(item.id, item.item_code, item.item_name, e.target.value, "amount")}
                    className="w-full bg-[#151515] hover:bg-[#222] focus:bg-[#252525] border border-transparent focus:border-emerald-500/30 rounded-xl py-2 px-4 text-right font-mono font-bold text-emerald-400 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                </td>
                <td className="px-5 py-3 group">
                  <input 
                    type="text" 
                    defaultValue={getNotes(item.id)}
                    disabled={isLocked}
                    placeholder={`Notes for ${item.item_name}...`}
                    onBlur={(e) => handleBlur(item.id, item.item_code, item.item_name, e.target.value, "notes")}
                    className="w-full bg-transparent hover:bg-white/5 focus:bg-white/5 border border-transparent focus:border-white/10 rounded-xl py-2 px-4 text-zinc-300 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-zinc-700" 
                  />
                </td>
              </tr>
            ))}
            {lineItems.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-12 text-center text-zinc-500">No line items configured for this category.</td></tr>
            )}
            {lineItems.length > 0 && (
              <tr className="bg-emerald-500/5">
                <td colSpan={2} className="px-5 py-4 font-bold text-emerald-400 text-right uppercase tracking-wider text-xs">Total Auto-Sum</td>
                <td className="px-5 py-4 text-right font-mono text-xl font-bold text-emerald-400 shadow-[inset_0_-2px_0_rgba(16,185,129,0.5)]">
                  {totalAmount.toFixed(2)}
                </td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
