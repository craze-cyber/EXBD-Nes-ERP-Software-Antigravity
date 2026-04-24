"use client";

import { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  FileText, Search, Filter, ChevronDown, ChevronRight,
  RefreshCw, CheckCircle, XCircle, Clock, AlertCircle,
} from "lucide-react";

const RESULT_STYLES: Record<string, { icon: React.ReactNode; color: string }> = {
  success:  { icon: <CheckCircle className="w-3.5 h-3.5" />, color: "text-green-400" },
  failed:   { icon: <XCircle className="w-3.5 h-3.5" />,     color: "text-red-400" },
  pending:  { icon: <Clock className="w-3.5 h-3.5" />,       color: "text-yellow-400" },
  rejected: { icon: <AlertCircle className="w-3.5 h-3.5" />, color: "text-red-400" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AuditLogPage() {
  const { user } = useCurrentUser();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = insforge.database
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (moduleFilter !== "all") query = query.eq("module", moduleFilter);
    if (resultFilter !== "all") query = query.eq("result", resultFilter);

    const { data } = await query;
    setLogs(data || []);
    setLoading(false);
  }, [page, moduleFilter, resultFilter]);

  useEffect(() => {
    if (user?.id) fetchLogs();
  }, [user?.id, fetchLogs]);

  const filtered = search.trim()
    ? logs.filter(l =>
        (l.user_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.action || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.module || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.record_label || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.change_summary || "").toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const modules = [...new Set(logs.map(l => l.module).filter(Boolean))].sort();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Audit Log
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Complete history of all system actions
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <select
          value={moduleFilter}
          onChange={e => { setModuleFilter(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none"
        >
          <option value="all">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          value={resultFilter}
          onChange={e => { setResultFilter(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none"
        >
          <option value="all">All Results</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No audit log entries found</p>
        </div>
      ) : (
        <div className="border border-white/5 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_120px_80px_80px] gap-2 px-4 py-2.5 bg-white/[0.03] border-b border-white/5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Action</span>
            <span>User</span>
            <span>Module</span>
            <span>Result</span>
            <span>Time</span>
          </div>

          {/* Rows */}
          {filtered.map(log => {
            const isExpanded = expandedId === log.id;
            const resultStyle = RESULT_STYLES[log.result] || RESULT_STYLES.success;

            return (
              <div key={log.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="grid grid-cols-[1fr_120px_120px_80px_80px] gap-2 px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors items-center"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRight className={`w-3.5 h-3.5 text-gray-600 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    <span className="text-sm text-white truncate">
                      {log.action?.replace(/_/g, " ")}
                    </span>
                    {log.record_label && (
                      <span className="text-xs text-gray-500 truncate">— {log.record_label}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 truncate">{log.user_name}</span>
                  <span className="text-xs text-gray-400 truncate">{log.module}</span>
                  <span className={`flex items-center gap-1 text-xs ${resultStyle.color}`}>
                    {resultStyle.icon}
                    {log.result}
                  </span>
                  <span className="text-xs text-gray-500">{timeAgo(log.created_at)}</span>
                </div>

                {isExpanded && (
                  <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-gray-500">User Email:</span>
                        <span className="ml-2 text-gray-300">{log.user_email || "—"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Role:</span>
                        <span className="ml-2 text-gray-300">{log.user_role || "—"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Record ID:</span>
                        <span className="ml-2 text-gray-300 font-mono">{log.record_id || "—"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Timestamp:</span>
                        <span className="ml-2 text-gray-300">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {log.change_summary && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Change Summary:</p>
                        <pre className="text-xs text-gray-300 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                          {log.change_summary}
                        </pre>
                      </div>
                    )}

                    {log.error_message && (
                      <div>
                        <p className="text-xs text-red-500 mb-1">Error:</p>
                        <pre className="text-xs text-red-300 bg-red-500/10 rounded-lg p-3 overflow-x-auto">
                          {log.error_message}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-gray-500">{filtered.length} entries</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 disabled:opacity-30 transition-colors"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-xs text-gray-500">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={logs.length < PAGE_SIZE}
            className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 disabled:opacity-30 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
