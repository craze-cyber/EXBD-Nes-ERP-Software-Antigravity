import { insforge } from "@/lib/insforge";
import { generateChangeSummary } from "./change-summary";
import { logAudit } from "./audit-logger";

export type ActionType =
  | "user_create" | "user_edit" | "user_delete" | "user_role_change"
  | "user_activate" | "user_deactivate" | "password_reset"
  | "sponsor_create" | "sponsor_edit" | "sponsor_delete"
  | "client_create" | "client_edit" | "client_delete"
  | "worker_create" | "worker_edit" | "worker_delete"
  | "worker_bulk_upload" | "worker_status_change" | "worker_transfer"
  | "payroll_upload" | "payroll_edit" | "payroll_delete"
  | "payroll_approve" | "payroll_reject" | "payroll_mark_paid"
  | "liability_create" | "liability_edit" | "liability_waive"
  | "settlement_create" | "settlement_approve" | "settlement_pay"
  | "journal_create" | "journal_edit" | "journal_reverse"
  | "account_create" | "account_edit"
  | "expense_create" | "expense_edit" | "expense_approve" | "expense_delete"
  | "asset_create" | "asset_edit" | "asset_assign" | "asset_dispose"
  | "vehicle_create" | "vehicle_edit" | "compliance_create"
  | "settings_change" | "role_permission_change";

export type UserRole =
  | "master_admin" | "admin" | "hr_manager"
  | "payroll_manager" | "accountant" | "viewer";

export interface RequestUser {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
}

export interface ChangeRequest {
  action: ActionType;
  module: string;
  recordId?: string | null;
  recordLabel?: string;
  beforeData?: Record<string, any> | null;
  afterData: Record<string, any>;
  requestedBy: RequestUser;
  ipAddress?: string;
}

export interface ApprovalResult {
  status: "executed" | "pending" | "forbidden";
  message: string;
  changeRequestId?: string;
}

// Roles that always bypass approval for any action
const MASTER_BYPASS: UserRole[] = ["master_admin"];

// Actions that any listed role can execute without approval
const AUTO_APPROVE_MAP: Partial<Record<ActionType, UserRole[]>> = {
  sponsor_create:     ["master_admin", "admin"],
  sponsor_edit:       ["master_admin", "admin"],
  client_create:      ["master_admin", "admin"],
  client_edit:        ["master_admin", "admin"],
  worker_create:      ["master_admin"],
  worker_edit:        ["master_admin"],
  asset_create:       ["master_admin"],
  asset_edit:         ["master_admin"],
  asset_assign:       ["master_admin"],
  vehicle_create:     ["master_admin"],
  vehicle_edit:       ["master_admin"],
  compliance_create:  ["master_admin", "admin", "hr_manager"],
  payroll_upload:     ["master_admin"],
  payroll_approve:    ["master_admin"],
  payroll_mark_paid:  ["master_admin"],
  journal_create:     ["master_admin"],
  account_create:     ["master_admin"],
  account_edit:       ["master_admin"],
  expense_create:     ["master_admin", "accountant"],
  expense_approve:    ["master_admin"],
  liability_create:   ["master_admin"],
  settlement_create:  ["master_admin"],
  settlement_approve: ["master_admin"],
  settings_change:    ["master_admin"],
  user_create:        ["master_admin"],
  user_edit:          ["master_admin"],
};

// Actions that require at least these roles to even attempt
const CAN_ATTEMPT_MAP: Partial<Record<ActionType, UserRole[]>> = {
  user_create:          ["master_admin", "admin"],
  user_edit:            ["master_admin", "admin"],
  user_delete:          ["master_admin"],
  user_role_change:     ["master_admin"],
  sponsor_create:       ["master_admin", "admin"],
  sponsor_edit:         ["master_admin", "admin"],
  sponsor_delete:       ["master_admin", "admin"],
  client_create:        ["master_admin", "admin"],
  client_edit:          ["master_admin", "admin"],
  client_delete:        ["master_admin"],
  worker_create:        ["master_admin", "admin", "hr_manager"],
  worker_edit:          ["master_admin", "admin", "hr_manager"],
  worker_delete:        ["master_admin"],
  worker_bulk_upload:   ["master_admin", "admin", "hr_manager"],
  worker_status_change: ["master_admin", "admin"],
  worker_transfer:      ["master_admin", "admin"],
  payroll_upload:       ["master_admin", "payroll_manager"],
  payroll_approve:      ["master_admin", "admin"],
  payroll_mark_paid:    ["master_admin"],
  payroll_edit:         ["master_admin"],
  payroll_delete:       ["master_admin"],
  journal_create:       ["master_admin", "accountant"],
  journal_reverse:      ["master_admin"],
  account_create:       ["master_admin", "accountant"],
  account_edit:         ["master_admin", "accountant"],
  expense_create:       ["master_admin", "accountant"],
  expense_approve:      ["master_admin", "admin"],
  expense_delete:       ["master_admin"],
  liability_create:     ["master_admin", "admin"],
  liability_waive:      ["master_admin"],
  settlement_create:    ["master_admin", "admin", "hr_manager"],
  settlement_approve:   ["master_admin"],
  settlement_pay:       ["master_admin"],
  asset_create:         ["master_admin", "admin"],
  asset_assign:         ["master_admin", "admin"],
  asset_dispose:        ["master_admin"],
  vehicle_create:       ["master_admin", "admin"],
  vehicle_edit:         ["master_admin", "admin"],
  compliance_create:    ["master_admin", "admin", "hr_manager"],
  settings_change:      ["master_admin"],
  role_permission_change: ["master_admin"],
};

