"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, FileText, BookOpen, Scale, PieChart, 
  Wallet, Landmark, Receipt, Settings, Activity,
  LayoutDashboard, CreditCard
} from "lucide-react";

const NAV_ITEMS = [
  { label: "OVERVIEW", href: "/accounting", icon: LayoutDashboard },
  { label: "VOUCHERS", href: "/accounting/journals", icon: FileText },
  { label: "LEDGER", href: "/accounting/ledger", icon: BookOpen },
  { label: "TRIAL BALANCE", href: "/accounting/trial-balance", icon: Scale },
  { label: "REPORTS", href: "/reports?category=Accounting", icon: PieChart },
  { label: "COLLECTIONS", href: "/accounting/collections", icon: Wallet },
  { label: "PAYABLES", href: "/accounting/payables", icon: Landmark },
  { label: "CASH JOURNAL", href: "/accounting/cash-journal", icon: Receipt },
  { label: "ACCOUNTS", href: "/accounting", icon: Landmark }, // Linked to dashboard for now
  { label: "PETTY CASH", href: "/accounting/petty-cash", icon: CreditCard },
  { label: "SETTINGS", href: "/settings", icon: Settings },
  { label: "DIAGNOSTICS", href: "/accounting/diagnostics", icon: Activity },
];

export default function AccountingSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 mb-8 bg-white/[0.02] p-2 rounded-2xl border border-white/5">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link key={item.label} href={item.href}>
            <div className={`
              px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer border
              ${isActive 
                ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5"
              }
            `}>
              <item.icon className={`w-3.5 h-3.5 ${isActive ? "text-black" : "text-zinc-500"}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
