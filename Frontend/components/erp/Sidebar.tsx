"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  Briefcase,
  HardHat,
  Users,
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
  Car,
  Workflow,
  UserCog,
  Sliders,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Personnel",
    items: [
      { name: "Dashboard",      href: "/",          icon: LayoutDashboard },
      { name: "Sponsors",       href: "/sponsors",  icon: Landmark },
      { name: "Clients",        href: "/clients",   icon: Briefcase },
      { name: "Workers",        href: "/workers",   icon: HardHat },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Exit & Settlement", href: "/exit-settlement", icon: UserMinus },
      { name: "Liabilities",       href: "/liabilities",     icon: Scale },
    ],
  },
  {
    label: "Fleet & Assets",
    items: [
      { name: "Fleet & Compliance", href: "/fleet",  icon: Car },
      { name: "Assets & Equipment", href: "/assets", icon: Package2 },
    ],
  },
  {
    label: "Financials",
    items: [
      { name: "Accounting",  href: "/accounting",  icon: Calculator },
      { name: "Payroll",     href: "/payroll",     icon: Banknote },
      { name: "Expenses",    href: "/expenses",    icon: CreditCard },
      { name: "Reports",     href: "/reports",     icon: FileBarChart2 },
    ],
  },
  {
    label: "Settings",
    items: [
      { name: "User Management",  href: "/settings/users",    icon: UserCog },
      { name: "System Settings",  href: "/settings/system",   icon: Sliders },
    ],
  },
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
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest px-3 mb-1.5">
              {section.label}
            </p>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
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
                    <div className="flex items-center gap-1.5">
                      {item.badge != null && item.badge > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                      {active && <ChevronRight className="w-3 h-3 flex-shrink-0 text-primary" />}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
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
