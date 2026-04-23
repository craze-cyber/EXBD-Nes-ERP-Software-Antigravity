"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { insforge } from "@/lib/insforge";
import type { PayrollColumnMap } from "@/lib/universal-parser";
import {
  Building2,
  ArrowLeft,
  Users,
  Receipt,
  Upload,
  ShieldCheck,
  Hash,
  Landmark,
  CreditCard,
  Loader2,
  Clock,
  Package,
  DollarSign,
  ArrowUpRight,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [isSaving, setIsSaving] = useState(false);

  // Payroll template mapper state
  const [sampleHeaders, setSampleHeaders] = useState<string[]>([]);
  const [draftMap, setDraftMap] = useState<PayrollColumnMap | null>(null);
  const [unmappedHeaders, setUnmappedHeaders] = useState<string[]>([]);
  const [isParsingTemplate, setIsParsingTemplate] = useState(false);
  const templateFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (clientId) fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    setIsLoading(true);

    // Fetch Client Details
    const { data: clientData, error: clientError } = await insforge.database
      .from("clients")
      .select("*, sponsors(name)")
      .eq("id", clientId)
      .single();

    if (clientError) {
      toast.error("Failed to load client details");
      router.push("/clients");
      return;
    }
    setClient(clientData);

    // Fetch Linked Workers
    const { data: workersData } = await insforge.database
      .from("workers")
      .select("*")
      .eq("client_id", clientId)
      .order("name_en", { ascending: true });

    setWorkers(workersData || []);
    setIsLoading(false);
  };

  const updateClient = async (field: string, value: any) => {
    setIsSaving(true);
    const { error } = await insforge.database
      .from("clients")
      .update({ [field]: value })
      .eq("id", clientId);

    if (error) {
      toast.error("Failed to update client");
    } else {
      toast.success(`Client ${field} updated`);
      fetchClientData();
    }
    setIsSaving(false);
  };

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...client.payroll_config, [key]: value };
    updateClient('payroll_config', newConfig);
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingTemplate(true);
    try {
      const buffer = await file.arrayBuffer();
      const [XLSX, { detectConfigFromWorkbook }] = await Promise.all([
        import("xlsx"),
        import("@/lib/universal-parser"),
      ]);
      const wb = XLSX.read(buffer, { raw: true });
      const { config, rawHeaders, unmapped } = detectConfigFromWorkbook(wb);
      setSampleHeaders(rawHeaders.filter(h => h !== ""));
      setDraftMap(config.column_map);
      setUnmappedHeaders(unmapped);
    } catch {
      toast.error("Failed to read file");
    } finally {
      setIsParsingTemplate(false);
      if (templateFileRef.current) templateFileRef.current.value = "";
    }
  };

  const saveTemplateConfig = async () => {
    if (!draftMap) return;
    setIsSaving(true);
    const existing = client.payroll_config || {};
    await updateClient("payroll_config", {
      ...existing,
      sheet_index: existing.sheet_index ?? 0,
      header_row:  existing.header_row  ?? 0,
      column_map: draftMap,
    });
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!client) return null;

  const MAPPING_FIELDS: { key: keyof PayrollColumnMap; label: string; required?: boolean }[] = [
    { key: "emp_id",       label: "Employee ID",           required: true },
    { key: "worker_name",  label: "Worker Name",           required: true },
    { key: "basic_salary", label: "Basic Salary",          required: true },
    { key: "net_salary",   label: "Net Salary",            required: true },
    { key: "working_days", label: "Working Days" },
    { key: "paid_days",    label: "Paid Days" },
    { key: "absent_days",  label: "Absent Days" },
    { key: "ot_hours",     label: "OT Hours" },
    { key: "ot_days",      label: "OT Days" },
    { key: "ot_amount",    label: "OT Amount" },
    { key: "deductions",   label: "Deductions" },
    { key: "position",     label: "Position / Designation" },
    { key: "vendor_name",  label: "Vendor Name" },
  ];

  const activeMappingMap: PayrollColumnMap | null = draftMap ?? client.payroll_config?.column_map ?? null;
  const mappingHeaders = sampleHeaders.length > 0
    ? sampleHeaders
    : activeMappingMap ? Object.values(activeMappingMap).filter(Boolean) as string[] : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </button>

      {/* Header Profile */}
      <div className="glass p-8 rounded-3xl relative overflow-hidden border-emerald-500/20">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-emerald-500">
          <Building2 className="w-64 h-64" />
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-4xl shrink-0">
            {client.legal_name?.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight uppercase">{client.legal_name}</h1>
              <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg border border-emerald-500/20 font-mono text-sm">
                {client.client_code}
              </span>
            </div>
            <p className="text-zinc-400 flex items-center gap-2 mb-6 text-sm">
              <Building2 className="w-4 h-4" /> Provider: <span className="text-white font-semibold">{client.sponsors?.name || "Unlinked"}</span>
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-6 py-4 bg-black/20 rounded-2xl border border-white/5">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-emerald-500"/> CR Number</p>
                <p className="font-mono text-sm font-medium">{client.cr_number}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5"><Hash className="w-3 h-3"/> VAT Number</p>
                <p className="font-mono text-sm font-medium">{client.vat_number || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5"><Landmark className="w-3 h-3"/> Bank</p>
                <p className="text-sm font-medium">{client.bank_name || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5"><CreditCard className="w-3 h-3"/> IBAN</p>
                <p className="font-mono text-[10px] font-medium bg-white/5 px-2 py-1 rounded break-all">{client.iban || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-white/5 px-2">
        {["Overview", "Workers", "Payroll Settings"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-bold transition-all relative ${
              activeTab === tab ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 animate-in slide-in-from-left-full duration-300" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
             <div className="glass p-8 rounded-3xl border border-white/5 bg-white/[0.01]">
                <h3 className="font-bold mb-4">Quick Insights</h3>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Active Headcount</p>
                      <p className="text-3xl font-bold">{workers.length}</p>
                   </div>
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Payroll Strategy</p>
                      <p className="text-2xl font-bold capitalize text-emerald-400">{client.payroll_type?.replace('_', ' ') || 'Attendance'}</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              Payroll History
            </h2>
            <div className="glass p-6 rounded-2xl border-white/5 text-center">
              <Receipt className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="font-bold mb-2">No Recent Dispatches</h3>
              <p className="text-sm text-zinc-500 mb-6 font-medium">Process a salary cycle to generate the ledger history.</p>
              <Link href="/payroll" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm shadow-lg shadow-emerald-500/20">
                <Upload className="w-4 h-4" /> UPLOAD PAYROLL SHEET
              </Link>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Workers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              Assigned Workers
              <span className="bg-white/10 text-xs px-2 py-1 rounded-full font-mono">{workers.length}</span>
            </h2>
            <Link href="/workers" className="text-xs text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest">
              Manage Workers →
            </Link>
          </div>
          <div className="glass p-1 rounded-3xl border border-white/5 overflow-hidden">
            {workers.length > 0 ? (
              <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/[0.03] sticky top-0 backdrop-blur-md">
                    <tr>
                      <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Name</th>
                      <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">ID / Iqama</th>
                      <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Profession</th>
                      <th className="px-6 py-4 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Work Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {workers.map((w: any) => (
                      <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-semibold">{w.name_en}</td>
                        <td className="px-6 py-4 font-mono text-zinc-400 text-xs">{w.iqama_no}</td>
                        <td className="px-6 py-4 text-zinc-500 font-medium">{w.occupation_en || w.designation || "—"}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${
                            w.work_status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-500 border-white/5'
                          }`}>
                            {w.work_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-24">
                <Users className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500 font-medium">No workers recorded for this client.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "Payroll Settings" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">

        {/* ── Column Template Mapper ─────────────────────────────────────── */}
        <div className="glass p-8 rounded-[32px] border border-white/10 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-1">Payroll Column Template</h3>
              <p className="text-sm text-zinc-400">
                Upload one sample sheet from this client. The system will auto-detect columns — confirm the mapping once, then every future upload processes automatically.
              </p>
            </div>
            {client.payroll_config?.column_map?.emp_id && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Template Saved
              </span>
            )}
          </div>

          {/* Upload trigger */}
          <input ref={templateFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleTemplateUpload} />
          <button
            onClick={() => templateFileRef.current?.click()}
            disabled={isParsingTemplate}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {isParsingTemplate
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <FileSpreadsheet className="w-4 h-4" />}
            {isParsingTemplate ? "Reading sheet…" : "Upload Sample Sheet"}
          </button>

          {/* Mapping table */}
          {activeMappingMap && (
            <div className="space-y-4">
              {unmappedHeaders.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Could not auto-map: <span className="font-mono">{unmappedHeaders.join(", ")}</span>. Assign them manually below.</span>
                </div>
              )}
              <div className="overflow-x-auto rounded-2xl border border-white/5">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left">System Field</th>
                      <th className="px-4 py-3 text-left">Sheet Column Header</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {MAPPING_FIELDS.map(({ key, label, required }) => {
                      const val = activeMappingMap[key] ?? "";
                      const isMapped = !!val;
                      return (
                        <tr key={key} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-medium text-zinc-300">
                            {label}{required && <span className="text-red-400 ml-1">*</span>}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={val}
                              onChange={(e) => setDraftMap({ ...activeMappingMap, [key]: e.target.value })}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-blue-500/50 [color-scheme:dark]"
                            >
                              <option value="">— not mapped —</option>
                              {mappingHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {isMapped
                              ? <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Mapped</span>
                              : required
                                ? <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">Required</span>
                                : <span className="text-[10px] text-zinc-600">Optional</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button
                onClick={saveTemplateConfig}
                disabled={isSaving || !activeMappingMap.emp_id || !activeMappingMap.worker_name || !activeMappingMap.net_salary}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl disabled:opacity-40 transition-all flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Column Template
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass p-8 rounded-[32px] border border-white/10 space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Payroll Calculation Engine</h3>
              <p className="text-sm text-zinc-400">Select how the system should process this client's workbooks.</p>
            </div>

            <div className="space-y-3">
              {[
                { id: "attendance", label: "Attendance Based", desc: "Standard salary based on daily attendance grid (e.g. First Cry format).", icon: <Clock className="w-5 h-5" /> },
                { id: "per_delivery", label: "Per Delivery", desc: "Calculated based on parcel volume (e.g. Dabdoob Logistics format).", icon: <Package className="w-5 h-5 text-emerald-500" /> },
                { id: "fixed_salary", label: "Fixed Salary", desc: "Simple fixed monthly salary regardless of activity records.", icon: <DollarSign className="w-5 h-5" /> }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => updateClient('payroll_type', type.id)}
                  className={`w-full p-4 rounded-2xl border transition-all text-left flex items-start gap-4 ${
                    client.payroll_type === type.id
                    ? "bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className={`p-4 rounded-xl ${client.payroll_type === type.id ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-zinc-500"}`}>
                    {type.icon}
                  </div>
                  <div>
                    <h4 className="font-bold tracking-tight">{type.label}</h4>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed font-medium">{type.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="glass p-8 rounded-[32px] border border-white/10 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-1">Calculation Rules</h3>
                <p className="text-sm text-zinc-400">Configure rates, VAT, and penalty logic.</p>
              </div>
              {isSaving && <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />}
            </div>

            {client.payroll_type === 'per_delivery' ? (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Internal Rate (SAR)</label>
                    <input
                      type="number"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 font-mono text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={client.payroll_config?.internal_rate_per_order || 0}
                      onChange={(e) => updateConfig('internal_rate_per_order', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Internal VAT (%)</label>
                    <input
                      type="number"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 font-mono text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={Math.round((client.payroll_config?.internal_vat_rate || 0) * 100)}
                      onChange={(e) => updateConfig('internal_vat_rate', Number(e.target.value) / 100)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">External Rate (SAR)</label>
                    <input
                      type="number"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 font-mono text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={client.payroll_config?.external_rate_per_order || 0}
                      onChange={(e) => updateConfig('external_rate_per_order', Number(e.target.value))}
                    />
                  </div>
                  <div className="bg-emerald-500/10 p-5 rounded-3xl border border-emerald-500/20 flex flex-col justify-center">
                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Effective Internal</p>
                    <p className="text-2xl font-black font-mono">
                      SAR {(Number(client.payroll_config?.internal_rate_per_order || 0) * (1 + (client.payroll_config?.internal_vat_rate || 0))).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-white/5">
                  <ConfigToggle
                    label="Count E&R as Order"
                    icon={<ArrowUpRight className="w-4 h-4" />}
                    enabled={client.payroll_config?.er_counts_as_order}
                    onChange={(val) => updateConfig('er_counts_as_order', val)}
                  />
                  <ConfigToggle
                    label="Auto Driver Mapping"
                    icon={<Users className="w-4 h-4" />}
                    enabled={client.payroll_config?.name_normalization}
                    onChange={(val) => updateConfig('name_normalization', val)}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <Receipt className="w-16 h-16 text-zinc-800" />
                <div>
                    <h4 className="font-bold">Standard Formula Active</h4>
                    <p className="text-zinc-500 text-xs mt-1 max-w-[280px] mx-auto leading-relaxed">
                    Rules for this engine are automatically derived from the uploaded sheet structure. No manual override required.
                    </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Advanced Individual Settings ─────────────────────────────── */}
        <div className="glass p-8 rounded-[32px] border border-white/10 space-y-6">
          <div>
            <h3 className="text-2xl font-bold mb-1">Advanced Parser Settings</h3>
            <p className="text-sm text-zinc-400">
              Individual overrides for how this client's payroll files are detected and processed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Parser Override</label>
              <select
                value={client.payroll_config?.parser_type || 'auto'}
                onChange={(e) => updateConfig('parser_type', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none [color-scheme:dark]"
              >
                <option value="auto">Auto Detect</option>
                <option value="universal">Universal (Custom Template)</option>
                <option value="keeta">Keeta Billing</option>
                <option value="dabdoob">Dabdoob Logistics</option>
              </select>
              <p className="text-[10px] text-zinc-600 px-1">Force a specific parser for every upload from this client.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Sheet Tab Index (0-based)</label>
              <input
                type="number"
                min={0}
                value={client.payroll_config?.sheet_index ?? 0}
                onChange={(e) => updateConfig('sheet_index', Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 font-mono text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <p className="text-[10px] text-zinc-600 px-1">Which sheet tab to read. 0 = first tab.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Header Row (0-based)</label>
              <input
                type="number"
                min={0}
                value={client.payroll_config?.header_row ?? 0}
                onChange={(e) => updateConfig('header_row', Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 font-mono text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <p className="text-[10px] text-zinc-600 px-1">Row index of the column header row. 0 = first row.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">VAT Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round((client.payroll_config?.vat_rate ?? 0.15) * 100)}
                onChange={(e) => updateConfig('vat_rate', Number(e.target.value) / 100)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 font-mono text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <p className="text-[10px] text-zinc-600 px-1">Applied to the invoice subtotal. Default: 15%.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Invoice Markup (%)</label>
              <input
                type="number"
                min={0}
                value={Math.round((client.payroll_config?.invoice_markup ?? 0) * 100)}
                onChange={(e) => updateConfig('invoice_markup', Number(e.target.value) / 100)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 font-mono text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <p className="text-[10px] text-zinc-600 px-1">Service charge added on top of payroll total. 0 = no markup.</p>
            </div>
          </div>
        </div>

        </div>
      )}
    </div>
  );
}

function ConfigToggle({ label, enabled, onChange, icon }: { label: string, enabled: boolean, onChange: (val: boolean) => void, icon?: any }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl border border-white/5 transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/5 rounded-lg text-zinc-500">{icon}</div>
        <span className="text-sm font-bold text-zinc-300">{label}</span>
      </div>
      <div className={`w-12 h-6 rounded-full p-1 transition-all ${enabled ? "bg-emerald-600" : "bg-zinc-800"}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-all ${enabled ? "translate-x-6" : ""}`} />
      </div>
    </button>
  );
}
