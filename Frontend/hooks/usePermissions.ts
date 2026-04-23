"use client";

import { useCurrentUser } from "./useCurrentUser";
import type { ActionType, UserRole } from "@/lib/approval-engine";

const PERMISSIONS: Record<string, UserRole[]> = {
  VIEW_MODULES:       ["master_admin","admin","hr_manager","payroll_manager","accountant","viewer"],
  MANAGE_SPONSORS:    ["master_admin","admin"],
  MANAGE_CLIENTS:     ["master_admin","admin"],
  MANAGE_WORKERS:     ["master_admin","admin","hr_manager"],
  UPLOAD_WORKERS:     ["master_admin","admin","hr_manager"],
  UPLOAD_PAYROLL:     ["master_admin","payroll_manager"],
  APPROVE_PAYROLL:    ["master_admin","admin"],
  MANAGE_ACCOUNTING:  ["master_admin","accountant"],
  MANAGE_EXPENSES:    ["master_admin","accountant"],
  MANAGE_ASSETS:      ["master_admin","admin"],
  MANAGE_FLEET:       ["master_admin","admin","hr_manager"],
  MANAGE_USERS:       ["master_admin"],
  VIEW_AUDIT_LOG:     ["master_admin","admin"],
  MANAGE_SETTINGS:    ["master_admin"],
  APPROVE_REQUESTS:   ["master_admin"],
};

export function usePermissions() {
  const { user } = useCurrentUser();
  const role = (user?.role || "viewer") as UserRole;

  const can = (permission: keyof typeof PERMISSIONS): boolean => {
    return (PERMISSIONS[permission] as string[]).includes(role);
  };

  const canAttemptAction = (action: ActionType): boolean => {
    // Master admin can do everything
    if (role === "master_admin") return true;
    // Simplified check based on action prefix
    if (action.startsWith("worker_") && can("MANAGE_WORKERS")) return true;
    if (action.startsWith("payroll_") && can("UPLOAD_PAYROLL")) return true;
    if (action.startsWith("journal_") && can("MANAGE_ACCOUNTING")) return true;
    if (action.startsWith("expense_") && can("MANAGE_EXPENSES")) return true;
    if (action.startsWith("asset_") && can("MANAGE_ASSETS")) return true;
    if (action.startsWith("vehicle_") && can("MANAGE_FLEET")) return true;
    if (action.startsWith("compliance_") && can("MANAGE_FLEET")) return true;
    if (action.startsWith("sponsor_") && can("MANAGE_SPONSORS")) return true;
    if (action.startsWith("client_") && can("MANAGE_CLIENTS")) return true;
    if (action.startsWith("user_") && can("MANAGE_USERS")) return true;
    if (action.startsWith("settings_") && can("MANAGE_SETTINGS")) return true;
    return false;
  };

  return { can, canAttemptAction, role, isMasterAdmin: role === "master_admin" };
}
