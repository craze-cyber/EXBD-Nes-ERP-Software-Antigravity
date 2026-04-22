"use client";

import React, { useState } from "react";
import { insforge } from "@/lib/insforge";
import { X, Upload, Camera } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAssetModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    name: "",
    category: "it_equipment",
    brand: "",
    model: "",
    serial_number: "",
    purchase_date: "",
    purchase_price: "",
    depreciation_rate: "0",
    warranty_expiry: "",
    condition: "new",
    location: "",
    notes: ""
  });
  
  const [photo, setPhoto] = useState<File|null>(null);
  const [invoice, setInvoice] = useState<File|null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate AST-XXXX code based on max ID
  const generateCode = async () => {
    const { data } = await insforge.database
      .from("assets")
      .select("asset_code")
      .order("created_at", { ascending: false })
      .limit(1);
    
    let nextNum = 1;
    if (data && data.length > 0) {
      const match = data[0].asset_code.match(/AST-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    return `AST-${nextNum.toString().padStart(4, "0")}`;
  };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const { error: uploadError } = await insforge.storage.from("assets").upload(fileName, file);
    if (!uploadError) {
      const urlRes: any = insforge.storage.from("assets").getPublicUrl(fileName);
      return typeof urlRes === 'string' ? urlRes : urlRes?.data?.publicUrl;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!form.name || !form.category) {
      toast.error("Name and Category are required");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const assetCode = await generateCode();
      let photo_url = null;
      let invoice_url = null;

      if (photo) photo_url = await uploadFile(photo, "photos");
      if (invoice) invoice_url = await uploadFile(invoice, "invoices");

      const price = parseFloat(form.purchase_price) || 0;

      const { error } = await insforge.database.from("assets").insert([{
        asset_code: assetCode,
        name: form.name,
        category: form.category,
        brand: form.brand || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        purchase_date: form.purchase_date || null,
        purchase_price: price,
        current_value: price, 
        depreciation_rate: parseFloat(form.depreciation_rate) || 0,
        warranty_expiry: form.warranty_expiry || null,
        condition: form.condition,
        location: form.location || null,
        notes: form.notes || null,
        photo_url,
        invoice_url,
        status: "available"
      }]);

      if (error) throw new Error(error.message);
      
      toast.success("Asset added successfully");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4 overflow-y-auto">
      <div className="bg-[#0c0c0e] border border-white/10 rounded-[24px] shadow-2xl w-full max-w-3xl my-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#050505] rounded-t-[24px]">
          <h2 className="text-xl font-bold text-white tracking-tight">Register New Asset</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Base Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Asset Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:border-emerald-500" placeholder="e.g., MacBook Pro M2" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Category *</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-zinc-300 outline-none appearance-none">
                <option value="it_equipment">IT Equipment</option>
                <option value="office_furniture">Office Furniture</option>
                <option value="vehicle">Vehicle</option>
                <option value="tools">Tools</option>
                <option value="safety_equipment">Safety Equipment</option>
                <option value="communication">Communication</option>
                <option value="medical">Medical</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Brand</label>
              <input value={form.brand} onChange={e => setForm(f => ({...f, brand: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none" placeholder="e.g., Apple" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Model</label>
              <input value={form.model} onChange={e => setForm(f => ({...f, model: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none" placeholder="e.g., A2338" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Serial Number</label>
              <input value={form.serial_number} onChange={e => setForm(f => ({...f, serial_number: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none font-mono" placeholder="SN-XXXX" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs font-bold text-zinc-500 uppercase">Purchase Date</label>
              <input type="date" value={form.purchase_date} onChange={e => setForm(f => ({...f, purchase_date: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white outline-none [color-scheme:dark]" />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs font-bold text-zinc-500 uppercase">Price (SAR)</label>
              <input type="number" value={form.purchase_price} onChange={e => setForm(f => ({...f, purchase_price: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white font-mono outline-none" placeholder="0.00" />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs font-bold text-zinc-500 uppercase">Deprec. Rate %</label>
              <input type="number" value={form.depreciation_rate} onChange={e => setForm(f => ({...f, depreciation_rate: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white font-mono outline-none" placeholder="20" />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs font-bold text-zinc-500 uppercase">Warranty Exp.</label>
              <input type="date" value={form.warranty_expiry} onChange={e => setForm(f => ({...f, warranty_expiry: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white outline-none [color-scheme:dark]" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Condition</label>
              <select value={form.condition} onChange={e => setForm(f => ({...f, condition: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-zinc-300 outline-none appearance-none">
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase">Location / Default Camp</label>
              <input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} className="w-full mt-1 bg-[#15151a] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white outline-none" placeholder="e.g., HQ Storage Room A" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2 pb-1.5"><Camera className="w-3.5 h-3.5"/> Photo Upload</label>
              <input type="file" onChange={e => setPhoto(e.target.files ? e.target.files[0] : null)} className="w-full bg-[#1c1c22] border border-white/10 rounded-xl py-2 px-3 text-sm text-zinc-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20" />
            </div>
            <div>
               <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2 pb-1.5"><Upload className="w-3.5 h-3.5"/> Invoice Upload</label>
               <input type="file" onChange={e => setInvoice(e.target.files ? e.target.files[0] : null)} className="w-full bg-[#1c1c22] border border-white/10 rounded-xl py-2 px-3 text-sm text-zinc-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20" />
            </div>
          </div>

        </div>

        <div className="p-6 border-t border-white/5 bg-[#050505] rounded-b-[24px] flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white">Cancel</button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
          >
            {isSubmitting ? "Generating & Saving..." : "Register Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}
