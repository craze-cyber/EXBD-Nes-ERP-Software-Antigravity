"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import { Loader2, UserCircle, Briefcase, FileText, MapPin, UploadCloud, FileBadge } from "lucide-react";
import { useApprovalAction } from "@/hooks/useApprovalAction";

// The Zod schema only handles text, strings, and standard payloads. 
// Files are handled separately in React State.
const workerSchema = z.object({
  // Personal Info
  name_en: z.string().optional(),
  name_ar: z.string().optional(),
  dob: z.string().optional(),
  nationality: z.string().optional(),
  religion: z.string().optional(),
  
  // Identity & Docs
  iqama_no: z.string().optional(),
  iqama_expiry: z.string().optional(),
  iqama_status: z.string().optional(),
  resident_status: z.string().optional(),
  passport_no: z.string().optional(),
  passport_issue_date: z.string().optional(),
  passport_expiry_date: z.string().optional(),
  health_insurance_no: z.string().optional(),
  health_insurance_expiry: z.string().optional(),
  cr_mol_no: z.string().optional(),
  driving_license_no: z.string().optional(),
  driving_license_expiry: z.string().optional(),

  // Employment
  client_id: z.string().uuid("Please select a client").optional().or(z.literal("")),
  emp_id: z.string().optional(),
  work_status: z.string().optional(),
  joining_date: z.string().optional(), 
  date_of_joining: z.string().optional(), 
  sponsor_ref: z.string().optional(),
  sponsor_name: z.string().optional(),
  occupation_en: z.string().optional(),
  occupation_ar: z.string().optional(),
  designation: z.string().optional(),
  job_module_hrs: z.coerce.number().optional(),

  // Salary
  basic_salary: z.coerce.number().optional(),
  food_allowance: z.coerce.number().optional(),
  other_allowances: z.coerce.number().optional(),
  bank_iban: z.string().optional(),

  // Contact & Location
  mobile: z.string().optional(),
  home_mobile: z.string().optional(),
  personal_email: z.string().optional(),
  camp_name: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
});

type WorkerFormValues = z.infer<typeof workerSchema>;

