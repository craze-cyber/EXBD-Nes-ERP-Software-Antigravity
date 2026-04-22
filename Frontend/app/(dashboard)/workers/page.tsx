"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import WorkerTable from "@/components/erp/WorkerTable";
import WorkerForm from "@/components/erp/WorkerForm";
import WorkerUploadModal from "@/components/erp/WorkerUploadModal";
import { generateWorkerTemplate } from "@/lib/xlsx-parser";
import { Plus, Search, Loader2, Download, Upload, X, Filter } from "lucide-react";
import Pagination from "@/components/erp/Pagination";

const PAGE_SIZE = 10;
import { toast } from "sonner";

export default function WorkersPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Active" | "Idle" | "Terminated" | "None Iqama Worker">("All");
  const [currentPage, setCurrentPage] = useState(1);

  const DB_COLUMNS = [
    "name_en", "name_ar", "photo_url", "iqama_no", "iqama_expiry", "iqama_status", 
    "resident_status", "iqama_url", "joining_date", "dob", "religion", "passport_no", 
    "passport_issue_date", "passport_expiry_date", "passport_url", "driving_license_no",
    "driving_license_expiry", "driving_license_url", "occupation_en", 
    "occupation_ar", "nationality", "mobile", "home_mobile", 
    "personal_email", "sponsor_ref", "sponsor_name", "basic_salary", 
    "food_allowance", "other_allowances", "client_id", "emp_id", "work_status", 
    "job_module_hrs", "designation", "date_of_joining", "cr_mol_no", 
    "health_insurance_no", "health_insurance_expiry", "camp_name", 
    "region", "city", "bank_iban", "bank_iban_url", "ajeer_url", "driver_card_url"
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    // Fetch clients for dropdowns and mapping
    const { data: clientsData } = await insforge.database.from("clients").select("id, legal_name, client_code");
    setClients(clientsData || []);

    // Fetch workers with linked client legal name
    const { data: workersData, error } = await insforge.database
      .from("workers")
      .select("*, clients(legal_name, client_code)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load workers");
    } else {
      setWorkers(workersData || []);
    }
    setIsLoading(false);
  };

  const deleteWorker = async (id: string) => {
    const { error } = await insforge.database.from("workers").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Worker deleted");
      fetchData();
    }
  };

  const handleEdit = (worker: any) => {
    setEditingWorker(worker);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingWorker(null);
  };

  // Filter Logic
  const filteredWorkers = workers.filter(w => {
    if (activeTab === "Active" && w.work_status !== "Active") return false;
    if (activeTab === "Terminated" && w.work_status !== "Terminated") return false;
    if (activeTab === "Idle" && w.work_status !== "Idle") return false;
    if (activeTab === "None Iqama Worker" && w.iqama_no && !w.iqama_no.startsWith("TEMP-")) return false;
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      w.name_en?.toLowerCase().includes(query) ||
      w.iqama_no?.toLowerCase().includes(query) ||
      w.emp_id?.toLowerCase().includes(query) ||
      w.mobile?.toLowerCase().includes(query)
    );
  });

  const pagedWorkers = filteredWorkers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workers Engine</h1>
          <p className="text-zinc-400 mt-2">Manage employee records, assignments, and compliance.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => generateWorkerTemplate(DB_COLUMNS)}
            className="bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-semibold border border-white/10"
          >
            <Download className="w-4 h-4" /> Template
          </button>
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-5 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold"
          >
            <Upload className="w-4 h-4" /> Import XLSX
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-5 h-5" /> Add Worker
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Tabs */}
      <div className="flex flex-col xl:flex-row gap-4 items-center bg-black/20 p-2 rounded-[28px] border border-white/5">
        <div className="flex w-full xl:w-auto p-1 bg-white/5 rounded-2xl overflow-x-auto hide-scrollbar">
          {["All", "Active", "Idle", "Terminated", "None Iqama Worker"].map((tab) => (
            <button
               key={tab}
               onClick={() => { setActiveTab(tab as any); setCurrentPage(1); }}
               className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                 activeTab === tab 
                 ? "bg-white/10 text-white shadow-sm" 
                 : "text-zinc-500 hover:text-zinc-300"
               }`}
            >
              {tab} {tab === "All" && `(${workers.length})`}
            </button>
          ))}
        </div>
        
        <div className="flex-1 w-full flex items-center gap-4 bg-white/5 rounded-2xl px-4 py-1 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
          <Search className="w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search name, Iqama, EMP ID or mobile..." 
            className="bg-transparent border-none outline-none w-full text-sm py-2.5 text-white"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
        
        <button className="hidden xl:flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-sm font-semibold text-zinc-300 transition-colors">
          <Filter className="w-4 h-4" /> Client Filter
        </button>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="text-zinc-500 text-sm animate-pulse">Syncing registry...</p>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="text-center py-20 glass rounded-3xl">
            <h3 className="text-xl font-semibold mb-2 text-zinc-400">No Records Found</h3>
            <p className="text-zinc-500 max-w-sm mx-auto">
              There are no workers matching your filters. Try adjusting your search or upload a new XLSX file.
            </p>
          </div>
        ) : (
          <>
            <WorkerTable
              workers={pagedWorkers}
              onEdit={handleEdit}
              onDelete={deleteWorker}
            />
            <Pagination
              currentPage={currentPage}
              totalItems={filteredWorkers.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Manual Worker Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-2xl h-[85vh] flex flex-col p-8 pb-0 rounded-[32px] border-white/10 relative animate-in zoom-in-95 duration-200">
            <button onClick={closeForm} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 z-10">
              <X className="w-6 h-6" />
            </button>
            <div className="mb-6 shrink-0">
              <h2 className="text-2xl font-bold">{editingWorker ? "Edit Profile" : "New Worker Registration"}</h2>
              <p className="text-zinc-400 text-sm mt-1">Complete the mandatory compliance fields.</p>
            </div>
            {/* The WorkerForm manages its own scroll area internally now */}
            <div className="flex-1 overflow-hidden">
               <WorkerForm 
                 initialData={editingWorker} 
                 clients={clients}
                 onSuccess={() => {
                   fetchData();
                   closeForm();
                 }}
                 onCancel={closeForm}
               />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      <WorkerUploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={fetchData}
        clients={clients}
        dbColumns={DB_COLUMNS}
      />
    </div>
  );
}
