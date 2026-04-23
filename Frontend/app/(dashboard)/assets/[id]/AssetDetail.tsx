"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { insforge } from "@/lib/insforge";
import { ArrowLeft, Box, Image as ImageIcon, MapPin, Wrench, Shield, Calendar as CalendarIcon, TrendingDown } from "lucide-react";
import Link from "next/link";

const DepreciationChart = dynamic(() => import("./AssetDepreciationChart"), { ssr: false });

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    const { data: aData } = await insforge.database.from("assets").select("*, workers(name_en)").eq("id", id).single();
    if (aData) setAsset(aData);

    const { data: moveData } = await insforge.database.from("asset_movements").select("*, workers!from_worker(name_en), workers!to_worker(name_en)").eq("asset_id", id).order("movement_date", { ascending: false });
    if (moveData) setMovements(moveData);

    const { data: maintData } = await insforge.database.from("asset_maintenance").select("*").eq("asset_id", id).order("start_date", { ascending: false });
    if (maintData) setMaintenance(maintData);

    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading asset...</div>;
  if (!asset) return <div className="p-8 text-center text-zinc-500">Asset not found.</div>;

  // Depreciation Chart Data (Straight-line)
  const depData = [];
  if (asset.purchase_price && asset.purchase_date && asset.depreciation_rate > 0) {
    const price = parseFloat(asset.purchase_price);
    const rate = parseFloat(asset.depreciation_rate) / 100;
    const pYear = new Date(asset.purchase_date).getFullYear();
    const currYear = new Date().getFullYear();

    for (let i = 0; i < 5; i++) {
        const y = pYear + i;
        if (y > currYear + 3) break;
        const val = Math.max(0, price - (price * rate * i));
        depData.push({ year: y.toString(), value: val });
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-3">
        <Link href="/assets" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"><ArrowLeft className="w-4 h-4 text-zinc-400" /></Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{asset.name}</h1>
          <p className="text-zinc-400 mt-1 font-mono">{asset.asset_code} · {asset.category?.replace('_', ' ').toUpperCase()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Info Card */}
        <div className="glass p-6 rounded-3xl border border-white/5 md:col-span-1 space-y-6">
          <div className="aspect-video w-full rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden">
            {asset.photo_url ? (
              <img src={asset.photo_url} alt="Asset" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-zinc-600" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Brand / Model</p>
            <p className="text-sm text-zinc-200 mt-1">{asset.brand || "—"} / {asset.model || "—"}</p></div>
            <div><p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Serial Number</p>
            <p className="text-sm font-mono text-zinc-200 mt-1">{asset.serial_number || "—"}</p></div>
            <div><p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Status</p>
            <p className={`text-xs mt-1 uppercase font-bold ${asset.status==='available'?'text-emerald-400':asset.status==='assigned'?'text-blue-400':'text-amber-400'}`}>{asset.status.replace('_',' ')}</p></div>
            <div><p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Condition</p>
            <p className="text-xs mt-1 text-zinc-200 uppercase">{asset.condition}</p></div>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-zinc-500" />
              <div><p className="text-xs text-zinc-500">Location</p><p className="text-sm text-zinc-300">{asset.location || "Warehouse"}</p></div>
            </div>
            {asset.status === 'assigned' && (
              <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                <div><p className="text-[10px] text-blue-400 uppercase font-bold uppercase">Assigned To</p><p className="text-sm text-white font-bold">{asset.workers?.name_en || "Worker"}</p></div>
                <div className="text-right"><p className="text-[10px] text-zinc-500 uppercase">Since</p><p className="text-xs font-mono">{asset.assigned_date}</p></div>
              </div>
            )}
          </div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 md:col-span-2 space-y-8 flex flex-col">
          {/* Valuations & Depreciation view */}
          <div>
            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2"><TrendingDown className="w-4 h-4 text-emerald-400" /> Financials & Depreciation</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Purchase</p>
                <p className="text-xl font-mono text-white mt-1">SAR {asset.purchase_price?.toLocaleString() || "0"}</p>
                <p className="text-xs text-zinc-500 font-mono mt-1">{asset.purchase_date}</p>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">Current Value</p>
                <p className="text-2xl font-mono text-emerald-400 mt-1 font-bold">SAR {asset.current_value?.toLocaleString() || "0"}</p>
                <p className="text-xs text-zinc-500 font-mono mt-1">Rate: {asset.depreciation_rate}%</p>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Warranty / Docs</p>
                <p className="text-sm text-zinc-300 mt-1">{asset.warranty_expiry || "No Expiry"}</p>
                {asset.invoice_url && <a href={asset.invoice_url} target="_blank" className="text-xs text-blue-400 mt-1 block hover:underline">View Invoice</a>}
              </div>
            </div>

            {depData.length > 0 && <DepreciationChart data={depData} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Movements */}
        <div className="glass p-6 rounded-[24px] border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Movement History</h3>
          <div className="space-y-4">
            {movements.map(m => (
              <div key={m.id} className="relative pl-6 border-l border-white/10">
                <div className="absolute w-2 h-2 rounded-full bg-blue-500 -left-[4.5px] top-1.5" />
                <p className="text-xs font-bold text-white uppercase">{m.movement_type.replace('_',' ')}</p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{m.movement_date}</p>
                <div className="mt-1.5 text-xs text-zinc-400 bg-white/5 p-2 rounded-lg border border-white/5">
                  {(m.movement_type === 'assigned' || m.movement_type === 'transferred') && m.to_worker && (
                     <p>To Worker: <span className="font-bold text-blue-300">{m.workers?.name_en || "Worker"}</span></p>
                  )}
                  {m.movement_type === 'returned' && m.from_worker && <p>Returned by Worker</p>}
                  {m.notes && <p className="mt-1 text-zinc-500 italic">"{m.notes}"</p>}
                </div>
              </div>
            ))}
            {movements.length === 0 && <p className="text-zinc-500 text-sm italic">No movements recorded.</p>}
          </div>
        </div>

        {/* Maintenance */}
        <div className="glass p-6 rounded-[24px] border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4"><Wrench className="w-4 h-4"/> Maintenance Logs</h3>
          <div className="space-y-4">
            {maintenance.map(m => (
              <div key={m.id} className="p-3 bg-black/20 border border-amber-500/10 rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{m.maintenance_type}</span>
                    <p className="text-sm text-white font-bold mt-2">{m.description}</p>
                    <p className="text-xs text-zinc-500 mt-1">Vendor: {m.vendor || "In-house"} · Date: {m.start_date}</p>
                  </div>
                  <p className="text-right text-sm font-mono font-bold text-emerald-400">SAR {m.cost?.toLocaleString()}</p>
                </div>
              </div>
            ))}
            {maintenance.length === 0 && <p className="text-zinc-500 text-sm italic">No maintenance history.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
