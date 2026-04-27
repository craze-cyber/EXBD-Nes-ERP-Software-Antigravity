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

  const authId = authData.user.id;
  const authEmail = authData.user.email;

  // Primary lookup: match by auth_id
  let { data: userData } = await insforge.database
    .from("erp_users")
    .select("*")
    .eq("auth_id", authId)
    .maybeSingle();

  // Fallback: match by email (handles accounts created before auth_id was recorded)
  if (!userData && authEmail) {
    const { data: byEmail } = await insforge.database
      .from("erp_users")
      .select("*")
      .eq("email", authEmail)
      .maybeSingle();

    if (byEmail) {
      userData = byEmail;
      // Self-heal: write the correct auth_id so future lookups use the fast path
      await insforge.database
        .from("erp_users")
        .update({ auth_id: authId })
        .eq("id", byEmail.id);
    }
  }

  if (!userData) return null;

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
