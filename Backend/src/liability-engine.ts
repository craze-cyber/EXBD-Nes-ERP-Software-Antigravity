import { insforge } from "@/lib/insforge";

export interface LiabilityDeduction {
  liability_id: string;
  liability_name: string;
  amount: number;
  remaining_after: number;
  recovery_method: string;
}

export interface DeductionResult {
  deductions: LiabilityDeduction[];
  total: number;
}

/**
 * Calculate all active liability deductions for a worker in a given payroll cycle.
 * Called automatically during payroll processing.
 */
export async function calculateLiabilityDeductions(
  workerId: string,
  netSalary: number,
  payPeriod: string
): Promise<DeductionResult> {
  const result: DeductionResult = { deductions: [], total: 0 };

  // 1. Fetch all ACTIVE liabilities for this worker
  const { data: liabilities } = await insforge.database
    .from("worker_liabilities")
    .select("*")
    .eq("worker_id", workerId)
    .eq("status", "active");

  if (!liabilities || liabilities.length === 0) return result;

  for (const lib of liabilities) {
    const remaining = (lib.total_amount || 0) - (lib.recovered_amount || 0);
    if (remaining <= 0) continue;

    let deduction = 0;

    if (lib.recovery_method === "fixed") {
      deduction = Math.min(lib.fixed_deduction || 0, remaining);
    } else if (lib.recovery_method === "percentage") {
      deduction = Math.round((netSalary * (lib.percentage_deduction || 0)) / 100 * 100) / 100;
      deduction = Math.min(deduction, remaining);
    }

    if (deduction <= 0) continue;

    const remainingAfter = remaining - deduction;

    result.deductions.push({
      liability_id: lib.id,
      liability_name: lib.liability_name,
      amount: deduction,
      remaining_after: remainingAfter,
      recovery_method: lib.recovery_method,
    });

    result.total += deduction;
  }

  return result;
}

/**
 * After payroll is saved, commit liability recovery records and update recovered_amount.
 */
export async function commitLiabilityRecoveries(
  deductions: LiabilityDeduction[],
  workerId: string,
  netSalary: number,
  payPeriod: string
): Promise<void> {
  for (const ded of deductions) {
    const remaining = ded.remaining_after + ded.amount; // remaining BEFORE deduction

    // Insert recovery record
    await insforge.database.from("liability_recoveries").insert([{
      liability_id: ded.liability_id,
      worker_id: workerId,
      pay_period: payPeriod,
      deducted_amount: ded.amount,
      recovery_method: ded.recovery_method,
      net_salary_at_time: netSalary,
      remaining_before: remaining,
      remaining_after: ded.remaining_after,
    }]);

    // We rely on the fetch-add-update sequence below since standard Supabase 
    // requires an RPC function for atomic increments but we don't have one defined yet.

    // Direct SQL update for atomic increment
    try {
      // Read current, add, write back
      const { data: current } = await insforge.database
        .from("worker_liabilities")
        .select("recovered_amount, total_amount")
        .eq("id", ded.liability_id)
        .single();

      if (current) {
        const newRecoveredTotal = (current.recovered_amount || 0) + ded.amount;
        const newStatus = newRecoveredTotal >= current.total_amount ? "fully_recovered" : "active";

        await insforge.database.from("worker_liabilities")
          .update({
            recovered_amount: newRecoveredTotal,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ded.liability_id);
      }
    } catch (e) {
      console.error("Failed to update liability recovery:", e);
    }
  }
}