interface WorkerFormProps {
  initialData?: any;
  clients: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function WorkerForm({ initialData, clients, onSuccess, onCancel }: WorkerFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const { submitChange, saveLabel } = useApprovalAction();
  const [activeTab, setActiveTab] = useState(0);

  // File state tracking
  const [files, setFiles] = useState<Record<string, File | null>>({
    photo_url: null,
    ajeer_url: null,
    driver_card_url: null,
    iqama_url: null,
    passport_url: null,
    driving_license_url: null,
    bank_iban_url: null,
  });

  // Safely translate all Postgres `null` responses into `""` so Zod's `.optional()` doesn't crash.
  const sanitizeInitialData = (data: any) => {
    if (!data) return undefined;
    const sanitized: any = {};
    for (const key in data) {
      sanitized[key] = data[key] === null ? "" : data[key];
    }
    return sanitized;
  };

  const { register, handleSubmit, formState: { errors } } = useForm<WorkerFormValues>({
    resolver: zodResolver(workerSchema) as any,
    defaultValues: sanitizeInitialData(initialData) || {
      name_en: "", name_ar: "", dob: "", nationality: "", religion: "",
      iqama_no: "", iqama_expiry: "", iqama_status: "", resident_status: "",
      passport_no: "", passport_issue_date: "", passport_expiry_date: "",
      health_insurance_no: "", health_insurance_expiry: "", cr_mol_no: "",
      driving_license_no: "", driving_license_expiry: "",
      client_id: "", emp_id: "", work_status: "", joining_date: "", date_of_joining: "",
      sponsor_ref: "", sponsor_name: "", occupation_en: "", occupation_ar: "", designation: "", job_module_hrs: 0,
      basic_salary: 0, food_allowance: 0, other_allowances: 0, bank_iban: "",
      mobile: "", home_mobile: "", personal_email: "", camp_name: "", region: "", city: ""
    },
  });

  const handleFileChange = (key: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [key]: file }));
  };

  const uploadFile = async (file: File, key: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const fileName = `${key}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    
    setUploadProgress(`Uploading ${key.replace('_url', '')}...`);
    
    const { error } = await insforge.storage.from('worker-documents').upload(fileName, file);
    if (error) {
      toast.error(`Error uploading ${key}: ` + error.message);
      return null;
    }
    
    const response: any = insforge.storage.from('worker-documents').getPublicUrl(fileName);
    return response?.data?.publicUrl || response;
  };

  const onSubmit = async (values: WorkerFormValues) => {
    setIsLoading(true);
    setUploadProgress("Preparing database...");
    
    try {
      const payload: any = { ...values };
      
      // Convert all empty strings back into PostgreSQL safe `null` wrappers before DB sync
      for (const key of Object.keys(payload)) {
        if (payload[key] === "") {
          payload[key] = null;
        }
      }

      if (!payload.client_id) delete payload.client_id;

      // Auto-generate Temporary IQAMA ID if missing
      if (!payload.iqama_no || payload.iqama_no.trim() === "") {
        payload.iqama_no = `TEMP-${Math.floor(10000000 + Math.random() * 90000000)}`;
        if (!payload.iqama_status) {
           payload.iqama_status = "Processing";
        }
      }
      
      // Upload pending files and mount URLs into payload
      for (const [key, file] of Object.entries(files)) {
        if (file) {
           const url = await uploadFile(file, key);
           if (url) payload[key] = url;
        }
      }

      setUploadProgress("Finalizing record...");

      const result = await submitChange({
        action: initialData ? "worker_edit" : "worker_create",
        module: "Workers",
        recordId: initialData?.id || null,
        recordLabel: payload.name_en || "Worker",
        beforeData: initialData || null,
        afterData: payload,
      });

      if (result?.status === "executed") {
        const { error } = initialData
          ? await insforge.database.from("workers").update(payload).eq("id", initialData.id)
          : await insforge.database.from("workers").insert([payload]);
        if (error) throw error;
        onSuccess();
      } else if (result?.status === "pending") {
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
      setUploadProgress("");
    }
  };

  const tabs = [
    { label: "Personal Info", icon: <UserCircle className="w-4 h-4" /> },
    { label: "Identity & Docs", icon: <FileText className="w-4 h-4" /> },
    { label: "Employment & Salary", icon: <Briefcase className="w-4 h-4" /> },
    { label: "Contact & Location", icon: <MapPin className="w-4 h-4" /> }
  ];

  const FileInput = ({ label, dbKey }: { label: string, dbKey: string }) => (
    <div className="space-y-2 col-span-1 border border-dashed border-white/20 p-4 rounded-xl bg-white/[0.02]">
      <label className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
        <span>{label}</span>
        {initialData?.[dbKey] && <span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded"><FileBadge className="w-3 h-3"/> Attached</span>}
      </label>
      <input 
        type="file" 
        onChange={(e) => handleFileChange(dbKey, e.target.files?.[0] || null)}
        className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all outline-none" 
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full mt-4">
      <div className="flex border-b border-white/5 mb-6 overflow-x-auto shrink-0 pb-2 hide-scrollbar">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveTab(idx)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
              activeTab === idx ? "border-emerald-500 text-emerald-500" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto pr-2 pb-6">
        
        {/* TAB 0 - Personal */}
        <div className={`space-y-6 animate-in fade-in ${activeTab === 0 ? "block" : "hidden"}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Selfie Attachment Slot */}
             <div className="md:col-span-2">
                <FileInput label="Selfie / Photo Attachment" dbKey="photo_url" />
             </div>

             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Employee Name - English</label>
               <input {...register("name_en")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Employee Name - Arabic</label>
               <input {...register("name_ar")} dir="rtl" className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Date of Birth (Gregorian)</label>
               <input type="date" {...register("dob")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nationality</label>
               <input {...register("nationality")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Religion</label>
               <select {...register("religion")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 appearance-none">
                 <option value="" className="bg-surface">Select...</option>
                 <option value="Islam" className="bg-surface">Islam</option>
                 <option value="Christianity" className="bg-surface">Christianity</option>
                 <option value="Hinduism" className="bg-surface">Hinduism</option>
                 <option value="Others" className="bg-surface">Others</option>
               </select>
             </div>
          </div>
        </div>

        {/* TAB 1 - Identity */}
        <div className={`space-y-6 animate-in fade-in ${activeTab === 1 ? "block" : "hidden"}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Iqama */}
             <div className="space-y-2 col-span-1 md:col-span-2 border-b border-white/5 pb-4">
               <h3 className="text-emerald-500 font-bold mb-4">Iqama Details</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2 md:col-span-2">
                   <FileInput label="Iqama Attachment (PDF/Image)" dbKey="iqama_url" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Iqama Number * <span className="text-[9px] text-emerald-500 normal-case ml-1">(Auto-generated if empty)</span></label>
                   <input {...register("iqama_no")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Iqama Expiry Date (Greg)</label>
                   <input type="date" {...register("iqama_expiry")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Iqama Status</label>
                   <select {...register("iqama_status")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 appearance-none">
                     <option value="" className="bg-surface">Select...</option>
                     <option value="Valid" className="bg-surface">Valid</option>
                     <option value="Expired" className="bg-surface">Expired</option>
                     <option value="Processing" className="bg-surface">Processing</option>
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Resident Status</label>
                   <input {...register("resident_status")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" />
                 </div>
               </div>
             </div>
             
             {/* Passport */}
             <div className="space-y-2 col-span-1 border-b border-white/5 pb-4">
               <h3 className="text-emerald-500 font-bold mb-4">Passport Details</h3>
               <div className="space-y-4">
                 <FileInput label="Passport Copy Attachment" dbKey="passport_url" />
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Passport Number</label>
                   <input {...register("passport_no")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono text-transform:uppercase" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Passport Issue Date</label>
                   <input type="date" {...register("passport_issue_date")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Passport Expiry Date</label>
                   <input type="date" {...register("passport_expiry_date")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
                 </div>
               </div>
             </div>

             {/* Driver License Section */}
             <div className="space-y-2 col-span-1 border-b border-white/5 pb-4">
               <h3 className="text-emerald-500 font-bold mb-4">Driving License Details</h3>
               <div className="space-y-4">
                 <FileInput label="Driving License Attachment" dbKey="driving_license_url" />
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Driving License No</label>
                   <input {...register("driving_license_no")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono text-transform:uppercase" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Driving License Expiry</label>
                   <input type="date" {...register("driving_license_expiry")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
                 </div>
               </div>
             </div>

             {/* Insurance & CR */}
             <div className="space-y-2 col-span-1 md:col-span-2 pt-2">
               <h3 className="text-emerald-500 font-bold mb-4">Other Documents</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Health Insurance No</label>
                   <input {...register("health_insurance_no")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Health Insurance Expiry Date</label>
                   <input type="date" {...register("health_insurance_expiry")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">CR MOL No</label>
                   <input {...register("cr_mol_no")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono" />
                 </div>
               </div>
             </div>
          </div>
        </div>

        {/* TAB 2 - Employment */}
        <div className={`space-y-6 animate-in fade-in ${activeTab === 2 ? "block" : "hidden"}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2 md:col-span-2 border-b border-white/5 pb-4">
                <h3 className="text-emerald-500 font-bold mb-4">Regulatory Uploads</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <FileInput label="Upload Ajeer Copy" dbKey="ajeer_url" />
                   <FileInput label="Upload Driver Card" dbKey="driver_card_url" />
                </div>
             </div>

             <div className="space-y-2 col-span-1 md:col-span-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-emerald-400">Assigned For (Client Component)</label>
               <select {...register("client_id")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 outline-none transition-all appearance-none">
                  <option value="" className="bg-surface">-- Select Client (Idle / Unassigned) --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id} className="bg-surface">{c.legal_name} | {c.client_code}</option>
                  ))}
               </select>
             </div>
             
             {/* Work Structuring */}
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">External ID (Emp ID)</label>
               <input {...register("emp_id")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Work Status</label>
               <select {...register("work_status")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 appearance-none">
                 <option value="" className="bg-surface">Select...</option>
                 <option value="Active" className="bg-surface">Active</option>
                 <option value="Idle" className="bg-surface">Idle</option>
                 <option value="Terminated" className="bg-surface">Terminated</option>
               </select>
             </div>
             
             {/* Designations */}
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Occupation (English)</label>
               <input {...register("occupation_en")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Occupation (Arabic)</label>
               <input {...register("occupation_ar")} dir="rtl" className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Designation</label>
               <input {...register("designation")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Job Module (Hrs)</label>
               <input type="number" {...register("job_module_hrs")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono" />
             </div>
             
             {/* Dates */}
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Joining Date (KSA Entry)</label>
               <input type="date" {...register("joining_date")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Date Of Joining (Client)</label>
               <input type="date" {...register("date_of_joining")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 [color-scheme:dark]" />
             </div>

             {/* Sponsor */}
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Sponsor ID (Saudi)</label>
               <input {...register("sponsor_ref")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Sponsor Name</label>
               <input {...register("sponsor_name")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" />
             </div>

             {/* Compensation Components */}
             <div className="space-y-2 col-span-1 md:col-span-2 border-t border-white/5 pt-4 mt-2">
                <h3 className="text-emerald-500 font-bold mb-4">Compensation & Banking</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2 col-span-1 md:col-span-3">
                   <FileInput label="Bank Account / IBAN Attachment" dbKey="bank_iban_url" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Basic Salary</label>
                   <input type="number" {...register("basic_salary")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Food Allowance</label>
                   <input type="number" {...register("food_allowance")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Other Allowances</label>
                   <input type="number" {...register("other_allowances")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono" />
                 </div>
                 <div className="space-y-2 col-span-1 md:col-span-3">
                   <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bank Acc / IBAN</label>
                   <input {...register("bank_iban")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono uppercase" />
                 </div>
               </div>
             </div>
          </div>
        </div>

        {/* TAB 3 - Contact */}
        <div className={`space-y-6 animate-in fade-in ${activeTab === 3 ? "block" : "hidden"}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mobile Number</label>
               <input {...register("mobile")} type="tel" className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Home Mobile Number</label>
               <input {...register("home_mobile")} type="tel" className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50 font-mono" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Personal Email ID</label>
               <input {...register("personal_email")} type="email" className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Camp Name</label>
               <input {...register("camp_name")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Region</label>
               <input {...register("region")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">City</label>
               <input {...register("city")} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-emerald-500/50" />
             </div>
          </div>
        </div>

        {/* Submit Actions anchored clearly outside the tabs layout logically inside the form but rendered at bottom via flex layout in parent */}
        <div className="flex gap-4 pt-8 sticky bottom-0 bg-surface/90 backdrop-blur pb-2 mt-4 z-10 border-t border-white/5">
          <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium">Cancel</button>
          <button type="submit" disabled={isLoading} className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center justify-center gap-2">
            {isLoading ? (
               <><Loader2 className="w-4 h-4 animate-spin" /> {uploadProgress || "Processing..."}</>
            ) : saveLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
