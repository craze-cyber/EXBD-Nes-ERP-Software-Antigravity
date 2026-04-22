"use client";

import React, { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import { AuthUser, hasPermission } from "@/lib/auth";
import { toast } from "sonner";
import { 
  UserPlus, 
  MoreVertical, 
  Shield, 
  UserCheck, 
  UserX,
  Mail,
  Calendar,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ERPUser extends AuthUser {
  created_at: string;
  last_login?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<ERPUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await insforge.database
      .from("erp_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load users");
    } else {
      setUsers(data as ERPUser[]);
    }
    setIsLoading(false);
  };

  const handleToggleActive = async (user: ERPUser) => {
    const { error } = await insforge.database
      .from("erp_users")
      .update({ is_active: !user.is_active })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update user status");
    } else {
      toast.success(`User ${user.is_active ? "deactivated" : "activated"}`);
      fetchUsers();
    }
  };

  const roleColors: Record<string, string> = {
    master_admin: "bg-red-500/10 text-red-400 border-red-500/20",
    admin: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    hr_manager: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    payroll_manager: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    accountant: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    viewer: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage system access and roles</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Add New User
        </button>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">User</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Role</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Status</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Last Login</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-primary">
                      {user.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-bold uppercase border",
                    roleColors[user.role]
                  )}>
                    {user.role.replace("_", " ")}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {user.is_active ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                        <UserCheck className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                        <UserX className="w-3 h-3" /> Disabled
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 outline-none">
                    <button 
                      onClick={() => handleToggleActive(user)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        user.is_active ? "hover:bg-red-500/10 text-red-500/50 hover:text-red-500" : "hover:bg-emerald-500/10 text-emerald-500/50 hover:text-emerald-500"
                      )}
                    >
                      {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    <button className="p-2 rounded-lg hover:bg-white/10 text-zinc-500">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Basic Create User Modal Stub */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-md p-8 rounded-3xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4">Add New User</h2>
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              toast.info("User creation requires Auth signup + DB insert logic. Implementing...");
              setIsModalOpen(false);
            }}>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Full Name</label>
                <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 transition-colors" placeholder="e.g. Abdullah Ahmed" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
                <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 transition-colors" placeholder="email@company.com" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Role</label>
                <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 transition-colors appearance-none">
                  <option value="admin" className="bg-surface">Admin</option>
                  <option value="hr_manager" className="bg-surface">HR Manager</option>
                  <option value="payroll_manager" className="bg-surface">Payroll Manager</option>
                  <option value="accountant" className="bg-surface">Accountant</option>
                  <option value="viewer" className="bg-surface">Viewer</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
