"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { X, Loader2, Car } from "lucide-react";
import { toast } from "sonner";

interface Props { vehicles: any[]; onClose: () => void; onSuccess: () => void; }

const INPUT = "w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:border-primary/50 [color-scheme:dark]";
const SELECT = "w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-zinc-300 outline-none appearance-none";
const LABEL = "text-[10px] font-bold text-zinc-500 uppercase tracking-wide";

export default function TripModal({ vehicles, onClose, onSuccess }: Props) {
  const [workers, setWorkers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: "", driver_id: "", trip_date: new Date().toISOString().split("T")[0],
    trip_type: "client_visit", from_location: "", to_location: "",
    purpose: "", start_km: "", end_km: "", fuel_used: "", notes: "",
  });

  useEffect(() => {
    insforge.database.from("workers").select("id, name_en, emp_id").then(r => setWorkers(r.data || []));
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const distance = form.start_km && form.end_km ? (parseFloat(form.end_km) - parseFloat(form.start_km)).toFixed(1) : "—";

  const handleSubmit = async () => {
    if (!form.vehicle_id || !form.trip_date) { toast.error("Vehicle and date are required"); return; }
    setSaving(true);
    try {
      const { error } = await insforge.database.from("fleet_trips").insert([{
        vehicle_id: form.vehicle_id,
        driver_id: form.driver_id || null,
        trip_date: form.trip_date,
        trip_type: form.trip_type,
        from_location: form.from_location || null,
        to_location: form.to_location || null,
        purpose: form.purpose || null,
        start_km: form.start_km ? parseFloat(form.start_km) : null,
        end_km: form.end_km ? parseFloat(form.end_km) : null,
        fuel_used: form.fuel_used ? parseFloat(form.fuel_used) : null,
        notes: form.notes || null,
      }]);
      if (error) throw new Error(error.message);
      if (form.end_km && form.vehicle_id) {
        await insforge.database.from("vehicles").update({ odometer_current: parseFloat(form.end_km) }).eq("id", form.vehicle_id);
      }
      toast.success("Trip logged");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0c0c0e] border border-white/10 rounded-[24px] w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#050505] rounded-t-[24px]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Car className="w-5 h-5 text-blue-400" /> Log Trip</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={LABEL}>Vehicle *</label>
              <select value={form.vehicle_id} onChange={e => set("vehicle_id", e.target.value)} className={SELECT}>
                <option value="">— Select Vehicle —</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Driver</label>
              <select value={form.driver_id} onChange={e => set("driver_id", e.target.value)} className={SELECT}>
                <option value="">— Select Driver —</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name_en}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Trip Type</label>
              <select value={form.trip_type} onChange={e => set("trip_type", e.target.value)} className={SELECT}>
                {["client_visit","worker_transport","delivery","personal","other"].map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div><label className={LABEL}>Date *</label><input type="date" value={form.trip_date} onChange={e => set("trip_date", e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Purpose</label><input value={form.purpose} onChange={e => set("purpose", e.target.value)} className={INPUT} placeholder="Brief description" /></div>
            <div><label className={LABEL}>From</label><input value={form.from_location} onChange={e => set("from_location", e.target.value)} className={INPUT} placeholder="Origin" /></div>
            <div><label className={LABEL}>To</label><input value={form.to_location} onChange={e => set("to_location", e.target.value)} className={INPUT} placeholder="Destination" /></div>
            <div><label className={LABEL}>Start KM</label><input type="number" value={form.start_km} onChange={e => set("start_km", e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>End KM</label><input type="number" value={form.end_km} onChange={e => set("end_km", e.target.value)} className={INPUT} /></div>
            <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Distance</p>
              <p className="text-xl font-mono font-bold text-blue-400 mt-1">{distance} km</p>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-white/5 bg-[#050505] rounded-b-[24px] flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-zinc-400 hover:text-white">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Trip
          </button>
        </div>
      </div>
    </div>
  );
}
