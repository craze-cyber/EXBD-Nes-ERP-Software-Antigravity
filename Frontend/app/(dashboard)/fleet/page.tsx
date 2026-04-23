"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { Plus, Search, Car, Fuel, FileCheck, AlertTriangle, Wrench, CheckCircle2, XCircle, Clock, Filter, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Pagination from "@/components/erp/Pagination";
import AddVehicleModal from "@/components/erp/fleet/AddVehicleModal";
import FuelLogModal from "@/components/erp/fleet/FuelLogModal";
import TripModal from "@/components/erp/fleet/TripModal";
import ComplianceModal from "@/components/erp/fleet/ComplianceModal";
import VehicleCard from "@/components/erp/fleet/VehicleCard";
import Link from "next/link";

const PAGE_SIZE = 9;

type FleetTab = "vehicles" | "fuel" | "compliance";

export default function FleetPage() {
  const [tab, setTab] = useState<FleetTab>("vehicles");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showFuelLog, setShowFuelLog] = useState(false);
  const [showTrip, setShowTrip] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [vRes, fRes, tRes, cRes] = await Promise.all([
      insforge.database.from("vehicles").select("*, workers(name_en, emp_id)").order("created_at", { ascending: false }),
      insforge.database.from("fleet_fuel_logs").select("*, vehicles(plate_number, make, model), workers(name_en)").order("log_date", { ascending: false }).limit(50),
      insforge.database.from("fleet_trips").select("*, vehicles(plate_number, make, model), workers(name_en)").order("trip_date", { ascending: false }).limit(50),
      insforge.database.from("compliance_documents").select("*").order("expiry_date", { ascending: true }),
    ]);
    setVehicles(vRes.data || []);
    setFuelLogs(fRes.data || []);
    setTrips(tRes.data || []);
    setCompliance(cRes.data || []);
    setIsLoading(false);
  };

  // KPIs
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.status === "active").length;
  const inMaintenance = vehicles.filter(v => v.status === "in_maintenance").length;
  const now = new Date();
  const expiring = compliance.filter(c => {
    if (!c.expiry_date) return false;
    const diff = (new Date(c.expiry_date).getTime() - now.getTime()) / 86400000;
    return diff <= 30;
  });

  // Vehicle filtering
  const filteredVehicles = vehicles.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.plate_number?.toLowerCase().includes(q) || v.make?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q) || v.workers?.name_en?.toLowerCase().includes(q);
  });
  const pagedVehicles = filteredVehicles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Compliance categorization
  const expired = compliance.filter(c => c.status === "expired" || (c.expiry_date && new Date(c.expiry_date) < now));
  const expiringSoon = compliance.filter(c => {
    if (!c.expiry_date) return false;
    const diff = (new Date(c.expiry_date).getTime() - now.getTime()) / 86400000;
    return diff >= 0 && diff <= 30;
  });
  const valid = compliance.filter(c => {
    if (!c.expiry_date) return false;
    const diff = (new Date(c.expiry_date).getTime() - now.getTime()) / 86400000;
    return diff > 30;
  });

  const statusBadge = (status: string) => {
    if (status === "expired") return "bg-red-500/10 text-red-400 border-red-500/20";
    if (status === "expiring_soon") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  };

  const daysLeft = (expiry: string) => {
    const diff = Math.ceil((new Date(expiry).getTime() - now.getTime()) / 86400000);
    return diff;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet & Compliance</h1>
          <p className="text-zinc-400 mt-1">Manage vehicles, fuel, trips and compliance documents.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === "vehicles" && (
            <button onClick={() => setShowAddVehicle(true)} className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all">
              <Plus className="w-4 h-4" /> Register Vehicle
            </button>
          )}
          {tab === "fuel" && (
            <>
              <button onClick={() => setShowFuelLog(true)} className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                <Fuel className="w-4 h-4" /> Log Fuel
              </button>
              <button onClick={() => setShowTrip(true)} className="px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                <Car className="w-4 h-4" /> Log Trip
              </button>
            </>
          )}
          {tab === "compliance" && (
            <button onClick={() => setShowCompliance(true)} className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
              <Plus className="w-4 h-4" /> Add Document
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-2xl border border-white/5 text-center">
          <p className="text-3xl font-bold text-white">{totalVehicles}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Total Vehicles</p>
        </div>
        <div className="glass p-5 rounded-2xl border border-emerald-500/10 text-center">
          <p className="text-3xl font-bold text-emerald-400">{activeVehicles}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Active</p>
        </div>
        <div className="glass p-5 rounded-2xl border border-amber-500/10 text-center">
          <p className="text-3xl font-bold text-amber-400">{inMaintenance}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">In Maintenance</p>
        </div>
        <div className={cn("glass p-5 rounded-2xl text-center cursor-pointer transition-all", expiring.length > 0 ? "border border-red-500/30 hover:bg-red-500/5" : "border border-white/5")} onClick={() => setTab("compliance")}>
          <p className={cn("text-3xl font-bold", expiring.length > 0 ? "text-red-400" : "text-zinc-400")}>{expiring.length}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Expiring Docs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 pb-px">
        {(["vehicles", "fuel", "compliance"] as FleetTab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setCurrentPage(1); }} className={cn(
            "px-5 py-2.5 text-sm font-bold rounded-t-xl transition-colors capitalize flex items-center gap-2",
            tab === t ? "text-primary border-b-2 border-primary" : "text-zinc-500 hover:text-zinc-300"
          )}>
            {t === "vehicles" && <Car className="w-4 h-4" />}
            {t === "fuel" && <Fuel className="w-4 h-4" />}
            {t === "compliance" && <FileCheck className="w-4 h-4" />}
            {t === "vehicles" ? "Vehicles" : t === "fuel" ? "Fuel & Trips" : "Compliance"}
            {t === "compliance" && expiring.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{expiring.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: VEHICLES */}
      {tab === "vehicles" && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search plate, make, model or driver…" className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm outline-none focus:border-primary/50" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-zinc-500 text-sm animate-pulse">Loading fleet...</div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-20 glass rounded-3xl">
              <Car className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 font-semibold">No vehicles registered</p>
              <p className="text-zinc-600 text-sm mt-1">Register your first vehicle to get started.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagedVehicles.map(v => (
                  <VehicleCard key={v.id} vehicle={v} onRefresh={loadData} />
                ))}
              </div>
              <Pagination currentPage={currentPage} totalItems={filteredVehicles.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
            </>
          )}
        </>
      )}

      {/* TAB: FUEL & TRIPS */}
      {tab === "fuel" && (
        <div className="space-y-6">
          {/* Fuel Logs */}
          <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-400" /> Recent Fuel Logs
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-black/30 text-[10px] uppercase text-zinc-500 border-b border-white/5">
                <tr>
                  <th className="px-5 py-3 text-left">Vehicle</th>
                  <th className="px-5 py-3 text-left">Driver</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-right">Liters</th>
                  <th className="px-5 py-3 text-right">Cost (SAR)</th>
                  <th className="px-5 py-3 text-right">Odometer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {fuelLogs.map(f => (
                  <tr key={f.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-mono text-xs text-zinc-300">{f.vehicles?.plate_number} <span className="text-zinc-500">{f.vehicles?.make} {f.vehicles?.model}</span></td>
                    <td className="px-5 py-3 text-xs text-zinc-400">{f.workers?.name_en || "—"}</td>
                    <td className="px-5 py-3 text-xs text-zinc-400 font-mono">{f.log_date}</td>
                    <td className="px-5 py-3 text-xs text-right font-mono text-amber-400">{f.liters_filled}L</td>
                    <td className="px-5 py-3 text-xs text-right font-mono text-emerald-400 font-bold">{f.total_cost?.toLocaleString()}</td>
                    <td className="px-5 py-3 text-xs text-right font-mono text-zinc-500">{f.odometer_reading?.toLocaleString()} km</td>
                  </tr>
                ))}
                {fuelLogs.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-zinc-500 text-xs">No fuel logs yet.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Trips */}
          <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-400" /> Recent Trips
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-black/30 text-[10px] uppercase text-zinc-500 border-b border-white/5">
                <tr>
                  <th className="px-5 py-3 text-left">Vehicle</th>
                  <th className="px-5 py-3 text-left">Driver</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Route</th>
                  <th className="px-5 py-3 text-right">Distance</th>
                  <th className="px-5 py-3 text-left">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trips.map(t => (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-mono text-xs text-zinc-300">{t.vehicles?.plate_number}</td>
                    <td className="px-5 py-3 text-xs text-zinc-400">{t.workers?.name_en || "—"}</td>
                    <td className="px-5 py-3 text-xs text-zinc-400 font-mono">{t.trip_date}</td>
                    <td className="px-5 py-3 text-xs text-zinc-400">{t.from_location} → {t.to_location}</td>
                    <td className="px-5 py-3 text-xs text-right font-mono text-blue-400">{t.distance_km?.toFixed(1)} km</td>
                    <td className="px-5 py-3 text-xs text-zinc-500 capitalize">{t.trip_type?.replace(/_/g, " ")}</td>
                  </tr>
                ))}
                {trips.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-zinc-500 text-xs">No trips logged yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: COMPLIANCE */}
      {tab === "compliance" && (
        <div className="space-y-6">
          {/* Alert Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass p-5 rounded-2xl border border-red-500/20">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <p className="text-sm font-bold text-red-400">Expired Now</p>
              </div>
              <p className="text-3xl font-bold text-red-400">{expired.length}</p>
              <p className="text-xs text-zinc-500 mt-1">Requires immediate action</p>
            </div>
            <div className="glass p-5 rounded-2xl border border-amber-500/20">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <p className="text-sm font-bold text-amber-400">Expiring in 30 Days</p>
              </div>
              <p className="text-3xl font-bold text-amber-400">{expiringSoon.length}</p>
              <p className="text-xs text-zinc-500 mt-1">Renew before expiry</p>
            </div>
            <div className="glass p-5 rounded-2xl border border-emerald-500/10">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <p className="text-sm font-bold text-emerald-400">Valid</p>
              </div>
              <p className="text-3xl font-bold text-emerald-400">{valid.length}</p>
              <p className="text-xs text-zinc-500 mt-1">All documents in order</p>
            </div>
          </div>

          {/* Compliance Table */}
          <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary" /> All Compliance Documents
              </h3>
              <button onClick={() => setShowCompliance(true)} className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg text-xs font-bold transition-all flex items-center gap-1.5">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-black/30 text-[10px] uppercase text-zinc-500 border-b border-white/5">
                  <tr>
                    <th className="px-5 py-3 text-left">Entity</th>
                    <th className="px-5 py-3 text-left">Type</th>
                    <th className="px-5 py-3 text-left">Document</th>
                    <th className="px-5 py-3 text-left">Number</th>
                    <th className="px-5 py-3 text-left">Expiry Date</th>
                    <th className="px-5 py-3 text-center">Days Left</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {compliance.map(c => {
                    const days = c.expiry_date ? daysLeft(c.expiry_date) : null;
                    const st = days === null ? "valid" : days < 0 ? "expired" : days <= 30 ? "expiring_soon" : "valid";
                    return (
                      <tr key={c.id} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-3 text-xs font-bold text-zinc-200">{c.entity_type || "—"}</td>
                        <td className="px-5 py-3 text-xs text-zinc-500 capitalize">{c.entity_type}</td>
                        <td className="px-5 py-3 text-xs text-zinc-300">{c.document_type}</td>
                        <td className="px-5 py-3 text-xs font-mono text-zinc-400">{c.document_number || "—"}</td>
                        <td className="px-5 py-3 text-xs font-mono text-zinc-400">{c.expiry_date || "—"}</td>
                        <td className="px-5 py-3 text-center">
                          {days !== null && (
                            <span className={cn("text-xs font-bold font-mono", days < 0 ? "text-red-400" : days <= 30 ? "text-amber-400" : "text-emerald-400")}>
                              {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase border", statusBadge(st))}>
                            {st.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {c.document_url ? (
                            <a href={c.document_url} target="_blank" className="text-xs text-blue-400 hover:underline">View</a>
                          ) : (
                            <span className="text-xs text-zinc-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {compliance.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-zinc-500 text-xs">No compliance documents. Add documents for workers and vehicles.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddVehicle && <AddVehicleModal onClose={() => setShowAddVehicle(false)} onSuccess={() => { setShowAddVehicle(false); loadData(); }} />}
      {showFuelLog && <FuelLogModal vehicles={vehicles} onClose={() => setShowFuelLog(false)} onSuccess={() => { setShowFuelLog(false); loadData(); }} />}
      {showTrip && <TripModal vehicles={vehicles} onClose={() => setShowTrip(false)} onSuccess={() => { setShowTrip(false); loadData(); }} />}
      {showCompliance && <ComplianceModal vehicles={vehicles} onClose={() => setShowCompliance(false)} onSuccess={() => { setShowCompliance(false); loadData(); }} />}
    </div>
  );
}
