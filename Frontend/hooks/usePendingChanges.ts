"use client";

import { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import { useCurrentUser } from "./useCurrentUser";

export interface PendingChange {
  id: string;
  module: string;
  action: string;
  action_type: string; // alias for backwards compat
  record_id: string;
  record_label: string;
  requested_by: string;
  requester_name: string;
  requested_by_name: string; // alias
  requester_role: string;
  after_data: any;
  before_data: any;
  payload: any;          // alias for after_data
  before_snapshot: any;  // alias for before_data
  change_summary: string;
  summary: string;       // alias
  status: "pending" | "approved" | "rejected" | "expired";
  priority: "low" | "normal" | "high" | "urgent";
  reviewed_by: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  approval_notes: string | null;
  rejection_reason: string | null;
  expires_at: string;
  created_at: string;
}

function normalizeChange(raw: any): PendingChange {
  return {
    ...raw,
    // Create aliases so both old and new field names work
    action_type: raw.action,
    requested_by_name: raw.requester_name,
    payload: raw.after_data,
    before_snapshot: raw.before_data,
    summary: raw.change_summary,
  };
}

export function usePendingChanges(module?: string, recordId?: string) {
  const { user } = useCurrentUser();
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPendingChanges = useCallback(async () => {
    setLoading(true);
    let query = insforge.database
      .from("change_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (module) query = query.eq("module", module);
    if (recordId) query = query.eq("record_id", recordId);

    const { data } = await query;
    setPendingChanges((data || []).map(normalizeChange));
    setLoading(false);
  }, [module, recordId]);

  useEffect(() => {
    if (user?.id) fetchPendingChanges();
  }, [user?.id, fetchPendingChanges]);

  const hasPending = pendingChanges.length > 0;
  const pendingCount = pendingChanges.length;

  return { pendingChanges, loading, hasPending, pendingCount, refetch: fetchPendingChanges };
}
