"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props { onClose: () => void; onSuccess: () => void; }

const INPUT = "w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:border-primary/50 [color-scheme:dark]";
const SELECT = "w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-zinc-300 outline-none appearance-none";
const LABEL = "text-[10px] font-bold text-zinc-500 uppercase tracking-wide";

export default function AddVehicleModal({ onClose, onSuccess }: Props) {
  const [workers, setWorkers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    plate_number: "", make: "", model: "", year: "",
    color: "", vin: "", vehicle_type: "sedan", fuel_type: "petrol",
    registration_number: "", registration_expiry: "",
    istimara_expiry: "", insurance_policy: "", insurance_expiry: "",
    insurance_type: "comprehensive", assigned_driver: "",
    assigned_client: "", status: "active",
    odometer_current: "0", fuel_capacity: "",
    purchase_date: "", purchase_price: "",
    monthly_rent: "", is_owned: "true", notes: "",
  });

  useEffect(() => {
    insforge.database.from("workers").select("id, name_en, emp_id").then(r => setWorkers(r.data || []));
    insforge.database.from("clients").select("id, legal_name").then(r => setClients(r.data || []));
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const generateCode = async () => {
    const { data } = await insforge.database.from("vehicles").select("vehicle_code").order("created_at", { ascending: false }).limit(1);
    let n = 1;
    if (data?.[0]?.vehicle_code) {
      const m = data[0].vehicle_code.match(/VEH-(\d+)/);
      if (m) n = parseInt(m[1]) + 1;
    }
    return `VEH-${n.toString().padStart(4, "0")}`;
  };

  const handleSubmit = async () => {
    if (!form.plate_number || !form.make || !form.model) {
      toast.error("Plate number, make, and model are required");
      return;
    }
    setSaving(true);
    try {
      const vehicle_code = await generateCode();
      const { error } = await insforge.database.from("vehicles").insert([{
        vehicle_code,
        plate_number: form.plate_number,
        make: form.make,
        model: form.model,
        year: form.year ? parseInt(form.year) : null,
        color: form.color || null,
        vin: form.vin || null,
        vehicle_type: form.vehicle_type,
        fuel_type: form.fuel_type,
        registration_number: form.registration_number || null,
        registration_expiry: form.registration_expiry || null,
        istimara_expiry: form.istimara_expiry || null,
        insurance_policy: form.insurance_policy || null,
        insurance_expiry: form.insurance_expiry || null,
        insurance_type: form.insurance_type,
        assigned_driver: form.assigned_driver || null,
        assigned_client: form.assigned_client || null,
        status: form.status,
        odometer_current: parseFloat(form.odometer_current) || 0,
        fuel_capacity: form.fuel_capacity ? parseFloat(form.fuel_capacity) : null,
        purchase_date: form.purchase_date || null,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        monthly_rent: form.monthly_rent ? parseFloat(form.monthly_rent) : null,
        is_owned: form.is_owned === "true",
        notes: form.notes || null,
      }]);
      if (error) throw new Error(error.message);
      toast.success(`Vehicle ${vehicle_code} registered`);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0c0c0e] border border-white/10 rounded-[24px] w-full max-w-3xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#050505] rounded-t-[24px]">
          <h2 className="text-xl font-bold text-white">Register Vehicle</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Basic Info */}
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 pb-2 border-b border-white/5">Vehicle Information</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className={LABEL}>Plate Number *</label><input value={form.plate_number} onChange={e => set("plate_number", e.target.value)} className={INPUT} placeholder="e.g., ABC-1234" /></div>
              <div><label className={LABEL}>Make *</label><input value={form.make} onChange={e => set("make", e.target.value)} className={INPUT} placeholder="Toyota" /></div>
              <div><label className={LABEL}>Model *</label><input value={form.model} onChange={e => set("model", e.target.value)} className={INPUT} placeholder="Hilux" /></div>
              <div><label className={LABEL}>Year</label><input type="number" value={form.year} onChange={e => set("year", e.target.value)} className={INPUT} placeholder="2023" /></div>
              <div><label className={LABEL}>Color</label><input value={form.color} onChange={e => set("color", e.target.value)} className={INPUT} placeholder="White" /></div>
              <div><label className={LABEL}>VIN</label><input value={form.vin} onChange={e => set("vin", e.target.value)} className={INPUT} placeholder="1HGBH41..." /></div>
              <div>
                <label className={LABEL}>Type</label>
                <select value={form.vehicle_type} onChange={e => set("vehicle_type", e.target.value)} className={SELECT}>
                  {["sedan","suv","pickup","bus","truck","van","motorcycle"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Fuel Type</label>
                <select value={form.fuel_type} onChange={e => set("fuel_type", e.target.value)} className={SELECT}>
                  {["petrol","diesel","electric","hybrid"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Ownership</label>
                <select value={form.is_owned} onChange={e => set("is_owned", e.target.value)} className={SELECT}>
                  <option value="true">Company Owned</option>
                  <option value="false">Rented</option>
                </select>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 pb-2 border-b border-white/5">Registration & Compliance</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className={LABEL}>Reg. Number</label><input value={form.registration_number} onChange={e => set("registration_number", e.target.value)} className={INPUT} /></div>
              <div><label className={LABEL}>Reg. Expiry</label><input type="date" value={form.registration_expiry} onChange={e => set("registration_expiry", e.target.value)} className={INPUT} /></div>
              <div><label className={LABEL}>Istimara Expiry</label><input type="date" value={form.istimara_expiry} onChange={e => set("istimara_expiry", e.target.value)} className={INPUT} /></div>
              <div><label className={LABEL}>Insurance Policy</label><input value={form.insurance_policy} onChange={e => set("insurance_policy", e.target.value)} className={INPUT} /></div>
              <div><label className={LABEL}>Insurance Expiry</label><input type="date" value={form.insurance_expiry} onChange={e => set("insurance_expiry", e.target.value)} className={INPUT} /></div>
              <div>
                <label className={LABEL}>Insurance Type</label>
                <select value={form.insurance_type} onChange={e => set("insurance_type", e.target.value)} className={SELECT}>
                  <option value="comprehensive">Comprehensive</option>
                  <option value="third_party">Third Party</option>
                </select>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 pb-2 border-b border-white/5">Assignment</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Assign Driver</label>
                <select value={form.assigned_driver} onChange={e => set("assigned_driver", e.target.value)} className={SELECT}>
                  <option value="">— No Driver —</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name_en} ({w.emp_id})</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Assign Client</label>
                <select value={form.assigned_client} onChange={e => set("assigned_client", e.target.value)} className={SELECT}>
                  <option value="">— No Client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Financial */}
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 pb-2 border-b border-white/5">Financial & Specs</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className={LABEL}>Current Odometer (km)</label><input type="number" value={form.odometer_current} onChange={e => set("odometer_current", e.target.value)} className={INPUT} /></div>
              <div><label className={LABEL}>Fuel Capacity (L)</label><input type="number" value={form.fuel_capacity} onChange={e => set("fuel_capacity", e.target.value)} className={INPUT} /></div>
              <div><label className={LABEL}>Purchase Date</label><input type="date" value={form.purchase_date} onChange={e => set("purchase_date", e.target.value)} className={INPUT} /></div>
              <div><label className={LABEL}>Purchase Price (SAR)</label><input type="number" value={form.purchase_price} onChange={e => set("purchase_price", e.target.value)} className={INPUT} /></div>
              {form.is_owned === "false" && <div><label className={LABEL}>Monthly Rent (SAR)</label><input type="number" value={form.monthly_rent} onChange={e => set("monthly_rent", e.target.value)} className={INPUT} /></div>}
            </div>
          </div>

          <div><label className={LABEL}>Notes</label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className={INPUT + " resize-none"} placeholder="Any additional notes..." /></div>
        </div>

        <div className="p-6 border-t border-white/5 bg-[#050505] rounded-b-[24px] flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-zinc-400 hover:text-white">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Register Vehicle
          </button>
        </div>
      </div>
    </div>
  );
}
