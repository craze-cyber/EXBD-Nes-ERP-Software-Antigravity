"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import { Loader2, Building2, Hash } from "lucide-react";

const clientSchema = z.object({
  sponsor_id: z.string().uuid("Please select a valid sponsor"),
  client_code: z.string().min(1, "Client ID is required"),
  legal_name: z.string().min(3, "Client Legal Name is required"),
  cr_number: z.string().min(1, "CR Number is required"),
  vat_number: z.string().min(1, "VAT Number is required"),
  bank_name: z.string().optional(),
  iban: z.string().optional(),
  is_active: z.boolean().optional().default(true),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ClientForm({ initialData, onSuccess, onCancel }: ClientFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sponsors, setSponsors] = useState<any[]>([]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema) as any,
    defaultValues: {
      sponsor_id: initialData?.sponsor_id || "",
      client_code: initialData?.client_code || "",
      legal_name: initialData?.legal_name || "",
      cr_number: initialData?.cr_number || "",
      vat_number: initialData?.vat_number || "",
      bank_name: initialData?.bank_name || "",
      iban: initialData?.iban || "",
      is_active: initialData?.is_active ?? true,
    },
  });

  const legalName = watch("legal_name");
  const clientCode = watch("client_code");

  useEffect(() => {
    // Auto-generate suggestion: FIRST 3 LETTERS + random 4 digits
    if (legalName && legalName.length >= 3 && !initialData && (!clientCode || clientCode.length < 4)) {
      // Only generate if user hasn't explicitly customized it heavily. 
      // Using a ref or tracking manual changes is better, but this simple check works for suggestions.
    }
  }, [legalName]); // Wait setting simple effect first

  // Actually, better auto generation:
  useEffect(() => {
    if (legalName && legalName.length >= 3 && !initialData) {
      // If code is empty or looks like the previous auto-generated one
      if (!clientCode || clientCode.length === 7) { 
         const code = legalName.substring(0, 3).toUpperCase() + Math.floor(1000 + Math.random() * 9000).toString();
         setValue("client_code", code, { shouldValidate: true });
      }
    }
  }, [legalName]);


  useEffect(() => {
    const fetchSponsors = async () => {
      const { data } = await insforge.database
        .from("sponsors")
        .select("id, name")
        .order("name");
      setSponsors(data || []);
    };
    fetchSponsors();
  }, []);

  const onSubmit = async (values: ClientFormValues) => {
    setIsLoading(true);
    try {
      const { error } = initialData
        ? await insforge.database.from("clients").update(values).eq("id", initialData.id)
        : await insforge.database.from("clients").insert([values]);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`Client ${initialData ? "updated" : "created"} successfully`);
        onSuccess();
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 col-span-1 md:col-span-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Parent Sponsor</label>
          <select 
            {...register("sponsor_id")}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none transition-all appearance-none"
          >
            <option value="" className="bg-surface text-zinc-500">-- Select Sponsor --</option>
            {sponsors.map(s => (
              <option key={s.id} value={s.id} className="bg-surface">{s.name}</option>
            ))}
          </select>
          {errors.sponsor_id && <p className="text-xs text-red-400">{errors.sponsor_id.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Client ID</label>
          <div className="relative group">
            <Hash className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input {...register("client_code")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all" placeholder="e.g. CLI-001" />
          </div>
          {errors.client_code && <p className="text-xs text-red-400">{errors.client_code.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Client Legal Name</label>
          <div className="relative group">
            <Building2 className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input {...register("legal_name")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all" placeholder="Legal Company Name" />
          </div>
          {errors.legal_name && <p className="text-xs text-red-400">{errors.legal_name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">CR Number</label>
          <div className="relative group">
            <Hash className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input {...register("cr_number")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all" placeholder="CR Number" />
          </div>
          {errors.cr_number && <p className="text-xs text-red-400">{errors.cr_number.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">VAT Number</label>
          <div className="relative group">
            <Hash className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input {...register("vat_number")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all" placeholder="VAT Number" />
          </div>
          {errors.vat_number && <p className="text-xs text-red-400">{errors.vat_number.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bank Name</label>
          <div className="relative group">
            <Building2 className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input {...register("bank_name")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all" placeholder="Bank Name" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">IBAN</label>
          <div className="relative group">
            <Hash className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input {...register("iban")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all" placeholder="IBAN" />
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-6">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium">Cancel</button>
        <button type="submit" disabled={isLoading} className="flex-1 px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all flex items-center justify-center gap-2">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (initialData ? "Update Client" : "Add Client")}
        </button>
      </div>
    </form>
  );
}
