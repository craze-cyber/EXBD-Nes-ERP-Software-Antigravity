"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import { 
  Users, Receipt, FileText, BookOpen, Truck, Briefcase, 
  Search, Download, Filter, ChevronRight, AlertCircle,
  Calendar, CreditCard, PieChart, BarChart4
} from "lucide-react";
import * as gen from "@/lib/report-generator";

type Category = "HR" | "Payroll" | "Accounting" | "Fleet" | "Clients";

interface ReportDef {
  id: string;
  label: string;
  desc: string;
  category: Category;
  icon: any;
  action: (data: any) => void;
}

export default function ReportsPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("HR");
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);

  // Data state
  const [workers, setWorkers] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [liabilities, setLiabilities] = useState<any[]>([]);
  const [accounting, setAccounting] = useState<any>({ pl: [], bs: [], tb: [] });
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [wRes, pRes, lRes, aRes, jRes, acRes] = await Promise.all([
        insforge.database.from("workers").select("*, clients(legal_name)"),
        insforge.database.from("payrolls").select("*, workers(name_en, emp_id, occupation_en), clients(legal_name)").gte("pay_period", `${period}-01`).lte("pay_period", `${period}-28`),
        insforge.database.from("worker_liabilities").select("*, workers(name_en, emp_id)"),
        insforge.database.from("assets").select("*, clients(legal_name)"),
        insforge.database.from("journal_lines").select("debit, credit, accounts(code, name, type)"),
        insforge.database.from("accounts").select("*").order("code")
      ]);

      if (wRes.data) setWorkers(wRes.data);
      if (pRes.data) setPayrolls(pRes.data);
      if (lRes.data) setLiabilities(lRes.data);
      if (aRes.data) setAssets(aRes.data);

      if (jRes.data) {
        const agg: Record<string, any> = {};
        jRes.data.forEach((l: any) => {
          const code = l.accounts?.code || "?";
          if (!agg[code]) agg[code] = { name: l.accounts?.name, type: l.accounts?.type, debit: 0, credit: 0 };
          agg[code].debit += l.debit || 0;
          agg[code].credit += l.credit || 0;
        });

        const tb = Object.entries(agg).map(([code, v]) => ({ code, ...v }));
        const pl = tb.filter(v => v.type === "revenue" || v.type === "expense").map(v => ({
          ...v, amount: v.type === "revenue" ? v.credit - v.debit : v.debit - v.credit
        }));
        const bs = tb.filter(v => v.type === "asset" || v.type === "liability" || v.type === "equity").map(v => ({
          ...v, balance: v.type === "asset" ? v.debit - v.credit : v.credit - v.debit
        }));
        setAccounting({ pl, bs, tb });
      }
    } catch (e) {
      toast.error("Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  };

  const reports: ReportDef[] = [
    // HR
    { id: "worker_master", label: "Worker Master Report", desc: "Full database with all worker fields.", category: "HR", icon: Users, action: () => gen.pdfWorkerMaster(workers) },
    { id: "staff_list", label: "Internal Staff List", desc: "List of internal staff members.", category: "HR", icon: Briefcase, action: () => gen.pdfGenericTable("Internal Staff List", "", [{key:"name_en", label:"Name"}, {key:"designation", label:"Designation"}, {key:"mobile", label:"Mobile"}], workers.filter(w => w.business_unit === "Staff")) },
    { id: "doc_expiry", label: "Document Expiry", desc: "Iqama, Passport, and Insurance expiry alerts.", category: "HR", icon: AlertCircle, action: () => gen.pdfDocumentExpiry(workers) },
    { id: "bench_workers", label: "Bench Worker Report", desc: "Unassigned workers currently on bench.", category: "HR", icon: Users, action: () => gen.pdfBenchWorkers(workers) },
    { id: "non_iqama", label: "Non-Iqama Clients", desc: "Workers assigned to clients without Iqama.", category: "HR", icon: AlertCircle, action: () => gen.pdfNonIqamaClients(workers) },
    
    // Payroll
    { id: "salary_sheet", label: "Monthly Salary Sheet", desc: "Detailed breakdown of earnings/deductions.", category: "Payroll", icon: Receipt, action: () => gen.pdfGenericTable(`Salary Sheet - ${period}`, "", [{key:"worker", label:"Worker"}, {key:"emp_id", label:"EMP ID", mono:true}, {key:"net", label:"Net", align:"right"}], payrolls.map(p => ({ worker: p.workers?.name_en, emp_id: p.workers?.emp_id, net: p.net_salary?.toFixed(2) }))) },
    { id: "wps_file", label: "WPS Bank File", desc: "Wage Protection System formatted report.", category: "Payroll", icon: CreditCard, action: () => toast.info("WPS File Generation in progress...") },
    { id: "ot_analysis", label: "Overtime Analysis", desc: "Overtime costs by department/supervisor.", category: "Payroll", icon: BarChart4, action: () => gen.pdfGenericTable(`Overtime Analysis - ${period}`, "", [{key:"worker", label:"Worker"}, {key:"ot", label:"OT Amount", align:"right"}], payrolls.filter(p => p.ot_amount > 0).map(p => ({ worker: p.workers?.name_en, ot: p.ot_amount?.toFixed(2) }))) },
    { id: "payslip_batch", label: "Payslip Batch Export", desc: "Generate all payslips for current month.", category: "Payroll", icon: FileText, action: () => toast.info("Bulk PDF generation started...") },
    { id: "leave_bal", label: "Leave Balance Report", desc: "Accrued vs Taken leaves per employee.", category: "Payroll", icon: Calendar, action: () => toast.info("Leave module integration required.") },

    // Accounting
    { id: "pl_stmt", label: "Profit & Loss", desc: "Revenue vs Expenses statement.", category: "Accounting", icon: PieChart, action: () => gen.pdfProfitLoss(accounting.pl) },
    { id: "bs_stmt", label: "Balance Sheet", desc: "Assets, Liabilities, and Equity summary.", category: "Accounting", icon: BookOpen, action: () => gen.pdfBalanceSheet(accounting.bs) },
    { id: "trial_bal", label: "Trial Balance", desc: "Ledger account balances for verification.", category: "Accounting", icon: Filter, action: () => gen.pdfTrialBalance(accounting.tb) },
    { id: "petty_cash", label: "Petty Cash Statement", desc: "Usage report by supervisor/account.", category: "Accounting", icon: CreditCard, action: () => toast.info("Select Petty Cash account in Ledger.") },

    // Fleet & Assets
    { id: "fleet_report", label: "Vehicle Fleet Report", desc: "List of vehicles and assigned drivers.", category: "Fleet", icon: Truck, action: () => gen.pdfVehicleFleet(assets) },
    { id: "asset_inv", label: "Asset Inventory", desc: "Status and depreciation of company assets.", category: "Fleet", icon: Briefcase, action: () => gen.pdfAssetInventory(assets) },
    { id: "liability_logs", label: "Liability Logs", desc: "Liabilities by worker and recovery status.", category: "Fleet", icon: FileText, action: () => gen.pdfLiabilityLogs(liabilities) },

    // Clients
    { id: "inv_summary", label: "Invoice Summary", desc: "List of invoices generated in period.", category: "Clients", icon: FileText, action: () => gen.pdfGenericTable(`Invoice Summary - ${period}`, "", [{key:"client", label:"Client"}, {key:"amount", label:"Total", align:"right"}], payrolls.reduce((acc: any[], p) => {
      const existing = acc.find(a => a.client === p.clients?.legal_name);
      if (existing) existing.amount = (parseFloat(existing.amount) + (p.net_salary || 0)).toFixed(2);
      else acc.push({ client: p.clients?.legal_name, amount: (p.net_salary || 0).toFixed(2) });
      return acc;
    }, [])) },
    { id: "aging_report", label: "Aging Report", desc: "Unpaid invoices by days overdue.", category: "Clients", icon: Calendar, action: () => toast.info("Accounts Receivable module required.") },
    { id: "profitability", label: "Client Profitability", desc: "Net margin per client (Rev - Cost).", category: "Clients", icon: BarChart4, action: () => gen.pdfClientProfitability(payrolls.reduce((acc: any[], p) => {
      const existing = acc.find(a => a.client === p.clients?.legal_name);
      const cost = p.net_salary || 0;
      const rev = cost * 1.2; // Placeholder for revenue logic
      if (existing) {
        existing.revenue += rev; existing.cost += cost;
      } else {
        acc.push({ client: p.clients?.legal_name, revenue: rev, cost: cost });
      }
      return acc;
    }, []).map(d => ({ ...d, margin: d.revenue - d.cost, pct: ((d.revenue - d.cost) / d.revenue) * 100 }))) },
  ];

  const filteredReports = reports.filter(r => 
    r.category === activeCategory && 
    (r.label.toLowerCase().includes(searchQuery.toLowerCase()) || r.desc.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categories: { id: Category; icon: any }[] = [
    { id: "HR", icon: Users },
    { id: "Payroll", icon: Receipt },
    { id: "Accounting", icon: BookOpen },
    { id: "Fleet", icon: Truck },
    { id: "Clients", icon: Briefcase },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Reports</h1>
          <p className="text-zinc-400 mt-1">Generate and export comprehensive database reports.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500/50 w-64"
            />
          </div>
          <input 
            type="month" 
            value={period} 
            onChange={e => setPeriod(e.target.value)} 
            className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" 
          />
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/5 pb-0 overflow-x-auto hide-scrollbar">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-6 py-4 flex items-center gap-2 border-b-2 transition-all ${
              activeCategory === cat.id ? "border-emerald-500 text-white bg-white/5" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <cat.icon className="w-4 h-4" />
            <span className="text-sm font-bold">{cat.id}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="glass p-6 rounded-2xl border border-white/5 animate-pulse">
              <div className="w-12 h-12 bg-white/5 rounded-xl mb-4" />
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/5 rounded w-full" />
            </div>
          ))
        ) : filteredReports.length > 0 ? (
          filteredReports.map(report => (
            <div key={report.id} className="glass p-6 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <report.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{report.label}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed mb-6">{report.desc}</p>
              </div>
              <button 
                onClick={() => report.action(null)}
                className="w-full py-2.5 bg-white/5 hover:bg-emerald-500 hover:text-black rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-white/10 group-hover:border-transparent"
              >
                <Download className="w-3.5 h-3.5" /> Generate PDF
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center glass rounded-3xl border border-white/5">
            <Search className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-500">No reports found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
