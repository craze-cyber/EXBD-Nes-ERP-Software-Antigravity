"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  Briefcase,
  HardHat,
  Package2,
  Banknote,
  CreditCard,
  UserMinus,
  Scale,
  Calculator,
  FileBarChart2,
  SlidersHorizontal,
  LogOut,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth";

const navItems = [
  { name: "Dashboard",         href: "/",                icon: LayoutDashboard },
  { name: "Sponsors",          href: "/sponsors",        icon: Landmark },
  { name: "Clients",           href: "/clients",         icon: Briefcase },
  { name: "Workers",           href: "/workers",         icon: HardHat },
  { name: "Assets",            href: "/assets",          icon: Package2 },
  { name: "Payroll",           href: "/payroll",         icon: Banknote },
  { name: "Expenses",          href: "/expenses",        icon: CreditCard },
  { name: "Exit & Settlement", href: "/exit-settlement", icon: UserMinus },
  { name: "Liabilities",       href: "/liabilities",     icon: Scale },
  { name: "Accounting",        href: "/accounting",      icon: Calculator },
  { name: "Reports",           href: "/reports",         icon: FileBarChart2 },
  { name: "Settings",          href: "/settings/users",  icon: SlidersHorizontal },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-64 bg-surface border-r border-white/5 flex flex-col h-full">

      {/* Logo / Brand Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-9 h-12 flex-shrink-0">
            <Image
              src="/exbd-logo.png"
              alt="EXBD Group"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white leading-tight tracking-wide">EXBD Group</p>
            <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">Sovereign ERP Engine</p>
          </div>
        </div>

        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden flex-shrink-0 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest px-3 mb-2">Main Menu</p>
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150",
                  active
                    ? "bg-primary/15 text-primary border border-primary/25"
                    : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <item.icon
                    className={cn(
                      "w-4 h-4 flex-shrink-0 transition-colors",
                      active ? "text-primary" : "text-zinc-500 group-hover:text-zinc-300"
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                {active && <ChevronRight className="w-3 h-3 flex-shrink-0 text-primary" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sign Out */}
      <div className="px-3 pb-4 pt-2 border-t border-white/5">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
