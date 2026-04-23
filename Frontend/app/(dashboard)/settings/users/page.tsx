"use client";

import React from "react";
import UserManagement from "@/components/erp/UserManagement";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function UserManagementPage() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!user || user.role !== "master_admin") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
        <p className="text-zinc-400 max-w-sm text-center">
          Only users with the <span className="text-red-400 font-mono">master_admin</span> role can manage system users.
        </p>
        <a
          href="/"
          className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm font-medium"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  return <UserManagement />;
}
