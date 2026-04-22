"use client";

import SettlementModal from "@/components/erp/settlement/SettlementModal";
import { useRouter } from "next/navigation";

export default function CalculatorFullPage() {
  const router = useRouter();
  // Using the exact same component logic to render as a full page.
  // Instead of an overlay, we strip the fixed background or just let it render full. The component has a backdrop but we can just use the component.
  // Since SettlementModal has `fixed inset-0`, it acts as a full page anyway even if rendered here.
  
  return (
    <div className="w-full h-full relative">
      <SettlementModal onClose={() => router.push('/exit-settlement')} onSuccess={() => router.push('/exit-settlement')} />
    </div>
  );
}
