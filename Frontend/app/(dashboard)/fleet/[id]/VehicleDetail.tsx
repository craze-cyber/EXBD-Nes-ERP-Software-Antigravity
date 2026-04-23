"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { insforge } from "@/lib/insforge";
import { ArrowLeft, Car, Fuel, Wrench, FileCheck, User, MapPin, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<any>(null);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [tab, setTab] = useState<"overview" | "fuel" | "maintenance" | "compliance">("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const [vRes, fRes, mRes, tRes, cRes] = await Promise.all([
      insforge.database.from("vehicles").select("*, workers(name_en, emp_id, mobile), clients(legal_name)").eq("id", id).single(),
      insforge.database.from("fleet_fuel_logs").select("*, workers(name_en)").eq("vehicle_id", id).order("log_date", { ascending: false }),
      insforge.database.from("fleet_maintenance").select("*").eq("vehicle_id", id).order("service_date", { ascending: false }),
      insforge.database.from("fleet_trips").select("*, workers(name_en)").eq("vehicle_id", id).order("trip_date", { ascending: false }),
      insforge.database.from("compliance_documents").select("*").eq("entity_id", id),
    ]);
    if (vRes.data) setVehicle(vRes.data);
    setFuelLogs(fRes.data || []);
    setMaintenance(mRes.data || []);
    setTrips(tRes.data || []);
    setCompliance(cRes.data || []);
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading vehicle...</div>;
  if (!vehicle) return <div className="p-8 text-center text-zinc-500">Vehicle not found.</div>;

  const totalFuelCost = fuelLogs.reduce((s, f) => s + (f.total_cost || 0), 0);
  const totalMaintCost = maintenance.reduce((s, m) => s + (m.cost || 0), 0);
  const totalTrips = trips.length;
  const totalKm = trips.reduce((s, t) => s + (t.distance_km || 0), 0);

  const statusColor: Record<string, string> = {
    active:         "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    in_maintenance: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    off_road:       "bg-red-500/10 text-red-400 border-red-500/20",
    disposed:       "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  };

  const expiryInfo = (d: string | null) => {
    if (!d) return null;
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    return { diff, cls: diff < 0 ? "text-red-400" : diff <= 30 ? "text-amber-400" : "text-emerald-400" };
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-3">
        <Link href="/fleet" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-colors">
          <ArrowLeft className="w-4 h-4 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-black font-mono tracking-wider text-white">{vehicle.plate_number}</h1>
          <p className="text-zinc-400 mt-0.5">{vehicle.make} {vehicle.model} {vehicle.year && `· ${vehicle.year}`} · {vehicle.vehicle_code}</p>
        </div>
        <span className={cn("ml-2 px-3 py-1 rounded-lg text-xs font-bold border", statusColor[vehicle.status] || statusColor.active)}>
          {vehicle.status?.replace("_", " ").toUpperCase()}
        </span>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-2xl border border-white/5 text-center">
          <p className="text-2xl font-bold font-mono text-white">{vehicle.odometer_current?.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Odometer (km)</p>
        </div>
        <div className="glass p-4 rounded-2xl border border-amber-500/10 text-center">
          <p className="text-2xl font-bold text-amber-400">SAR {totalFuelCost.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Total Fuel Cost</p>
        </div>
        <div className="glass p-4 rounded-2xl border border-red-500/10 text-center">
          <p className="text-2xl font-bold text-red-400">SAR {totalMaintCost.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Maintenance Cost</p>
        </div>
        <div className="glass p-4 rounded-2xl border border-blue-500/10 text-center">
          <p className="text-2xl font-bold text-blue-400">{totalTrips}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Total Trips</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5">
        {(["overview","fuel","maintenance","compliance"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn(
            "px-4 py-2.5 text-sm font-bold capitalize transition-colors",
            tab === t ? "text-primary border-b-2 border-primary" : "text-zinc-500 hover:text-zinc-300"
          )}>{t}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vehicle Info */}
          <div className="glass p-6 rounded-3xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Vehicle Details</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Make / Model", `${vehicle.make} ${vehicle.model}`],
                ["Year", vehicle.year || "—"],
                ["Color", vehicle.color || "—"],
                ["VIN", vehicle.vin || "—"],
                ["Type", vehicle.vehicle_type],
                ["Fuel", vehicle.fuel_type],
                ["Owned", vehicle.is_owned ? "Company Owned" : "Rented"],
                ["Fuel Cap.", vehicle.fuel_capacity ? `${vehicle.fuel_capacity}L` : "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{k}</p>
                  <p className="text-sm text-zinc-200 mt-0.5 capitalize">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Assignment & Compliance */}
          <div className="space-y-4">
            {/* Driver */}
            <div className="glass p-5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-zinc-500" />
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Assigned Driver</h3>
              </div>
              {vehicle.workers ? (
                <div>
                  <p className="text-base font-bold text-white">{vehicle.workers.name_en}</p>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">{vehicle.workers.emp_id} · {vehicle.workers.mobile}</p>
                </div>
              ) : (
                <p className="text-sm text-zinc-600 italic">No driver assigned</p>
              )}
            </div>

            {/* Compliance expiry */}
            <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4" /> Compliance Dates
              </h3>
              {[
                ["Istimara", vehicle.istimara_expiry],
                ["Insurance", vehicle.insurance_expiry],
                ["Registration", vehicle.registration_expiry],
              ].map(([label, date]) => {
                const info = expiryInfo(date);
                return (
                  <div key={label} className="flex items-center justify-between">
                    <p className="text-xs text-zinc-400">{label}</p>
                    <div className="text-right">
                      {date ? (
                        <>
                          <p className="text-xs font-mono text-zinc-300">{date}</p>
                          {info && <p className={cn("text-[10px] font-bold", info.cls)}>{info.diff < 0 ? `Expired ${Math.abs(info.diff)}d ago` : `${info.diff}d remaining`}</p>}
                        </>
                      ) : (
                        <p className="text-xs text-zinc-600">Not set</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* FUEL */}
      {tab === "fuel" && (
        <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/30 text-[10px] uppercase text-zinc-500 border-b border-white/5">
              <tr>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Driver</th>
                <th className="px-5 py-3 text-right">Liters</th>
                <th className="px-5 py-3 text-right">SAR/L</th>
                <th className="px-5 py-3 text-right">Total Cost</th>
                <th className="px-5 py-3 text-right">Odometer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {fuelLogs.map(f => (
                <tr key={f.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3 text-xs font-mono text-zinc-400">{f.log_date}</td>
                  <td className="px-5 py-3 text-xs text-zinc-300">{f.workers?.name_en || "—"}</td>
                  <td className="px-5 py-3 text-xs text-right font-mono text-amber-400">{f.liters_filled}L</td>
                  <td className="px-5 py-3 text-xs text-right font-mono text-zinc-400">{f.cost_per_liter}</td>
                  <td className="px-5 py-3 text-xs text-right font-mono text-emerald-400 font-bold">{f.total_cost?.toLocaleString()}</td>
                  <td className="px-5 py-3 text-xs text-right font-mono text-zinc-500">{f.odometer_reading?.toLocaleString()} km</td>
                </tr>
              ))}
              {fuelLogs.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-zinc-500 text-xs">No fuel logs for this vehicle.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* MAINTENANCE */}
      {tab === "maintenance" && (
        <div className="space-y-3">
          {maintenance.map(m => (
            <div key={m.id} className="glass p-5 rounded-2xl border border-white/5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20">{m.maintenance_type?.replace(/_/g," ")}</span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{m.status}</span>
                </div>
                <p className="text-sm font-bold text-white">{m.description}</p>
                <p className="text-xs text-zinc-500">Vendor: {m.vendor || "In-house"} · Date: {m.service_date} · Odometer: {m.odometer_at_service?.toLocaleString()} km</p>
                {m.next_service_date && <p className="text-xs text-blue-400">Next service: {m.next_service_date}</p>}
              </div>
              <p className="text-sm font-mono font-bold text-emerald-400 whitespace-nowrap">SAR {m.cost?.toLocaleString()}</p>
            </div>
          ))}
          {maintenance.length === 0 && <div className="text-center py-12 text-zinc-500 text-sm glass rounded-2xl border border-white/5">No maintenance records for this vehicle.</div>}
        </div>
      )}

      {/* COMPLIANCE */}
      {tab === "compliance" && (
        <div className="space-y-3">
          {compliance.map(c => {
            const diff = c.expiry_date ? Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / 86400000) : null;
            return (
              <div key={c.id} className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{c.document_type}</p>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">{c.document_number || "—"} · Issued: {c.issue_date || "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-zinc-300">{c.expiry_date}</p>
                  {diff !== null && (
                    <p className={cn("text-[10px] font-bold", diff < 0 ? "text-red-400" : diff <= 30 ? "text-amber-400" : "text-emerald-400")}>
                      {diff < 0 ? `Expired ${Math.abs(diff)}d ago` : `${diff}d remaining`}
                    </p>
                  )}
                  {c.document_url && <a href={c.document_url} target="_blank" className="text-[10px] text-blue-400 hover:underline">View Doc</a>}
                </div>
              </div>
            );
          })}
          {compliance.length === 0 && <div className="text-center py-12 text-zinc-500 text-sm glass rounded-2xl border border-white/5">No compliance documents linked to this vehicle.</div>}
        </div>
      )}
    </div>
  );
}
