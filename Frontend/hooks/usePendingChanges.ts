"use client";

import { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import { useCurrentUser } from "./useCurrentUser";

export interface PendingChange {
  id: string;
  module: string;
  action_type: string;
  record_id: string;
  requested_by: string;
  requested_by_name?: string;
  payload: any;
  before_snapshot: any;
  summary: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
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
    setPendingChanges(data || []);
    setLoading(false);
  }, [module, recordId]);

  useEffect(() => {
    if (user?.id) fetchPendingChanges();
  }, [user?.id, fetchPendingChanges]);

  const hasPending = pendingChanges.length > 0;
  const pendingCount = pendingChanges.length;

  return { pendingChanges, loading, hasPending, pendingCount, refetch: fetchPendingChanges };
}
