import { insforge } from "@/lib/insforge";

export interface SettlementInput {
  worker: {
    id: string;
    basic_salary: number;
    joining_date?: string; // used if external isn't passed
  };
  exitType: string;
  joiningDate: Date;
  terminationDate: Date;
  leaveData: {
    annual_leave_balance: number;
  };
}

export async function calculateSettlement(input: SettlementInput) {
  const { worker, exitType, joiningDate, terminationDate, leaveData } = input;

  const msPerDay = 1000 * 60 * 60 * 24;
  const serviceDays = Math.max(0, Math.floor((terminationDate.getTime() - joiningDate.getTime()) / msPerDay));
  const serviceYears = serviceDays / 365.25;

  let eosb = 0;

  if (serviceYears >= 2 && serviceYears <= 5) {
    eosb = (worker.basic_salary * 0.5) * serviceYears;
  } else if (serviceYears > 5) {
    eosb = (worker.basic_salary * 1.0) * serviceYears;
  }

  if (exitType === 'resignation') {
    if (serviceYears >= 2 && serviceYears < 10) {
      eosb = eosb * (1.0 / 3.0);
    } // else full
  }

  const unusedLeaveDays = leaveData.annual_leave_balance || 0;
  const leaveEncashment = (worker.basic_salary / 30.0) * unusedLeaveDays;

  // Load active liabilities (unpaid)
  let totalLiabilityDeduction = 0;
  const { data: liabilities } = await insforge.database
    .from("worker_liabilities")
    .select("total_amount, recovered_amount")
    .eq("worker_id", worker.id)
    .eq("status", "active");

  if (liabilities && liabilities.length > 0) {
    totalLiabilityDeduction = liabilities.reduce((sum, lib) => {
      const remaining = (lib.total_amount || 0) - (lib.recovered_amount || 0);
      return sum + (remaining > 0 ? remaining : 0);
    }, 0);
  }

  return {
    serviceDays,
    serviceYears: parseFloat(serviceYears.toFixed(2)),
    eosb: parseFloat(eosb.toFixed(2)),
    leaveEncashment: parseFloat(leaveEncashment.toFixed(2)),
    totalLiabilityDeduction: parseFloat(totalLiabilityDeduction.toFixed(2))
  };
}
