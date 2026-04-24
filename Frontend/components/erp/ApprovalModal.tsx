"use client";

import { useState } from "react";
import { X, Check, XCircle, Clock, User } from "lucide-react";
import { approveChange, rejectChange } from "@/lib/approval-engine";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { FieldDiffView } from "./FieldDiffView";
import type { PendingChange } from "@/hooks/usePendingChanges";

interface Props {
  change: PendingChange;
  onClose: () => void;
  onDone: () => void;
}

export function ApprovalModal({ change, onClose, onDone }: Props) {
  const { user } = useCurrentUser();
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [mode, setMode] = useState<"view" | "approve" | "reject">("view");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleApprove() {
    if (!user) return;
    setLoading(true);
    setError("");
    const adminUser = { id: user.id, name: user.full_name || user.email, role: user.role, email: user.email };
    const result = await approveChange(change.id, adminUser, notes);
    setLoading(false);
    if (result.success) {
      onDone();
    } else {
      setError(result.message || "Failed to approve");
    }
  }

  async function handleReject() {
    if (!user || !rejectReason.trim()) return;
    setLoading(true);
    setError("");
    const adminUser = { id: user.id, name: user.full_name || user.email, role: user.role, email: user.email };
    const result = await rejectChange(change.id, adminUser, rejectReason);
    setLoading(false);
    if (result.success) {
      onDone();
    } else {
      setError("Failed to reject");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Review Change Request</h2>
              <p className="text-xs text-gray-500">{change.module} · {change.action_type.replace(/_/g, " ")}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meta */}
        <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {change.requested_by_name ?? change.requested_by}
          </span>
          <span>{new Date(change.created_at).toLocaleString()}</span>
          {change.summary && <span className="text-gray-400">{change.summary}</span>}
        </div>

        {/* Diff */}
        <div className="px-6 py-4 max-h-60 overflow-y-auto">
          <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">Changes</p>
          <FieldDiffView before={change.before_snapshot} after={change.payload} />
        </div>

        {/* Action area */}
        <div className="px-6 py-4 border-t border-white/10 space-y-3">
          {error && <p className="text-xs text-red-400">{error}</p>}

          {mode === "view" && (
            <div className="flex gap-3">
              <button
                onClick={() => setMode("approve")}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 text-sm rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" /> Approve
              </button>
              <button
                onClick={() => setMode("reject")}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-sm rounded-lg transition-colors"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          )}

          {mode === "approve" && (
            <>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Approval notes (optional)"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-green-500/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors font-medium"
                >
                  {loading ? "Approving..." : "Confirm Approve"}
                </button>
                <button
                  onClick={() => setMode("view")}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-sm rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {mode === "reject" && (
            <>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (required)"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-red-500/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={loading || !rejectReason.trim()}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors font-medium"
                >
                  {loading ? "Rejecting..." : "Confirm Reject"}
                </button>
                <button
                  onClick={() => setMode("view")}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-sm rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
