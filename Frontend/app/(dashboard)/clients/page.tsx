"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import ClientCard from "@/components/erp/ClientCard";
import ClientForm from "@/components/erp/ClientForm";
import { Plus, Search, UserSquare2, Loader2, X, Filter } from "lucide-react";
import Pagination from "@/components/erp/Pagination";

const PAGE_SIZE = 10;
import { toast } from "sonner";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoading(true);
    // Fetch clients with linked sponsor names
    const { data, error } = await insforge.database
      .from("clients")
      .select("*, sponsors(name), workers(count)")
      .order("legal_name", { ascending: true });

    if (error) {
      toast.error("Failed to load clients");
    } else {
      setClients(data || []);
    }
    setIsLoading(false);
  };

  const filteredClients = clients.filter(c =>
    c.legal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.client_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.cr_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.sponsors?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pagedClients = filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-zinc-400 mt-2">Manage client companies and their associated sponsors.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold shadow-lg shadow-emerald-600/20 shrink-0"
        >
          <Plus className="w-5 h-5" />
          REGISTER NEW COMPANY (CR)
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 focus-within:border-emerald-500/50 transition-all flex-1">
          <Search className="w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search by legal name, CR, or sponsor..." 
            className="bg-transparent border-none outline-none w-full text-sm py-2"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <button className="px-4 py-2 border border-white/10 rounded-2xl hover:bg-white/5 flex items-center justify-center gap-2 text-zinc-400 transition-all">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="text-zinc-500 text-sm animate-pulse">Syncing clients...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-20 glass rounded-3xl">
          <UserSquare2 className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-zinc-400">No Clients Found</h3>
          <p className="text-zinc-500 max-w-sm mx-auto">
            Try a different search or link a new client to an existing sponsor.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pagedClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onEdit={(c) => {
                  setEditingClient(c);
                  setIsModalOpen(true);
                }}
                onDelete={fetchClients}
              />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredClients.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Modal Backdrop */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 rounded-[32px] border-white/10 relative animate-in zoom-in-95 duration-200">
            <button onClick={closeModal} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400">
              <X className="w-6 h-6" />
            </button>
            <div className="mb-8">
              <h2 className="text-2xl font-bold">{editingClient ? "Edit Client" : "Add Client"}</h2>
              <p className="text-zinc-400 text-sm mt-1">Configure client details and parent sponsor link.</p>
            </div>
            <ClientForm 
              initialData={editingClient} 
              onSuccess={() => {
                fetchClients();
                closeModal();
              }}
              onCancel={closeModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}
