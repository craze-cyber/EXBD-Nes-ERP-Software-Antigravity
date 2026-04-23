import { insforge } from "@sovereign/database";
import { UserRole } from "@/types/erp.types";

export const auth = insforge.auth;

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const { data: authData } = await auth.getCurrentUser();
  if (!authData?.user) return null;

  const { data: userData, error } = await insforge.database
    .from("erp_users")
    .select("*")
    .eq("auth_id", authData.user.id)
    .maybeSingle();

  if (error || !userData) return null;

  return userData as AuthUser;
}

export const PERMISSIONS = {
  VIEW_MODULES: ["master_admin", "admin", "hr_manager", "payroll_manager", "accountant", "viewer"],
  MANAGE_SPONSORS: ["master_admin", "admin"],
  MANAGE_CLIENTS: ["master_admin", "admin"],
  UPLOAD_WORKERS: ["master_admin", "admin", "hr_manager"],
  UPLOAD_PAYROLL: ["master_admin", "admin", "payroll_manager"],
  APPROVE_PAYROLL: ["master_admin", "admin"],
  MANAGE_ACCOUNTING: ["master_admin", "accountant"],
  MANAGE_USERS: ["master_admin"],
};

export function hasPermission(role: UserRole, action: keyof typeof PERMISSIONS): boolean {
  return (PERMISSIONS[action] as string[]).includes(role);
}

export async function signOut() {
  try { await auth.signOut(); } catch {}
  if (typeof window !== "undefined") {
    document.cookie = "insforge-token=; path=/; max-age=0; SameSite=Lax";
    window.location.href = "/login";
  }
}
