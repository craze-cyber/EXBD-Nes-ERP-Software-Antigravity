"use client";

import React, { useState, useEffect } from "react";
import { Users, FileSpreadsheet, ChevronRight, BarChart3, LayoutGrid, Clock, ShieldCheck, Globe, Building2, HardHat, DollarSign, Package } from "lucide-react";
import Link from "next/link";
import { insforge } from "@/lib/insforge";

export default function PayrollHub() {
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await insforge.database.from("clients").select("*").order("legal_name");
      if (data) setClients(data);
    };
    fetchClients();
  }, []);

  const clientTypes = [
    { slug: 'firstcry', name: 'First Cry', icon: <Globe className="w-6 h-6" />, color: 'bg-pink-500', path: '/payroll/firstcry', desc: 'Attendance-based 12hr grid' },
    { slug: 'acc', name: 'ACC', icon: <HardHat className="w-6 h-6" />, color: 'bg-blue-500', path: '/payroll/acc', desc: 'Manpower Construction billing' },
    { slug: 'giftsgate', name: 'Giftsgate', icon: <Building2 className="w-6 h-6" />, color: 'bg-amber-500', path: '/payroll/giftsgate', desc: 'Luxury Hospitality wages' },
    { slug: 'keeta', name: 'Keeta', icon: <Users className="w-6 h-6" />, color: 'bg-[#fbbe00]', path: '/payroll/keeta', desc: 'Performance-based Logistics' },
    { slug: 'dabdoob-logistics', name: 'Dabdoob Logistics', icon: <DollarSign className="w-6 h-6" />, color: 'bg-emerald-500', path: '/payroll/dabdoob-logistics', desc: 'Standard Logistics Monthly' },
    { slug: 'dabdoob-manpower', name: 'Dabdoob Manpower', icon: <HardHat className="w-6 h-6" />, color: 'bg-emerald-600', path: '/payroll/dabdoob-manpower', desc: 'Labor and Overtime calculation' },
    { slug: 'keemart', name: 'Keemart', icon: <Package className="w-6 h-6" />, color: 'bg-indigo-500', path: '/payroll/keemart', desc: 'Logistics delivery calculation' },
    { slug: 'medlog', name: 'Medlog', icon: <Package className="w-6 h-6" />, color: 'bg-red-500', path: '/payroll/universal', desc: 'Specialized logistics processing' },
    { slug: 'noon-minutes', name: 'Noon Minutes', icon: <Clock className="w-6 h-6" />, color: 'bg-yellow-500', path: '/payroll/noon-minutes', desc: 'Quick commerce delivery payout' },
    { slug: 'noon-supermall', name: 'Noon Supermall', icon: <Building2 className="w-6 h-6" />, color: 'bg-yellow-600', path: '/payroll/noon-supermall', desc: 'Enterprise logistics processing' },
    { slug: 'pran-exbd', name: 'Pran-EX', icon: <Users className="w-6 h-6" />, color: 'bg-teal-500', path: '/payroll/universal', desc: 'Manpower processing EXBD' },
    { slug: 'pran-ys', name: 'Pran-YS', icon: <Users className="w-6 h-6" />, color: 'bg-teal-600', path: '/payroll/universal', desc: 'Manpower processing YS' },
  ];

  return (
    <div className="p-8 space-y-10 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <header className="space-y-2">
        <h1 className="text-5xl font-black text-white tracking-tighter">
          PAYROLL <span className="text-zinc-600 font-light underline decoration-zinc-800 underline-offset-8">HUB</span>
        </h1>
        <p className="text-zinc-500 font-medium text-lg">Centralized salary processing for all Sovereign ERP clients</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clientTypes.map((type, i) => (
          <Link 
            key={i} 
            href={type.path}
            className="group relative bg-[#121214] border border-white/5 rounded-[2rem] p-8 hover:bg-zinc-900 transition-all duration-500 overflow-hidden shadow-2xl hover:-translate-y-2"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${type.color} opacity-5 blur-3xl -mr-16 -mt-16 group-hover:opacity-20 transition-opacity`}></div>
            
            <div className={`w-12 h-12 ${type.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500 mb-6`}>
              <div className="text-white">{type.icon}</div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white tracking-tight uppercase group-hover:text-white transition-colors">{type.name}</h3>
              <p className="text-zinc-500 text-sm font-medium">{type.desc}</p>
            </div>

            <div className="mt-8 flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Enter Module</span>
               <div className="bg-white/5 p-2 rounded-full group-hover:bg-white group-hover:text-black transition-all">
                  <ChevronRight className="w-4 h-4" />
               </div>
            </div>
          </Link>
        ))}

        {/* Universal Fallback */}
        <Link 
          href="/payroll/universal"
          className="group bg-[#0c0c0e] border border-dashed border-white/10 rounded-[2rem] p-8 hover:border-zinc-700 transition-all flex flex-col justify-center items-center text-center space-y-4"
        >
          <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-500">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-400">Universal Engine</h3>
            <p className="text-zinc-600 text-xs">Standard templates for all other clients</p>
          </div>
        </Link>
      </div>

      {/* METRICS PREVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
         <div className="bg-[#121214]/40 border border-white/5 rounded-2xl p-6 flex items-center gap-4 hover:bg-white/[0.02] transition-all">
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
               <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
               <p className="text-zinc-500 text-[10px] font-black uppercase">Validation</p>
               <p className="text-white font-bold text-sm">System Ready</p>
            </div>
         </div>
         <div className="bg-[#121214]/40 border border-white/5 rounded-2xl p-6 flex items-center gap-4">
            <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
               <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
               <p className="text-zinc-500 text-[10px] font-black uppercase">Last Processing</p>
               <p className="text-white font-bold text-sm">Just now</p>
            </div>
         </div>
      </div>
    </div>
  );
}
