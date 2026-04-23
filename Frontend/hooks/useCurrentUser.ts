"use client";

import { useState, useEffect } from "react";
import { getSessionUser } from "@/lib/auth";

export function useCurrentUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessionUser().then(u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading, isMasterAdmin: user?.role === "master_admin" };
}
