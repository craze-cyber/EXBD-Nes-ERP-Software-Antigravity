"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { insforge } from "@/lib/insforge";
import DeliveryPayrollView from "@/components/erp/DeliveryPayrollView";
import { Button } from "@/components/ui/Button";
import { Loader2, ArrowLeft, Save, Printer, Download, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function DeliveryPayrollDetailPage() {
  const { clientId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const period = searchParams.get("period");
  const batchId = searchParams.get("batch");

  const [isLoading, setIsLoading] = useState(true);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (clientId && period) {
      fetchData();
    }
  }, [clientId, period]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch payroll records for this period
      const { data: records, error: pError } = await insforge.database
        .from("payroll")
        .select("*")
        .eq("client_id", clientId)
        .eq("pay_period", period);

      if (pError) throw pError;
      setPayrollData(records || []);

      // 2. Fetch all transactions for the analytics
      const { data: txs, error: tError } = await insforge.database
        .from("delivery_transactions")
        .select("*")
        .eq("client_id", clientId)
        .eq("pay_period", period);

      if (tError) throw tError;
      setTransactions(txs || []);

      // 3. Metadata for summary
      const { data: client } = await insforge.database
        .from("clients")
        .select("legal_name, client_code")
        .eq("id", clientId)
        .single();

      setSummary({ client, period });

    } catch (err: any) {
      toast.error("Failed to load delivery data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        <p className="text-zinc-500 animate-pulse">Analyzing delivery records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Delivery Payroll Details</h1>
            <p className="text-zinc-400 mt-1">
              {summary?.client?.legal_name} • {period}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 rounded-2xl">
            <Share2 className="w-4 h-4" /> Export
          </Button>
          <Button variant="outline" className="gap-2 rounded-2xl">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-500 gap-2 rounded-2xl shadow-lg shadow-emerald-600/20">
            <Save className="w-4 h-4" /> Finalize Batch
          </Button>
        </div>
      </div>

      <DeliveryPayrollView
        payrollRecords={payrollData}
        transactions={transactions}
        summary={summary}
      />
    </div>
  );
}
