"use client";

import { Clock, ChevronRight } from "lucide-react";
import { usePendingChanges } from "@/hooks/usePendingChanges";
import { usePermissions } from "@/hooks/usePermissions";

interface Props {
  module: string;
  recordId: string;
  onViewApprovals?: () => void;
}

export function PendingChangeBanner({ module, recordId, onViewApprovals }: Props) {
  const { pendingChanges, hasPending } = usePendingChanges(module, recordId);
  const { isMasterAdmin } = usePermissions();

  if (!hasPending) return null;

  const latest = pendingChanges[0];

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
      <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-yellow-200 font-medium">
          {pendingChanges.length === 1 ? "1 pending change" : `${pendingChanges.length} pending changes`}
        </span>
        <span className="text-yellow-400/70 ml-2 text-xs truncate">
          {latest?.summary}
        </span>
      </div>
      {(isMasterAdmin || onViewApprovals) && (
        <button
          onClick={onViewApprovals ?? (() => window.location.href = "/settings/system")}
          className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-200 transition-colors shrink-0"
        >
          {isMasterAdmin ? "Review" : "View Status"}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
