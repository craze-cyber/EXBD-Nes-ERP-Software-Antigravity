"use client";

import { useState } from "react";
import { toast } from "sonner";
import { requestChange, type ChangeRequest, type ApprovalResult } from "@/lib/approval-engine";
import { useCurrentUser } from "./useCurrentUser";

type Status = "idle" | "submitting" | "executed" | "pending" | "error" | "forbidden";

export function useApprovalAction() {
  const { user } = useCurrentUser();
  const [status, setStatus] = useState<Status>("idle");
  const [lastResult, setLastResult] = useState<ApprovalResult | null>(null);

  const submitChange = async (
    params: Omit<ChangeRequest, "requestedBy">
  ): Promise<ApprovalResult | null> => {
    if (!user) {
      toast.error("You must be signed in to make changes.");
      return null;
    }

    setStatus("submitting");
    try {
      const result = await requestChange({
        ...params,
        requestedBy: {
          id: user.id,
          name: user.full_name || user.email,
          role: user.role as any,
          email: user.email,
        },
      });

      setLastResult(result);

      if (result.status === "executed") {
        setStatus("executed");
        toast.success("Change applied successfully.");
      } else if (result.status === "pending") {
        setStatus("pending");
        toast.info("Submitted for approval", {
          description: "You will be notified once Master Admin reviews this.",
          duration: 5000,
        });
      } else if (result.status === "forbidden") {
        setStatus("forbidden");
        toast.error(result.message);
      }

      return result;
    } catch (e: any) {
      setStatus("error");
      toast.error(e.message || "An unexpected error occurred.");
      return null;
    }
  };

  const isMasterAdmin = user?.role === "master_admin";
  const saveLabel = isMasterAdmin ? "Save Changes" : "Submit for Approval";
  const isPending = status === "submitting";

  return { submitChange, status, lastResult, saveLabel, isPending, isMasterAdmin };
}
