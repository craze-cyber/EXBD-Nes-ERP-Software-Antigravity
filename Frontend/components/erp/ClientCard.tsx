"use client";

import React from "react";
import Link from "next/link";
import { 
  Building2, 
  Hash,
  Edit2, 
  Trash2,
  ExternalLink,
  ShieldCheck,
  Landmark,
  CreditCard
} from "lucide-react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";

interface ClientCardProps {
  client: any;
  onEdit: (client: any) => void;
  onDelete: () => void;
}

export default function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  const handleDelete = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this client?");
    if (!confirmDelete) return;

    // Check for linked workers
    const { count, error: workerCheckError } = await insforge.database
      .from("workers")
      .select("*", { count: "exact", head: true })
      .eq("client_id", client.id);

    if (workerCheckError) {
      toast.error("Error checking linked workers");
      return;
    }

    if (count && count > 0) {
      toast.error(`Cannot delete: This client has ${count} assigned workers. Relocate them first.`);
      return;
    }

    const { error } = await insforge.database.from("clients").delete().eq("id", client.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Client deleted successfully");
      onDelete();
    }
  };

  return (
    <div className="glass rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300 group">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-bold text-lg leading-tight group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
            {client.legal_name}
          </h3>
          <p className="text-zinc-500 text-[10px] font-bold uppercase mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">{client.client_code}</span>
            <Building2 className="w-3 h-3 ml-2" /> Sponsor: {client.sponsors?.name || "Unlinked"}
            <span className="bg-white/10 text-white px-2 py-0.5 rounded ml-auto flex items-center gap-1">
              {client.workers?.[0]?.count || 0} Workers
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(client)} className="p-2 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-all"><Edit2 className="w-4 h-4" /></button>
          <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
          <span className="text-zinc-500 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> CR Number</span>
          <span className="font-mono text-xs text-emerald-400">{client.cr_number || "—"}</span>
        </div>
        <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
          <span className="text-zinc-500 flex items-center gap-2"><Hash className="w-4 h-4" /> VAT Number</span>
          <span className="font-mono text-xs">{client.vat_number || "—"}</span>
        </div>
        <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
          <span className="text-zinc-500 flex items-center gap-2"><Landmark className="w-4 h-4" /> Bank</span>
          <span className="text-xs truncate max-w-[150px]">{client.bank_name || "—"}</span>
        </div>
        <div className="flex flex-col text-sm py-2 gap-1">
          <span className="text-zinc-500 flex items-center gap-2"><CreditCard className="w-4 h-4" /> IBAN</span>
          <span className="font-mono text-xs bg-white/5 p-2 rounded-lg border border-white/5 break-all">{client.iban || "—"}</span>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Link href={`/clients/${client.id}`} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2 text-white/80 hover:text-white">
          <ExternalLink className="w-3 h-3" />
          View Profile & Workers
        </Link>
      </div>
    </div>
  );
}
