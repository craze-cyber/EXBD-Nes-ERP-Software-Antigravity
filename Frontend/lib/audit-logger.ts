import { insforge } from "@/lib/insforge";

export interface AuditEntry {
  user_id?: string;
  user_name: string;
  user_role?: string;
  user_email?: string;
  action: string;
  module: string;
  record_id?: string;
  record_label?: string;
  before_data?: any;
  after_data?: any;
  change_summary?: string;
  result?: "success" | "failed" | "pending" | "rejected";
  change_request_id?: string;
  error_message?: string;
}

export async function logAudit(entry: AuditEntry) {
  try {
    await insforge.database.from("audit_log").insert([{
      user_id: entry.user_id || null,
      user_name: entry.user_name,
      user_role: entry.user_role || null,
      user_email: entry.user_email || null,
      action: entry.action,
      module: entry.module,
      record_id: entry.record_id || null,
      record_label: entry.record_label || null,
      before_data: entry.before_data || null,
      after_data: entry.after_data || null,
      change_summary: entry.change_summary || null,
      result: entry.result || "success",
      change_request_id: entry.change_request_id || null,
      error_message: entry.error_message || null,
    }]);
  } catch {
    // Audit log failures must never break the main flow
  }
}
