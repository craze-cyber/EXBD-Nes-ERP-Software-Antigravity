"use client";

import { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermissions } from "@/hooks/usePermissions";
import { ApprovalModal } from "@/components/erp/ApprovalModal";
import type { PendingChange } from "@/hooks/usePendingChanges";
import {
  Clock, Check, XCircle, AlertTriangle, Filter,
  ChevronDown, Shield, RefreshCw, Inbox,
} from "lucide-react";

type TabFilter = "pending" | "approved" | "rejected" | "all";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high:   "bg-orange-500/20 text-orange-400 border-orange-500/30",
  normal: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  low:    "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending:  <Clock className="w-4 h-4 text-yellow-400" />,
  approved: <Check className="w-4 h-4 text-green-400" />,
  rejected: <XCircle className="w-4 h-4 text-red-400" />,
};

function normalizeChange(raw: any): PendingChange {
  return {
    ...raw,
    action_type: raw.action,
    requested_by_name: raw.requester_name,
    payload: raw.after_data,
    before_snapshot: raw.before_data,
    summary: raw.change_summary,
  };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ApprovalsPage() {
  const { user } = useCurrentUser();
  const { isMasterAdmin } = usePermissions();
  const [tab, setTab] = useState<TabFilter>("pending");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChange, setSelectedChange] = useState<PendingChange | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string>("all");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let query = insforge.database
      .from("change_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (tab !== "all") query = query.eq("status", tab);
    if (moduleFilter !== "all") query = query.eq("module", moduleFilter);

    const { data } = await query;
    setRequests(data || []);
    setLoading(false);
  }, [tab, moduleFilter]);

  useEffect(() => {
    if (user?.id) fetchRequests();
  }, [user?.id, fetchRequests]);

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const modules = [...new Set(requests.map(r => r.module))].sort();

  const tabs: { label: string; value: TabFilter; count?: number }[] = [
    { label: "Pending", value: "pending", count: pendingCount },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "All", value: "all" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-400" />
            Approval Queue
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review and manage change requests from your team
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.value
                ? "bg-white/10 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-yellow-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Module Filter */}
      {modules.length > 1 && (
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Modules</option>
            {modules.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}

      {/* Request List */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20">
          <Inbox className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {tab === "pending" ? "No pending requests — all clear!" : "No requests found"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(r => (
            <div
              key={r.id}
              onClick={() => r.status === "pending" && isMasterAdmin && setSelectedChange(normalizeChange(r))}
              className={`group flex items-center gap-4 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl transition-all ${
                r.status === "pending" && isMasterAdmin ? "cursor-pointer" : ""
              }`}
            >
              {/* Status icon */}
              <div className="shrink-0">{STATUS_ICONS[r.status] || STATUS_ICONS.pending}</div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-white truncate">
                    {r.action?.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-gray-600">in</span>
                  <span className="text-xs font-medium text-gray-400">{r.module}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>by {r.requester_name} ({r.requester_role})</span>
                  <span>·</span>
                  <span>{timeAgo(r.created_at)}</span>
                  {r.record_label && (
                    <>
                      <span>·</span>
                      <span className="text-gray-400 truncate">{r.record_label}</span>
                    </>
                  )}
                </div>
                {r.status === "rejected" && r.rejection_reason && (
                  <p className="text-xs text-red-400/80 mt-1 truncate">
                    Rejected: {r.rejection_reason}
                  </p>
                )}
                {r.status === "approved" && r.reviewer_name && (
                  <p className="text-xs text-green-400/80 mt-1 truncate">
                    Approved by {r.reviewer_name}
                    {r.approval_notes ? ` — ${r.approval_notes}` : ""}
                  </p>
                )}
              </div>

              {/* Priority badge */}
              <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full border ${PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.normal}`}>
                {r.priority}
              </span>

              {/* Review button for master_admin on pending */}
              {r.status === "pending" && isMasterAdmin && (
                <span className="shrink-0 text-xs text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Review →
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      {selectedChange && (
        <ApprovalModal
          change={selectedChange}
          onClose={() => setSelectedChange(null)}
          onDone={() => {
            setSelectedChange(null);
            fetchRequests();
          }}
        />
      )}
    </div>
  );
}
