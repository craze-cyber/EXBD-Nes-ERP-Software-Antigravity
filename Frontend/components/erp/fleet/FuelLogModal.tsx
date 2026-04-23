"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { X, Loader2, Fuel } from "lucide-react";
import { toast } from "sonner";

interface Props { vehicles: any[]; onClose: () => void; onSuccess: () => void; }

const INPUT = "w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:border-primary/50 [color-scheme:dark]";
const SELECT = "w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-zinc-300 outline-none appearance-none";
const LABEL = "text-[10px] font-bold text-zinc-500 uppercase tracking-wide";

export default function FuelLogModal({ vehicles, onClose, onSuccess }: Props) {
  const [workers, setWorkers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: "", driver_id: "", log_date: new Date().toISOString().split("T")[0],
    odometer_reading: "", liters_filled: "", cost_per_liter: "",
    fuel_station: "", notes: "",
  });

  useEffect(() => {
    insforge.database.from("workers").select("id, name_en, emp_id").then(r => setWorkers(r.data || []));
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const totalCost = form.liters_filled && form.cost_per_liter
    ? (parseFloat(form.liters_filled) * parseFloat(form.cost_per_liter)).toFixed(2)
    : "0.00";

  const handleSubmit = async () => {
    if (!form.vehicle_id || !form.log_date || !form.liters_filled) {
      toast.error("Vehicle, date and liters are required");
      return;
    }
    setSaving(true);
    try {
      const { error } = await insforge.database.from("fleet_fuel_logs").insert([{
        vehicle_id: form.vehicle_id,
        driver_id: form.driver_id || null,
        log_date: form.log_date,
        odometer_reading: form.odometer_reading ? parseFloat(form.odometer_reading) : null,
        liters_filled: parseFloat(form.liters_filled),
        cost_per_liter: form.cost_per_liter ? parseFloat(form.cost_per_liter) : null,
        total_cost: parseFloat(totalCost),
        fuel_station: form.fuel_station || null,
        notes: form.notes || null,
      }]);
      if (error) throw new Error(error.message);
      // Update vehicle odometer
      if (form.odometer_reading && form.vehicle_id) {
        await insforge.database.from("vehicles").update({ odometer_current: parseFloat(form.odometer_reading) }).eq("id", form.vehicle_id);
      }
      toast.success("Fuel log saved");
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
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Fuel className="w-5 h-5 text-amber-400" /> Log Fuel</h2>
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
            <div><label className={LABEL}>Date *</label><input type="date" value={form.log_date} onChange={e => set("log_date", e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Odometer (km)</label><input type="number" value={form.odometer_reading} onChange={e => set("odometer_reading", e.target.value)} className={INPUT} placeholder="0" /></div>
            <div><label className={LABEL}>Liters Filled *</label><input type="number" value={form.liters_filled} onChange={e => set("liters_filled", e.target.value)} className={INPUT} placeholder="0.00" /></div>
            <div><label className={LABEL}>Cost / Liter (SAR)</label><input type="number" value={form.cost_per_liter} onChange={e => set("cost_per_liter", e.target.value)} className={INPUT} placeholder="2.18" /></div>
            <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Cost</p>
              <p className="text-xl font-mono font-bold text-emerald-400 mt-1">SAR {totalCost}</p>
            </div>
            <div className="col-span-2"><label className={LABEL}>Station</label><input value={form.fuel_station} onChange={e => set("fuel_station", e.target.value)} className={INPUT} placeholder="e.g., ARAMCO Station Riyadh" /></div>
          </div>
        </div>
        <div className="p-5 border-t border-white/5 bg-[#050505] rounded-b-[24px] flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-zinc-400 hover:text-white">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Fuel Log
          </button>
        </div>
      </div>
    </div>
  );
}
