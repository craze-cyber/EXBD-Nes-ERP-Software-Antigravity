"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import SponsorCard from "@/components/erp/SponsorCard";
import SponsorForm from "@/components/erp/SponsorForm";
import { Plus, Search, Building2, Loader2, X } from "lucide-react";
import Pagination from "@/components/erp/Pagination";

const PAGE_SIZE = 10;
import { toast } from "sonner";

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchSponsors();
  }, []);

  const fetchSponsors = async () => {
    setIsLoading(true);
    const { data, error } = await insforge.database
      .from("sponsors")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      toast.error("Failed to load sponsors");
    } else {
      setSponsors(data || []);
    }
    setIsLoading(false);
  };

  const filteredSponsors = sponsors.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.cr_number?.includes(searchQuery) ||
    s.sponsor_id?.includes(searchQuery)
  );

  const pagedSponsors = filteredSponsors.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Group by sponsor_id to detect shared IDs
  const sponsorIdCounts = sponsors.reduce((acc: any, s) => {
    acc[s.sponsor_id] = (acc[s.sponsor_id] || 0) + 1;
    return acc;
  }, {});

  const handleEdit = (sponsor: any) => {
    setEditingSponsor(sponsor);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSponsor(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sponsors</h1>
          <p className="text-zinc-400 mt-2">Manage government sponsors and legal registrations.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold shadow-lg shadow-primary/20 shrink-0"
        >
          <Plus className="w-5 h-5" />
          NEW SPONSOR
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 focus-within:border-primary/50 transition-all">
        <Search className="w-5 h-5 text-zinc-500" />
        <input 
          type="text" 
          placeholder="Search sponsors by name, CR or ID..." 
          className="bg-transparent border-none outline-none w-full text-sm py-2"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-zinc-500 text-sm animate-pulse">Fetching records...</p>
        </div>
      ) : filteredSponsors.length === 0 ? (
        <div className="text-center py-20 glass rounded-3xl">
          <Building2 className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-zinc-400">No Sponsors Found</h3>
          <p className="text-zinc-500 max-w-sm mx-auto">
            Try adjusting your search or create a new sponsor registration.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pagedSponsors.map((sponsor) => (
              <SponsorCard
                key={sponsor.id}
                sponsor={sponsor}
                isShared={sponsorIdCounts[sponsor.sponsor_id] > 1}
                onEdit={handleEdit}
                onDelete={fetchSponsors}
              />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredSponsors.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Modal Backdrop */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 rounded-[32px] border-white/10 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={closeModal}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="mb-8">
              <h2 className="text-2xl font-bold">{editingSponsor ? "Edit Sponsor" : "New Sponsor"}</h2>
              <p className="text-zinc-400 text-sm mt-1">Complete the legal registration details below.</p>
            </div>
            <SponsorForm 
              initialData={editingSponsor} 
              onSuccess={() => {
                fetchSponsors();
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
