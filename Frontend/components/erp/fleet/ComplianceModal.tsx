"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { X, Loader2, FileCheck, Upload } from "lucide-react";
import { toast } from "sonner";

interface Props { vehicles: any[]; onClose: () => void; onSuccess: () => void; }

const INPUT = "w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:border-primary/50 [color-scheme:dark]";
const SELECT = "w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-zinc-300 outline-none appearance-none";
const LABEL = "text-[10px] font-bold text-zinc-500 uppercase tracking-wide";

const DOC_TYPES_WORKER = ["Iqama", "Driving License", "Work Permit", "Passport", "Health Insurance", "GOSI", "Other"];
const DOC_TYPES_VEHICLE = ["Istimara", "Insurance", "Vehicle Registration", "Mulkia", "Other"];
const DOC_TYPES_COMPANY = ["CR License", "VAT Certificate", "GOSI Certificate", "Zakat Certificate", "Other"];

export default function ComplianceModal({ vehicles, onClose, onSuccess }: Props) {
  const [workers, setWorkers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    entity_type: "vehicle",
    entity_id: "",
    document_type: "",
    document_number: "",
    issue_date: "",
    expiry_date: "",
    issuing_authority: "",
    alert_days_before: "30",
    notes: "",
  });

  useEffect(() => {
    insforge.database.from("workers").select("id, name_en, iqama_no, emp_id").then(r => setWorkers(r.data || []));
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const docTypes = form.entity_type === "worker" ? DOC_TYPES_WORKER
    : form.entity_type === "vehicle" ? DOC_TYPES_VEHICLE
    : DOC_TYPES_COMPANY;

  const entities = form.entity_type === "vehicle" ? vehicles : form.entity_type === "worker" ? workers : [];

  const handleSubmit = async () => {
    if (!form.entity_type || !form.document_type || !form.expiry_date) {
      toast.error("Entity type, document type and expiry date are required");
      return;
    }
    if (form.entity_type !== "company" && !form.entity_id) {
      toast.error("Please select a specific entity");
      return;
    }
    setSaving(true);
    try {
      let document_url = null;
      if (docFile) {
        const ext = docFile.name.split(".").pop();
        const path = `compliance/${Date.now()}-${Math.random().toString(36).slice(7)}.${ext}`;
        const { error: upErr } = await insforge.storage.from("documents").upload(path, docFile);
        if (!upErr) {
          const res: any = insforge.storage.from("documents").getPublicUrl(path);
          document_url = res?.data?.publicUrl || null;
        }
      }

      const expiry = new Date(form.expiry_date);
      const now = new Date();
      const diff = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
      const status = diff < 0 ? "expired" : diff <= 30 ? "expiring_soon" : "valid";

      const { error } = await insforge.database.from("compliance_documents").insert([{
        entity_type: form.entity_type,
        entity_id: form.entity_id || null,
        document_type: form.document_type,
        document_number: form.document_number || null,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date,
        issuing_authority: form.issuing_authority || null,
        alert_days_before: parseInt(form.alert_days_before) || 30,
        notes: form.notes || null,
        document_url,
        status,
      }]);
      if (error) throw new Error(error.message);
      toast.success("Compliance document added");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0c0c0e] border border-white/10 rounded-[24px] w-full max-w-xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#050505] rounded-t-[24px]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileCheck className="w-5 h-5 text-primary" /> Add Compliance Document</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Entity Type *</label>
              <select value={form.entity_type} onChange={e => { set("entity_type", e.target.value); set("entity_id", ""); set("document_type", ""); }} className={SELECT}>
                <option value="vehicle">Vehicle</option>
                <option value="worker">Worker</option>
                <option value="company">Company</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>
                {form.entity_type === "vehicle" ? "Select Vehicle" : form.entity_type === "worker" ? "Select Worker" : "Company"}
              </label>
              {form.entity_type === "company" ? (
                <input value="EXBD Group" disabled className={INPUT + " opacity-50 cursor-not-allowed"} />
              ) : (
                <select value={form.entity_id} onChange={e => set("entity_id", e.target.value)} className={SELECT}>
                  <option value="">— Select —</option>
                  {entities.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {form.entity_type === "vehicle" ? `${e.plate_number} — ${e.make} ${e.model}` : `${e.name_en} (${e.emp_id || e.iqama_no})`}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className={LABEL}>Document Type *</label>
              <select value={form.document_type} onChange={e => set("document_type", e.target.value)} className={SELECT}>
                <option value="">— Select —</option>
                {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={LABEL}>Document Number</label><input value={form.document_number} onChange={e => set("document_number", e.target.value)} className={INPUT} placeholder="DOC-XXXX" /></div>
            <div><label className={LABEL}>Issue Date</label><input type="date" value={form.issue_date} onChange={e => set("issue_date", e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Expiry Date *</label><input type="date" value={form.expiry_date} onChange={e => set("expiry_date", e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Issuing Authority</label><input value={form.issuing_authority} onChange={e => set("issuing_authority", e.target.value)} className={INPUT} placeholder="MOI, GOSI, etc." /></div>
            <div>
              <label className={LABEL}>Alert Days Before Expiry</label>
              <select value={form.alert_days_before} onChange={e => set("alert_days_before", e.target.value)} className={SELECT}>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={LABEL + " flex items-center gap-2"}><Upload className="w-3 h-3" /> Upload Document Scan</label>
              <input type="file" onChange={e => setDocFile(e.target.files?.[0] || null)} className="w-full mt-1 bg-[#1c1c22] border border-white/10 rounded-xl py-2 px-3 text-sm text-zinc-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20" />
            </div>
            <div className="col-span-2"><label className={LABEL}>Notes</label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className={INPUT + " resize-none"} /></div>
          </div>
        </div>
        <div className="p-5 border-t border-white/5 bg-[#050505] rounded-b-[24px] flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-zinc-400 hover:text-white">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Add Document
          </button>
        </div>
      </div>
    </div>
  );
}
