"use client";

import React, { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import {
  UserPlus, UserCheck, UserX, Mail, Loader2,
  Eye, EyeOff, Edit2, RefreshCw, X, Search, Crown,
  Lock, CheckCircle2, AlertCircle, Shield, ShieldCheck, ShieldOff,
  Users, Settings2, Save, RotateCcw, Check,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type UserRole = "admin" | "hr_manager" | "payroll_manager" | "accountant" | "viewer";

interface ERPUser {
  id: string;
  auth_id?: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface ModulePerm {
  can_view: boolean;
  can_write: boolean;
  can_delete: boolean;
}

type UserPerms = Record<string, ModulePerm>;

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: "admin",           label: "Admin",           desc: "Full access except master settings" },
  { value: "hr_manager",      label: "HR Manager",      desc: "Workers, fleet, compliance"          },
  { value: "payroll_manager", label: "Payroll Manager", desc: "Upload and process payroll"          },
  { value: "accountant",      label: "Accountant",      desc: "Journals, expenses, assets"          },
  { value: "viewer",          label: "Viewer",          desc: "Read-only access to all modules"     },
];

const MODULES: { id: string; label: string; group: string }[] = [
  { id: "dashboard",    label: "Dashboard",           group: "General" },
  { id: "sponsors",     label: "Sponsors",            group: "Personnel" },
  { id: "clients",      label: "Clients",             group: "Personnel" },
  { id: "workers",      label: "Workers",             group: "Personnel" },
  { id: "fleet",        label: "Fleet & Compliance",  group: "Operations" },
  { id: "assets",       label: "Assets",              group: "Operations" },
  { id: "payroll",      label: "Payroll",             group: "Financials" },
  { id: "accounting",   label: "Accounting",          group: "Financials" },
  { id: "expenses",     label: "Expenses",            group: "Financials" },
  { id: "liabilities",  label: "Liabilities",         group: "Financials" },
  { id: "settlements",  label: "Exit & Settlement",   group: "Financials" },
  { id: "reports",      label: "Reports",             group: "Financials" },
  { id: "users",        label: "User Management",     group: "Admin" },
  { id: "settings",     label: "System Settings",     group: "Admin" },
];

const MODULE_GROUPS = Array.from(new Set(MODULES.map(m => m.group)));

const ROLE_DEFAULTS: Record<string, UserPerms> = {
  master_admin: Object.fromEntries(MODULES.map(m => [m.id, { can_view: true, can_write: true, can_delete: true }])),
  admin: Object.fromEntries(MODULES.map(m => [m.id, {
    can_view: true,
    can_write: !["users", "settings"].includes(m.id),
    can_delete: ["sponsors", "clients", "workers", "fleet", "assets", "expenses"].includes(m.id),
  }])),
  hr_manager: Object.fromEntries(MODULES.map(m => [m.id, {
    can_view: !["users", "settings", "payroll", "accounting"].includes(m.id),
    can_write: ["workers", "fleet", "assets"].includes(m.id),
    can_delete: false,
  }])),
  payroll_manager: Object.fromEntries(MODULES.map(m => [m.id, {
    can_view: ["dashboard", "workers", "payroll", "reports"].includes(m.id),
    can_write: ["payroll"].includes(m.id),
    can_delete: false,
  }])),
  accountant: Object.fromEntries(MODULES.map(m => [m.id, {
    can_view: ["dashboard", "accounting", "expenses", "assets", "reports", "liabilities"].includes(m.id),
    can_write: ["accounting", "expenses"].includes(m.id),
    can_delete: false,
  }])),
  viewer: Object.fromEntries(MODULES.map(m => [m.id, {
    can_view: !["users", "settings"].includes(m.id),
    can_write: false,
    can_delete: false,
  }])),
};

const roleStyle: Record<string, string> = {
  master_admin:    "bg-red-500/10 text-red-400 border-red-500/20",
  admin:           "bg-blue-500/10 text-blue-400 border-blue-500/20",
  hr_manager:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  payroll_manager: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  accountant:      "bg-amber-500/10 text-amber-400 border-amber-500/20",
  viewer:          "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const roleColorDot: Record<string, string> = {
  master_admin: "bg-red-400", admin: "bg-blue-400", hr_manager: "bg-emerald-400",
  payroll_manager: "bg-purple-400", accountant: "bg-amber-400", viewer: "bg-zinc-400",
};

function timeAgo(d?: string) {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

const emptyPerm = (): ModulePerm => ({ can_view: false, can_write: false, can_delete: false });

// ─── Permission toggle cell ───────────────────────────────────────────────────

function PermToggle({ active, onChange, label, color }: {
  active: boolean; onChange: (v: boolean) => void; label: string;
  color: "blue" | "amber" | "red";
}) {
  const colors = {
    blue:  active ? "bg-blue-500/20 border-blue-500/40 text-blue-400"  : "bg-white/[0.02] border-white/5 text-zinc-600",
    amber: active ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-white/[0.02] border-white/5 text-zinc-600",
    red:   active ? "bg-red-500/20 border-red-500/40 text-red-400"    : "bg-white/[0.02] border-white/5 text-zinc-600",
  };
  return (
    <button
      onClick={() => onChange(!active)}
      className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${colors[color]}`}
      title={label}
    >
      {active ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3 opacity-30" />}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState<"users" | "permissions">("users");

  // ── Users state ──
  const [users, setUsers] = useState<ERPUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", password: "", role: "viewer" as UserRole });
  const [newUserErrors, setNewUserErrors] = useState<Record<string, string>>({});

  // Edit role modal
  const [editUser, setEditUser] = useState<ERPUser | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Reset password modal
  const [resetUser, setResetUser] = useState<ERPUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [resetting, setResetting] = useState(false);

  // ── Permissions state ──
  const [selectedUser, setSelectedUser] = useState<ERPUser | null>(null);
  const [perms, setPerms] = useState<UserPerms>({});
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsDirty, setPermsDirty] = useState(false);
  const [permsSaving, setPermsSaving] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await insforge.database
      .from("erp_users").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to load users");
    else setUsers((data || []) as ERPUser[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Load permissions when user is selected
  const loadPerms = useCallback(async (user: ERPUser) => {
    setPermsLoading(true);
    setPermsDirty(false);
    const { data } = await insforge.database
      .from("permission_matrix").select("*").eq("user_id", user.id);

    // Build map from DB rows, fill missing with role defaults
    const defaults = ROLE_DEFAULTS[user.role] || ROLE_DEFAULTS.viewer;
    const map: UserPerms = {};
    const dbMap: Record<string, ModulePerm> = {};
    (data || []).forEach((row: any) => {
      dbMap[row.module] = { can_view: row.can_view, can_write: row.can_write, can_delete: row.can_delete };
    });
    MODULES.forEach(m => {
      map[m.id] = dbMap[m.id] ?? defaults[m.id] ?? emptyPerm();
    });
    setPerms(map);
    setPermsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedUser) loadPerms(selectedUser);
  }, [selectedUser, loadPerms]);

  // ── Perm helpers ──

  const togglePerm = (moduleId: string, field: keyof ModulePerm) => {
    setPerms(prev => {
      const cur = prev[moduleId] ?? emptyPerm();
      let updated = { ...cur, [field]: !cur[field] };
      // Write requires view; delete requires write
      if (field === "can_view" && !updated.can_view) updated = { ...updated, can_write: false, can_delete: false };
      if (field === "can_write" && updated.can_write) updated = { ...updated, can_view: true };
      if (field === "can_write" && !updated.can_write) updated = { ...updated, can_delete: false };
      if (field === "can_delete" && updated.can_delete) updated = { ...updated, can_view: true, can_write: true };
      return { ...prev, [moduleId]: updated };
    });
    setPermsDirty(true);
  };

  const applyRoleDefaults = () => {
    if (!selectedUser) return;
    const defaults = ROLE_DEFAULTS[selectedUser.role] || ROLE_DEFAULTS.viewer;
    setPerms({ ...defaults });
    setPermsDirty(true);
    toast.info("Role defaults applied — click Save to persist");
  };

  const setGroupPerm = (group: string, field: keyof ModulePerm, value: boolean) => {
    const groupModules = MODULES.filter(m => m.group === group);
    setPerms(prev => {
      const updated = { ...prev };
      groupModules.forEach(m => {
        let p = { ...updated[m.id] };
        p[field] = value;
        if (field === "can_view" && !value) p = { ...p, can_write: false, can_delete: false };
        if (field === "can_write" && value) p = { ...p, can_view: true };
        if (field === "can_write" && !value) p = { ...p, can_delete: false };
        if (field === "can_delete" && value) p = { ...p, can_view: true, can_write: true };
        updated[m.id] = p;
      });
      return updated;
    });
    setPermsDirty(true);
  };

  const savePerms = async () => {
    if (!selectedUser) return;
    setPermsSaving(true);
    const rows = MODULES.map(m => ({
      user_id: selectedUser.id,
      module: m.id,
      can_view: perms[m.id]?.can_view ?? false,
      can_write: perms[m.id]?.can_write ?? false,
      can_delete: perms[m.id]?.can_delete ?? false,
    }));
    const { error } = await insforge.database
      .from("permission_matrix")
      .upsert(rows, { onConflict: "user_id,module" });
    if (error) toast.error("Failed to save permissions: " + error.message);
    else { toast.success(`Permissions saved for ${selectedUser.full_name}`); setPermsDirty(false); }
    setPermsSaving(false);
  };

  // ── User CRUD ──

  const validateNewUser = () => {
    const errs: Record<string, string> = {};
    if (!newUser.full_name.trim()) errs.full_name = "Name is required";
    if (!newUser.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = "Valid email required";
    if (newUser.password.length < 8) errs.password = "Minimum 8 characters";
    setNewUserErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateNewUser()) return;
    setCreating(true);
    try {
      const { data: authData, error: authErr } = await (insforge.auth as any).signUp({
        email: newUser.email.toLowerCase().trim(),
        password: newUser.password,
      });
      if (authErr) throw new Error(authErr.message || "Auth signup failed");
      const authId = authData?.user?.id;
      if (!authId) throw new Error("No auth ID returned — user may already exist");

      const { error: dbErr } = await insforge.database.from("erp_users").insert([{
        auth_id: authId,
        full_name: newUser.full_name.trim(),
        email: newUser.email.toLowerCase().trim(),
        role: newUser.role,
        is_active: true,
      }]);
      if (dbErr) throw new Error(dbErr.message);

      // Seed default permissions
      const defaults = ROLE_DEFAULTS[newUser.role] || ROLE_DEFAULTS.viewer;
      const permRows = MODULES.map(m => ({
        user_id: authId,
        module: m.id,
        can_view: defaults[m.id]?.can_view ?? false,
        can_write: defaults[m.id]?.can_write ?? false,
        can_delete: defaults[m.id]?.can_delete ?? false,
      }));
      await insforge.database.from("permission_matrix").insert(permRows);

      toast.success(`User "${newUser.full_name}" created with default ${newUser.role} permissions`);
      setShowCreate(false);
      setNewUser({ full_name: "", email: "", password: "", role: "viewer" });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user: ERPUser) => {
    if (user.role === "master_admin") { toast.error("Cannot deactivate Master Admin"); return; }
    const { error } = await insforge.database
      .from("erp_users").update({ is_active: !user.is_active }).eq("id", user.id);
    if (error) toast.error("Failed to update status");
    else { toast.success(user.is_active ? "User deactivated" : "User activated"); fetchUsers(); }
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditSaving(true);
    const { error } = await insforge.database
      .from("erp_users").update({ role: editRole }).eq("id", editUser.id);
    if (error) toast.error("Failed to update role");
    else {
      toast.success("Role updated");
      // Re-seed permissions with new role defaults (don't overwrite custom)
      setEditUser(null);
      fetchUsers();
    }
    setEditSaving(false);
  };

  const handleResetPassword = async () => {
    if (!resetUser || newPassword.length < 8) return;
    setResetting(true);
    try {
      const { error } = await (insforge.auth as any).admin?.updateUserById(resetUser.auth_id!, { password: newPassword });
      if (error) throw new Error(error.message);
      toast.success("Password reset successfully");
      setResetUser(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Could not reset password via admin API");
    } finally {
      setResetting(false);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {users.filter(u => u.is_active).length} active · {users.length} total
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "users" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <Users className="w-4 h-4" /> Team
        </button>
        <button
          onClick={() => setActiveTab("permissions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "permissions" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <Shield className="w-4 h-4" /> Permissions
        </button>
      </div>

      {/* ══════════════ USERS TAB ══════════════ */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Search + filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[var(--primary)]/40 transition-colors"
              />
            </div>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-300 outline-none appearance-none"
            >
              <option value="all" className="bg-[#0e0e12]">All Roles</option>
              <option value="master_admin" className="bg-[#0e0e12]">Master Admin</option>
              {ROLES.map(r => <option key={r.value} value={r.value} className="bg-[#0e0e12]">{r.label}</option>)}
            </select>
            <button onClick={fetchUsers} className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-zinc-600">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-sm">No users found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">User</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Role</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500 hidden sm:table-cell">Status</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500 hidden md:table-cell">Joined</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500 hidden lg:table-cell">Last Login</th>
                    <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map(user => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-transparent border border-[var(--primary)]/10 flex items-center justify-center font-bold text-[var(--primary)] text-sm shrink-0">
                            {user.full_name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-white truncate">{user.full_name}</p>
                              {user.role === "master_admin" && <Crown className="w-3 h-3 text-red-400 shrink-0" />}
                            </div>
                            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${roleStyle[user.role] || roleStyle.viewer}`}>
                          {user.role.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className={`flex items-center gap-1.5 text-xs font-medium w-fit ${user.is_active ? "text-emerald-400" : "text-zinc-500"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-400" : "bg-zinc-600"}`} />
                          {user.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-zinc-500 hidden md:table-cell">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-xs text-zinc-500 hidden lg:table-cell">
                        {timeAgo(user.last_login)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {user.role !== "master_admin" && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setActiveTab("permissions"); setSelectedUser(user); }}
                              className="p-1.5 rounded-lg text-zinc-600 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                              title="Manage permissions"
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setEditUser(user); setEditRole(user.role); }}
                              className="p-1.5 rounded-lg text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                              title="Change role"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setResetUser(user); setNewPassword(""); }}
                              className="p-1.5 rounded-lg text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                              title="Reset password"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(user)}
                              className={`p-1.5 rounded-lg transition-colors ${user.is_active ? "text-zinc-600 hover:text-red-400 hover:bg-red-500/10" : "text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10"}`}
                              title={user.is_active ? "Deactivate" : "Activate"}
                            >
                              {user.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ PERMISSIONS TAB ══════════════ */}
      {activeTab === "permissions" && (
        <div className="flex gap-5 min-h-[500px]">
          {/* Left: user list */}
          <div className="w-56 shrink-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2 pb-1">Select User</p>
            {users.filter(u => u.role !== "master_admin").map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                  selectedUser?.id === u.id
                    ? "bg-[var(--primary)]/10 border border-[var(--primary)]/25 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                  {u.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{u.full_name}</p>
                  <p className={`text-[9px] font-bold uppercase ${roleStyle[u.role]?.split(" ")[1] || "text-zinc-600"}`}>
                    {u.role.replace(/_/g, " ")}
                  </p>
                </div>
              </button>
            ))}
            {users.filter(u => u.role !== "master_admin").length === 0 && (
              <p className="text-xs text-zinc-600 px-2 py-4">No users to configure</p>
            )}
          </div>

          {/* Right: permission grid */}
          <div className="flex-1 min-w-0">
            {!selectedUser ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 border border-white/5 rounded-2xl bg-white/[0.01]">
                <Shield className="w-10 h-10 text-zinc-700 mb-3" />
                <p className="text-zinc-400 font-medium">Select a user</p>
                <p className="text-zinc-600 text-sm mt-1">Choose a user from the left to configure their permissions</p>
              </div>
            ) : permsLoading ? (
              <div className="flex items-center justify-center h-48 text-zinc-600">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Permissions header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedUser.full_name}</h3>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${roleStyle[selectedUser.role]}`}>
                      {selectedUser.role.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={applyRoleDefaults}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Apply Role Defaults
                    </button>
                    <button
                      onClick={savePerms}
                      disabled={!permsDirty || permsSaving}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        permsDirty
                          ? "bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white"
                          : "bg-white/5 text-zinc-600 cursor-not-allowed"
                      }`}
                    >
                      {permsSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Permissions
                    </button>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-zinc-500 px-1">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/40" /> View</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" /> Write</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40" /> Delete</span>
                </div>

                {/* Permission table grouped by section */}
                <div className="rounded-2xl border border-white/5 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5">
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Module</th>
                        <th className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[9px] font-bold text-blue-400 uppercase">View</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[9px] font-bold text-amber-400 uppercase">Write</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <X className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-[9px] font-bold text-red-400 uppercase">Delete</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {MODULE_GROUPS.map(group => {
                        const groupMods = MODULES.filter(m => m.group === group);
                        const allView   = groupMods.every(m => perms[m.id]?.can_view);
                        const allWrite  = groupMods.every(m => perms[m.id]?.can_write);
                        const allDelete = groupMods.every(m => perms[m.id]?.can_delete);
                        return (
                          <React.Fragment key={group}>
                            {/* Group header row */}
                            <tr className="bg-white/[0.015]">
                              <td className="px-5 py-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{group}</span>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  onClick={() => setGroupPerm(group, "can_view", !allView)}
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded transition-colors ${allView ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-zinc-600 hover:text-zinc-400"}`}
                                >
                                  {allView ? "All" : "None"}
                                </button>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  onClick={() => setGroupPerm(group, "can_write", !allWrite)}
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded transition-colors ${allWrite ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-zinc-600 hover:text-zinc-400"}`}
                                >
                                  {allWrite ? "All" : "None"}
                                </button>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  onClick={() => setGroupPerm(group, "can_delete", !allDelete)}
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded transition-colors ${allDelete ? "bg-red-500/20 text-red-400" : "bg-white/5 text-zinc-600 hover:text-zinc-400"}`}
                                >
                                  {allDelete ? "All" : "None"}
                                </button>
                              </td>
                            </tr>
                            {/* Module rows */}
                            {groupMods.map(mod => {
                              const p = perms[mod.id] ?? emptyPerm();
                              return (
                                <tr key={mod.id} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="px-5 py-3 pl-8">
                                    <span className="text-sm text-zinc-300">{mod.label}</span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex justify-center">
                                      <PermToggle active={p.can_view} onChange={v => togglePerm(mod.id, "can_view")} label="View" color="blue" />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex justify-center">
                                      <PermToggle active={p.can_write} onChange={v => togglePerm(mod.id, "can_write")} label="Write" color="amber" />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex justify-center">
                                      <PermToggle active={p.can_delete} onChange={v => togglePerm(mod.id, "can_delete")} label="Delete" color="red" />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {permsDirty && (
                  <p className="text-xs text-amber-400 flex items-center gap-1.5 px-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    You have unsaved permission changes
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ CREATE USER MODAL ══════════════ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md bg-[#0e0e12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
              <div>
                <h2 className="text-base font-bold text-white">Create New User</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Account will be created with default role permissions</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-zinc-600 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Full Name</label>
                <input
                  value={newUser.full_name}
                  onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="e.g. Abdullah Ahmed"
                  className={`mt-1.5 w-full bg-white/5 border ${newUserErrors.full_name ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[var(--primary)]/50 transition-colors`}
                />
                {newUserErrors.full_name && <p className="text-xs text-red-400 mt-1">{newUserErrors.full_name}</p>}
              </div>
              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Email Address</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                  placeholder="user@company.com"
                  className={`mt-1.5 w-full bg-white/5 border ${newUserErrors.email ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[var(--primary)]/50 transition-colors`}
                />
                {newUserErrors.email && <p className="text-xs text-red-400 mt-1">{newUserErrors.email}</p>}
              </div>
              {/* Password */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Password</label>
                <div className="relative mt-1.5">
                  <input
                    type={showPw ? "text" : "password"}
                    value={newUser.password}
                    onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 8 characters"
                    className={`w-full bg-white/5 border ${newUserErrors.password ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-600 outline-none focus:border-[var(--primary)]/50 transition-colors`}
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newUserErrors.password && <p className="text-xs text-red-400 mt-1">{newUserErrors.password}</p>}
              </div>
              {/* Role */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Role</label>
                <div className="mt-1.5 grid grid-cols-1 gap-1.5">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setNewUser(p => ({ ...p, role: r.value }))}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${
                        newUser.role === r.value
                          ? "border-[var(--primary)]/40 bg-[var(--primary)]/8"
                          : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${roleColorDot[r.value]} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-white">{r.label}</span>
                        <span className="text-xs text-zinc-500 ml-2">{r.desc}</span>
                      </div>
                      {newUser.role === r.value && <CheckCircle2 className="w-4 h-4 text-[var(--primary)] shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-white/[0.08]">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={creating}
                className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ EDIT ROLE MODAL ══════════════ */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditUser(null)}>
          <div className="w-full max-w-sm bg-[#0e0e12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
              <div>
                <h2 className="text-base font-bold text-white">Change Role</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{editUser.full_name}</p>
              </div>
              <button onClick={() => setEditUser(null)} className="text-zinc-600 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-1.5">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setEditRole(r.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    editRole === r.value ? "border-[var(--primary)]/40 bg-[var(--primary)]/8" : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${roleColorDot[r.value]} shrink-0`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{r.label}</p>
                    <p className="text-xs text-zinc-500">{r.desc}</p>
                  </div>
                  {editRole === r.value && <CheckCircle2 className="w-4 h-4 text-[var(--primary)] shrink-0" />}
                </button>
              ))}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-white/[0.08]">
              <button onClick={() => setEditUser(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-zinc-400 text-sm font-medium hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving || editRole === editUser.role}
                className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ RESET PASSWORD MODAL ══════════════ */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setResetUser(null)}>
          <div className="w-full max-w-sm bg-[#0e0e12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
              <div>
                <h2 className="text-base font-bold text-white">Reset Password</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{resetUser.full_name}</p>
              </div>
              <button onClick={() => setResetUser(null)} className="text-zinc-600 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">The user will need to sign in with this new password. Share it securely.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">New Password</label>
                <div className="relative mt-1.5">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/40 transition-colors"
                  />
                  <button type="button" onClick={() => setShowNewPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword.length > 0 && newPassword.length < 8 && (
                  <p className="text-xs text-red-400 mt-1">At least 8 characters required</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-white/[0.08]">
              <button onClick={() => setResetUser(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-zinc-400 text-sm font-medium hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleResetPassword}
                disabled={resetting || newPassword.length < 8}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