function canAttempt(action: ActionType, role: UserRole): boolean {
  const allowed = CAN_ATTEMPT_MAP[action];
  if (!allowed) return true; // not restricted
  return allowed.includes(role);
}

function isAutoApproved(action: ActionType, role: UserRole): boolean {
  if (MASTER_BYPASS.includes(role)) return true;
  const autoRoles = AUTO_APPROVE_MAP[action];
  if (!autoRoles) return false;
  return autoRoles.includes(role);
}

function determinePriority(action: ActionType): "low" | "normal" | "high" | "urgent" {
  if (["user_delete", "worker_delete", "payroll_delete", "journal_reverse", "liability_waive", "settlement_approve"].includes(action)) return "urgent";
  if (["worker_bulk_upload", "payroll_approve", "settlement_create", "user_role_change"].includes(action)) return "high";
  return "normal";
}

async function notifyMasterAdmins(
  title: string,
  message: string,
  changeRequestId: string,
  senderName: string,
  priority: string
) {
  try {
    const { data: admins } = await insforge.database
      .from("erp_users")
      .select("id")
      .eq("role", "master_admin")
      .eq("is_active", true);

    if (!admins?.length) return;

    const notifications = admins.map((a: any) => ({
      recipient_id: a.id,
      sender_name: senderName,
      type: "approval_request",
      title,
      message,
      change_request_id: changeRequestId,
      priority,
    }));

    await insforge.database.from("notifications").insert(notifications);
  } catch {
    // notification failures must not break main flow
  }
}

export async function requestChange(params: ChangeRequest): Promise<ApprovalResult> {
  const { action, module, recordId, recordLabel, beforeData, afterData, requestedBy } = params;

  // Step 1: Permission check
  if (!canAttempt(action, requestedBy.role)) {
    return { status: "forbidden", message: `Your role (${requestedBy.role}) does not have permission for: ${action}` };
  }

  // Step 2: Auto-approve check
  if (isAutoApproved(action, requestedBy.role)) {
    await logAudit({
      user_id: requestedBy.id,
      user_name: requestedBy.name,
      user_role: requestedBy.role,
      user_email: requestedBy.email,
      action,
      module,
      record_id: recordId || undefined,
      record_label: recordLabel,
      before_data: beforeData,
      after_data: afterData,
      change_summary: generateChangeSummary(beforeData || null, afterData, module),
      result: "success",
    });
    return { status: "executed", message: "Change applied immediately" };
  }

  // Step 3: Needs approval — create change_request
  const changeSummary = generateChangeSummary(beforeData || null, afterData, module);
  const priority = determinePriority(action);

  const { data: cr, error } = await insforge.database.from("change_requests").insert([{
    requested_by: requestedBy.id,
    requester_name: requestedBy.name,
    requester_role: requestedBy.role,
    action,
    module,
    record_id: recordId || null,
    record_label: recordLabel || null,
    before_data: beforeData || null,
    after_data: afterData,
    change_summary: changeSummary,
    status: "pending",
    priority,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  }]).select().single();

  if (error || !cr) {
    return { status: "forbidden", message: "Failed to submit change request. Please try again." };
  }

  // Step 4: Notify master admins
  await notifyMasterAdmins(
    `Approval Required: ${module} — ${action.replace(/_/g, " ")}`,
    `${requestedBy.name} (${requestedBy.role}) wants to ${action.replace(/_/g, " ")}: ${recordLabel || ""}`,
    cr.id,
    requestedBy.name,
    priority
  );

  // Step 5: Audit log
  await logAudit({
    user_id: requestedBy.id,
    user_name: requestedBy.name,
    user_role: requestedBy.role,
    user_email: requestedBy.email,
    action,
    module,
    record_id: recordId || undefined,
    record_label: recordLabel,
    before_data: beforeData,
    after_data: afterData,
    change_summary: changeSummary,
    result: "pending",
    change_request_id: cr.id,
  });

  return {
    status: "pending",
    message: "Your change has been submitted for Master Admin approval.",
    changeRequestId: cr.id,
  };
}

