"use client";

import React from "react";
import { 
  Building2, 
  MapPin, 
  Hash, 
  Landmark, 
  CreditCard, 
  Edit2, 
  Trash2, 
  LayoutGrid,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";

interface SponsorCardProps {
  sponsor: any;
  isShared?: boolean;
  onEdit: (sponsor: any) => void;
  onDelete: () => void;
}

export default function SponsorCard({ sponsor, isShared, onEdit, onDelete }: SponsorCardProps) {
  const handleDelete = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this sponsor?");
    if (!confirmDelete) return;

    // Check for linked clients
    const { count, error: clientCheckError } = await insforge.database
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("sponsor_id", sponsor.id);

    if (clientCheckError) {
      toast.error("Error checking linked records");
      return;
    }

    if (count && count > 0) {
      toast.error(`Cannot delete: This sponsor is linked to ${count} clients. Delete clients first.`);
      return;
    }

    const { error } = await insforge.database.from("sponsors").delete().eq("id", sponsor.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Sponsor deleted successfully");
      onDelete();
    }
  };

  return (
    <div className="glass rounded-2xl p-6 group relative hover:border-primary/30 transition-all duration-300">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
            {sponsor.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">{sponsor.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-zinc-500 text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {sponsor.address || "No address"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isShared && (
            <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase px-2 py-1 rounded-md border border-amber-500/20 flex items-center gap-1">
              <LayoutGrid className="w-3 h-3" /> Shared ID
            </span>
          )}
          <button 
            onClick={() => onEdit(sponsor)}
            className="p-2 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
             onClick={handleDelete}
             className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Sponsor ID</p>
          <p className="text-sm font-mono flex items-center gap-2">
            <Hash className="w-3 h-3 text-primary" /> {sponsor.sponsor_id}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">CR Number</p>
          <p className="text-sm font-mono flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> {sponsor.cr_number}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">NUN Number</p>
          <p className="text-sm font-mono">{sponsor.nun || "—"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">VAT Number</p>
          <p className="text-sm font-mono">{sponsor.vat_number || "—"}</p>
        </div>
        <div className="space-y-1 col-span-2 md:col-span-1">
          <p className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Bank</p>
          <p className="text-sm truncate" title={sponsor.bank_name}>
            {sponsor.bank_name || "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5">
        <p className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider mb-1">IBAN</p>
        <div className="bg-white/5 rounded-lg p-2 font-mono text-xs text-zinc-300 break-all border border-white/5">
          {sponsor.iban || "No IBAN registered"}
        </div>
      </div>
    </div>
  );
}
