import React from 'react';
import { Settings2, Zap, ShieldCheck } from 'lucide-react';

export default function LogicCard({ clientSlug }: { clientSlug: string }) {
  const getLogicDescription = () => {
    switch(clientSlug) {
      case 'firstcry': return "Base salary calculated from Attendance Grid. Standard 12-hour shifts.";
      case 'dabdoob-logistics': return "Location-based logic: Flat rate for RUH/JED/MAK, delay penalties applied only for DMM drivers.";
      case 'dabdoob-manpower': return "Manpower hourly calculation with fixed deductions and location allowances.";
      case 'acc': return "Complex deduction logic with separate vendor billing cycles.";
      case 'noon-minutes': return "Order-based pay scale with minimum guarantee adjustments.";
      case 'noon-supermall': return "Delivery count based calculation with area multipliers.";
      case 'keeta': return "Standard shift + extra drops calculation with specific penalty logic.";
      case 'keemart': return "Base salary + performance-based variable pay.";
      case 'giftsgate': return "Fixed monthly salary with attendance pro-ration.";
      case 'delivery': return "Standard delivery agent calculation rules applied.";
      default: return "Standard payroll calculation rules apply.";
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden flex items-start gap-4">
      <div className="bg-indigo-500/20 p-3 rounded-xl border border-indigo-500/30">
        <Zap className="w-6 h-6 text-indigo-400" />
      </div>
      <div>
        <h4 className="text-white font-bold flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-indigo-400" />
          Active Engine Logic: {clientSlug.toUpperCase()}
        </h4>
        <p className="text-zinc-400 text-sm mt-1">{getLogicDescription()}</p>
        <div className="flex items-center gap-2 mt-3">
          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            VALIDATED
          </span>
          <span className="text-zinc-500 text-[10px]">Engine running latest ground-truth formulas</span>
        </div>
      </div>
    </div>
  );
}
