"use client";

import React from "react";
import { Car, User, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  vehicle: any;
  onRefresh: () => void;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  active:          { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Active" },
  in_maintenance:  { color: "bg-amber-500/10 text-amber-400 border-amber-500/20",       label: "In Maintenance" },
  off_road:        { color: "bg-red-500/10 text-red-400 border-red-500/20",             label: "Off Road" },
  disposed:        { color: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",          label: "Disposed" },
  rented_out:      { color: "bg-blue-500/10 text-blue-400 border-blue-500/20",          label: "Rented Out" },
};

function expiryStatus(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: "Expired", color: "text-red-400", icon: "🔴" };
  if (diff <= 30) return { label: `${diff}d left`, color: "text-amber-400", icon: "🟡" };
  return { label: `${diff}d`, color: "text-emerald-400", icon: "🟢" };
}

export default function VehicleCard({ vehicle: v, onRefresh }: Props) {
  const st = statusConfig[v.status] || statusConfig.active;
  const regExp = expiryStatus(v.registration_expiry);
  const insExp = expiryStatus(v.insurance_expiry);
  const istiExp = expiryStatus(v.istimara_expiry);

  const hasAlert = [regExp, insExp, istiExp].some(e => e && (e.icon === "🔴" || e.icon === "🟡"));

  return (
    <div className={cn("glass rounded-2xl border overflow-hidden transition-all hover:border-white/15", hasAlert ? "border-amber-500/20" : "border-white/5")}>
      {/* Plate header */}
      <div className="px-5 py-4 bg-black/30 border-b border-white/5 flex items-center justify-between">
        <div>
          <p className="text-xl font-black font-mono tracking-wider text-white">{v.plate_number}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{v.make} {v.model} · {v.year || "—"}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase border", st.color)}>
            {st.label}
          </span>
          {v.vehicle_type && (
            <span className="text-[9px] text-zinc-600 uppercase tracking-wider">{v.vehicle_type}</span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Driver */}
        <div className="flex items-center gap-2.5">
          <User className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
          <div className="min-w-0">
            {v.workers ? (
              <p className="text-xs font-bold text-white truncate">{v.workers.name_en}</p>
            ) : (
              <p className="text-xs text-zinc-600 italic">No driver assigned</p>
            )}
          </div>
        </div>

        {/* Compliance indicators */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
          <div className="text-center">
            <p className="text-[8px] text-zinc-600 uppercase mb-1">Istimara</p>
            {istiExp ? (
              <p className={cn("text-[10px] font-bold", istiExp.color)}>{istiExp.icon} {istiExp.label}</p>
            ) : (
              <p className="text-[10px] text-zinc-600">—</p>
            )}
          </div>
          <div className="text-center border-x border-white/5">
            <p className="text-[8px] text-zinc-600 uppercase mb-1">Insurance</p>
            {insExp ? (
              <p className={cn("text-[10px] font-bold", insExp.color)}>{insExp.icon} {insExp.label}</p>
            ) : (
              <p className="text-[10px] text-zinc-600">—</p>
            )}
          </div>
          <div className="text-center">
            <p className="text-[8px] text-zinc-600 uppercase mb-1">Reg.</p>
            {regExp ? (
              <p className={cn("text-[10px] font-bold", regExp.color)}>{regExp.icon} {regExp.label}</p>
            ) : (
              <p className="text-[10px] text-zinc-600">—</p>
            )}
          </div>
        </div>

        {/* Odometer */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-zinc-500">Odometer</span>
          <span className="font-mono text-zinc-300">{v.odometer_current?.toLocaleString() || 0} km</span>
        </div>

        <Link href={`/fleet/${v.id}`} className="block w-full mt-1">
          <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition-all border border-white/5">
            View Details →
          </button>
        </Link>
      </div>
    </div>
  );
}
