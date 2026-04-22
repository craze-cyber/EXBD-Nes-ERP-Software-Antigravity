import React from "react";
import { Edit2, Trash2, UserCircle, Briefcase, FileText, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

interface WorkerTableProps {
  workers: any[];
  onEdit: (worker: any) => void;
  onDelete: (id: string) => void;
}

export default function WorkerTable({ workers, onEdit, onDelete }: WorkerTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 12;

  // Reset to first page if the incoming dataset changes (e.g. user typed in the search bar)
  React.useEffect(() => {
    setCurrentPage(1);
  }, [workers]);

  const totalPages = Math.max(1, Math.ceil(workers.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedWorkers = workers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="glass rounded-[24px] border border-white/5 overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-white/5 border-b border-white/5 uppercase tracking-wider text-[10px] font-bold text-zinc-500">
            <tr>
              <th className="px-6 py-4">NAME & ID</th>
              <th className="px-6 py-4">JOB PROFILE</th>
              <th className="px-6 py-4">CLIENT ASSIGNMENT</th>
              <th className="px-6 py-4">IQAMA STATUS</th>
              <th className="px-6 py-4 text-center">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedWorkers.map((worker) => (
              <tr key={worker.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                      {worker.photo_url ? (
                         <img src={worker.photo_url} alt="Profile" className="w-full h-full rounded-xl object-cover" />
                      ) : (
                         <UserCircle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white group-hover:text-emerald-400 transition-colors uppercase">
                        {worker.name_en || "UNKNOWN"}
                      </p>
                      <p className="text-xs text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
                        <FileText className="w-3 h-3" /> {worker.iqama_no && worker.iqama_no.startsWith("TEMP-") ? "NO IQAMA (TEMP)" : (worker.iqama_no || worker.emp_id || "Unregistered")}
                      </p>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <p className="text-white font-medium">{worker.profession || worker.occupation_en || "—"}</p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                     <Briefcase className="w-3 h-3" /> Vendor: {worker.vendor_name || "Direct"}
                  </p>
                </td>
                
                <td className="px-6 py-4">
                  {worker.clients ? (
                    <div>
                      <p className="text-emerald-400 font-bold uppercase text-xs">{worker.clients.legal_name}</p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">ID: {worker.clients.client_code}</p>
                    </div>
                  ) : (
                    <span className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded text-xs font-bold border border-amber-500/20">
                      IDLE / UNASSIGNED
                    </span>
                  )}
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {worker.work_status === "Active" || !worker.work_status ? (
                      <span className="flex items-center gap-1 text-emerald-500 text-xs font-bold"><CheckCircle2 className="w-3 h-3"/> Active</span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-500 text-xs font-bold"><XCircle className="w-3 h-3"/> {worker.work_status}</span>
                    )}
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">EXP: {worker.iqama_expiry || "UNKNOWN"}</span>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => onEdit(worker)}
                      className="p-2 bg-white/5 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm("Delete this worker permanently?")) onDelete(worker.id);
                      }}
                      className="p-2 bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-black/20">
        <p className="text-xs text-zinc-500 font-medium">
          Showing <span className="text-white">{Math.min(startIndex + 1, workers.length)}</span> to <span className="text-white">{Math.min(startIndex + ITEMS_PER_PAGE, workers.length)}</span> of <span className="text-emerald-400 font-bold">{workers.length}</span> workers
        </p>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 rounded-xl text-xs font-bold transition-all border border-white/5"
          >
            Prev
          </button>
          <div className="px-4 py-2 bg-surface rounded-xl text-xs font-bold border border-white/5 text-emerald-400">
            {currentPage} / {totalPages}
          </div>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 rounded-xl text-xs font-bold transition-all border border-white/5"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
