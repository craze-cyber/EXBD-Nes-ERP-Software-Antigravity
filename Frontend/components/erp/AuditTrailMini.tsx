"use client";

import { useState, useEffect } from "react";
import { History, ChevronDown, ChevronUp, User } from "lucide-react";
import { insforge } from "@/lib/insforge";

interface AuditEntry {
  id: string;
  action: string;
  performed_by: string;
  performed_by_name?: string;
  summary: string;
  created_at: string;
}

interface Props {
  module: string;
  recordId: string;
  limit?: number;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(d).toLocaleDateString();
}

function actionColor(action: string) {
  if (action.includes("create")) return "text-green-400";
  if (action.includes("delete")) return "text-red-400";
  if (action.includes("approve")) return "text-blue-400";
  if (action.includes("reject")) return "text-orange-400";
  return "text-gray-400";
}

export function AuditTrailMini({ module, recordId, limit = 5 }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await insforge.database
        .from("audit_log")
        .select("*")
        .eq("module", module)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false })
        .limit(20);
      setEntries(data || []);
      setLoading(false);
    }
    load();
  }, [module, recordId]);

  const shown = expanded ? entries : entries.slice(0, limit);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.02] border-b border-white/10">
        <History className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-300">Audit Trail</span>
        {entries.length > 0 && (
          <span className="ml-auto text-xs text-gray-600">{entries.length} entries</span>
        )}
      </div>

      {loading ? (
        <div className="px-4 py-6 text-center text-sm text-gray-600">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-600">No history yet</div>
      ) : (
        <>
          <div className="divide-y divide-white/5">
            {shown.map(e => (
              <div key={e.id} className="flex gap-3 px-4 py-2.5">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium ${actionColor(e.action)}`}>
                      {e.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-gray-600">by</span>
                    <span className="text-xs text-gray-400">{e.performed_by_name ?? e.performed_by}</span>
                  </div>
                  {e.summary && (
                    <p className="text-xs text-gray-600 mt-0.5 truncate">{e.summary}</p>
                  )}
                </div>
                <span className="text-xs text-gray-700 shrink-0 whitespace-nowrap">{timeAgo(e.created_at)}</span>
              </div>
            ))}
          </div>
          {entries.length > limit && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-full flex items-center justify-center gap-1 px-4 py-2 text-xs text-gray-500 hover:text-gray-300 border-t border-white/10 transition-colors"
            >
              {expanded ? (
                <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" /> Show {entries.length - limit} more</>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
