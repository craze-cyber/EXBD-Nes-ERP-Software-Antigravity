"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { insforge } from "@/lib/insforge";
import { ArrowLeft, UserCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function WorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [worker, setWorker] = useState<any>(null);

  useEffect(() => {
    if (id) fetchWorker();
  }, [id]);

  const fetchWorker = async () => {
    const { data, error } = await insforge.database
      .from("workers")
      .select("*, clients(legal_name)")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Failed to fetch worker profile.");
      router.push("/workers");
    } else {
      setWorker(data);
    }
  };

  if (!worker) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Directory
      </button>

      <div className="glass p-8 rounded-3xl flex items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex flex-col items-center justify-center text-emerald-500">
          <UserCircle className="w-12 h-12" />
        </div>
        <div>
          <h1 className="text-3xl font-bold uppercase">{worker.name_en}</h1>
          <p className="text-zinc-500 font-mono mt-1 mb-2">ID: {worker.iqama_no}</p>
          <span className="bg-white/5 border border-white/10 px-3 py-1 rounded text-sm text-emerald-400">
             {worker.clients?.legal_name || "Unassigned"}
          </span>
        </div>
      </div>
      
      {/* Detailed metrics to be established according to payroll logic modules later */}
      <div className="glass p-8 rounded-3xl text-center">
        <h2 className="text-xl font-bold">Payroll & Attendance Analytics Upcoming</h2>
        <p className="text-zinc-500 mt-2">When the payroll engine is integrated, worker histories will populate here.</p>
      </div>
    </div>
  );
}