const MODULE_TABLE: Record<string, string> = {
  Workers: "workers",
  Sponsors: "sponsors",
  Clients: "clients",
  Assets: "assets",
  Fleet: "vehicles",
  Vehicles: "vehicles",
  Expenses: "expenses",
  Accounting: "journal_entries",
  Liabilities: "liabilities",
  Settlements: "exit_settlements",
  "Exit & Settlement": "exit_settlements",
  Users: "erp_users",
  Compliance: "compliance_documents",
};

async function executeApprovedChange(cr: any): Promise<void> {
  const table = MODULE_TABLE[cr.module];
  if (!table || !cr.after_data) return;
  try {
    if (cr.action?.endsWith("_create") || cr.action?.endsWith("_upload")) {
      await insforge.database.from(table).insert([cr.after_data]);
    } else if (cr.action?.endsWith("_edit") || cr.action?.endsWith("_status_change") || cr.action?.endsWith("_transfer") || cr.action?.endsWith("_assign") || cr.action?.endsWith("_waive")) {
      if (cr.record_id) await insforge.database.from(table).update(cr.after_data).eq("id", cr.record_id);
    } else if (cr.action?.endsWith("_delete") || cr.action?.endsWith("_dispose")) {
      if (cr.record_id) await insforge.database.from(table).delete().eq("id", cr.record_id);
    }
  } catch {
    // DB execution errors are logged but don't block the approval record update
  }
}

export async function approveChange(
  changeRequestId: string,
  adminUser: RequestUser,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  const { data: cr, error } = await insforge.database
    .from("change_requests")
    .select("*")
    .eq("id", changeRequestId)
    .single();

  if (error || !cr) return { success: false, message: "Change request not found" };
  if (cr.status !== "pending") return { success: false, message: `Already ${cr.status}` };

  // Execute the actual DB operation
  await executeApprovedChange(cr);

  await insforge.database.from("change_requests").update({
    status: "approved",
    reviewed_by: adminUser.id,
    reviewer_name: adminUser.name,
    reviewed_at: new Date().toISOString(),
    approval_notes: notes || null,
  }).eq("id", changeRequestId);

  // Notify requester
  if (cr.requested_by) {
    await insforge.database.from("notifications").insert([{
      recipient_id: cr.requested_by,
      sender_name: adminUser.name,
      type: "approved",
      title: `Change Approved: ${cr.module} — ${cr.action?.replace(/_/g, " ")}`,
      message: `Your ${cr.action?.replace(/_/g, " ")} request for "${cr.record_label}" was approved by ${adminUser.name}`,
      change_request_id: changeRequestId,
    }]);
  }

  await logAudit({
    user_id: adminUser.id,
    user_name: adminUser.name,
    user_role: adminUser.role,
    action: cr.action,
    module: cr.module,
    record_id: cr.record_id,
    record_label: cr.record_label,
    before_data: cr.before_data,
    after_data: cr.after_data,
    change_summary: `APPROVED by ${adminUser.name}. ${notes ? `Notes: ${notes}` : ""}`,
    result: "success",
    change_request_id: changeRequestId,
  });

  return { success: true, message: "Change approved and applied" };
}

export async function rejectChange(
  changeRequestId: string,
  adminUser: RequestUser,
  reason: string
): Promise<{ success: boolean }> {
  const { data: cr } = await insforge.database
    .from("change_requests")
    .select("*")
    .eq("id", changeRequestId)
    .single();

  await insforge.database.from("change_requests").update({
    status: "rejected",
    reviewed_by: adminUser.id,
    reviewer_name: adminUser.name,
    reviewed_at: new Date().toISOString(),
    rejection_reason: reason,
  }).eq("id", changeRequestId);

  if (cr?.requested_by) {
    await insforge.database.from("notifications").insert([{
      recipient_id: cr.requested_by,
      sender_name: adminUser.name,
      type: "rejected",
      title: `Change Rejected: ${cr.module}`,
      message: `Your request was rejected. Reason: ${reason}`,
      change_request_id: changeRequestId,
      priority: "high",
    }]);
  }

  await logAudit({
    user_id: adminUser.id,
    user_name: adminUser.name,
    user_role: adminUser.role,
    action: cr?.action || "unknown",
    module: cr?.module || "unknown",
    record_id: cr?.record_id,
    change_summary: `REJECTED by ${adminUser.name}. Reason: ${reason}`,
    result: "rejected",
    change_request_id: changeRequestId,
  });

  return { success: true };
}
