"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import { Loader2, AlertCircle, Building2, MapPin, Hash, Landmark, CreditCard } from "lucide-react";

const sponsorSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  address: z.string().optional(),
  sponsor_id: z.string().length(10, "Sponsor ID must be exactly 10 digits"),
  cr_number: z.string().length(10, "CR Number must be exactly 10 digits"),
  nun: z.string().length(10, "NUN must be exactly 10 digits").optional().or(z.literal("")),
  vat_number: z.string().length(15, "VAT Number must be exactly 15 digits").optional().or(z.literal("")),
  bank_name: z.string().optional(),
  iban: z.string().regex(/^SA\d{22}$/, "IBAN must start with SA followed by 22 digits").optional().or(z.literal("")),
});

type SponsorFormValues = z.infer<typeof sponsorSchema>;

interface SponsorFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SponsorForm({ initialData, onSuccess, onCancel }: SponsorFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SponsorFormValues>({
    resolver: zodResolver(sponsorSchema),
    defaultValues: initialData || {
      name: "",
      address: "",
      sponsor_id: "",
      cr_number: "",
      nun: "",
      vat_number: "",
      bank_name: "",
      iban: "",
    },
  });

  const sponsorId = watch("sponsor_id");
  const crNumber = watch("cr_number");

  const onSubmit = async (values: SponsorFormValues) => {
    setIsLoading(true);
    setWarning(null);

    try {
      // 1. Check CR Number (Hard Error)
      if (!initialData || crNumber !== initialData.cr_number) {
        const { data: crCheck } = await insforge.database
          .from("sponsors")
          .select("id")
          .eq("cr_number", values.cr_number)
          .maybeSingle();

        if (crCheck) {
          toast.error("CR Number already exists in the system.");
          setIsLoading(false);
          return;
        }
      }

      // 2. Check Sponsor ID (Soft Warning)
      const { data: idCheck } = await insforge.database
        .from("sponsors")
        .select("id")
        .eq("sponsor_id", values.sponsor_id)
        .neq("cr_number", values.cr_number) // Different CR
        .maybeSingle();

      if (idCheck && !warning) {
        setWarning("Sponsor ID is already shared by another CR. Proceed anyway?");
        setIsLoading(false);
        return;
      }

      // 3. Save
      const { error } = initialData
        ? await insforge.database.from("sponsors").update(values).eq("id", initialData.id)
        : await insforge.database.from("sponsors").insert([values]);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`Sponsor ${initialData ? "updated" : "created"} successfully`);
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
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Sponsor Name</label>
          <div className="relative group">
            <Building2 className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input {...register("name")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all" placeholder="Legal Name" />
          </div>
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Address</label>
          <div className="relative group">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input {...register("address")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all" placeholder="Registered Address" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Sponsor ID (10 Digits)</label>
          <div className="relative group">
            <Hash className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input 
              {...register("sponsor_id")} 
              maxLength={10}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all" 
              placeholder="e.g. 7001234567" 
            />
          </div>
          {errors.sponsor_id && <p className="text-xs text-red-400">{errors.sponsor_id.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">CR Number (10 Digits)</label>
          <div className="relative group">
            <Hash className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input 
              {...register("cr_number")} 
              maxLength={10}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all" 
              placeholder="e.g. 1010123456" 
            />
          </div>
          {errors.cr_number && <p className="text-xs text-red-400">{errors.cr_number.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">National Unified Number (NUN)</label>
          <div className="relative group">
            <Hash className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input 
              {...register("nun")} 
              maxLength={10}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all" 
              placeholder="e.g. 7000123456" 
            />
          </div>
          {errors.nun && <p className="text-xs text-red-400">{errors.nun.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">VAT Number (15 Digits)</label>
          <input 
            {...register("vat_number")} 
            maxLength={15}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm focus:border-primary/50 outline-none transition-all" 
            placeholder="300XXXXXXXXXXXX" 
          />
          {errors.vat_number && <p className="text-xs text-red-400">{errors.vat_number.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bank Name</label>
          <div className="relative group">
            <Landmark className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input {...register("bank_name")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all" placeholder="e.g. Al Rajhi Bank" />
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">IBAN (SA + 22 Digits)</label>
          <div className="relative group">
            <CreditCard className="absolute left-3 top-3 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input 
              {...register("iban")} 
              maxLength={24}
              onChange={(e) => {
                let val = e.target.value.toUpperCase();
                if (val && !val.startsWith("SA")) val = "SA" + val.replace(/[^0-9]/g, "");
                setValue("iban", val);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all" 
              placeholder="SA..." 
            />
          </div>
          {errors.iban && <p className="text-xs text-red-400">{errors.iban.message}</p>}
        </div>
      </div>

      {warning && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-200">{warning}</p>
        </div>
      )}

      <div className="flex gap-4 pt-6">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={isLoading}
          className="flex-1 px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (warning ? "Confirm & Save" : (initialData ? "Update Sponsor" : "Create Sponsor"))}
        </button>
      </div>
    </form>
  );
}
