"use client";

import React, { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import {
  CheckSquare, ScrollText, Building2, DollarSign, Bell, Lock,
  Loader2, Check, X, ChevronRight, Clock, User, AlertTriangle,
  RefreshCw, Filter, Download, Shield, Zap, Globe, Database,
  ToggleLeft, ToggleRight, Save, Hash, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { approveChange, rejectChange } from "@/lib/approval-engine";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { FieldDiffView } from "@/components/erp/FieldDiffView";

type Tab = "approval" | "audit" | "company" | "financial" | "notifications" | "security";

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "approval",      label: "Approval Queue",    icon: CheckSquare, desc: "Review pending changes" },
  { id: "audit",         label: "Audit Trail",        icon: ScrollText,  desc: "Immutable activity log" },
  { id: "company",       label: "Company",            icon: Building2,   desc: "Organisation details" },
  { id: "financial",     label: "Financial",          icon: DollarSign,  desc: "Rates and automation" },
  { id: "notifications", label: "Notifications",      icon: Bell,        desc: "Alert thresholds" },
  { id: "security",      label: "Security",           icon: Lock,        desc: "Session and access" },
];

const priorityStyle: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-400 border-red-500/20",
  high:   "bg-orange-500/10 text-orange-400 border-orange-500/20",
  normal: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  low:    "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const roleBadge: Record<string, string> = {
  master_admin:    "bg-red-500/10 text-red-400",
  admin:           "bg-blue-500/10 text-blue-400",
  hr_manager:      "bg-emerald-500/10 text-emerald-400",
  payroll_manager: "bg-purple-500/10 text-purple-400",
  accountant:      "bg-amber-500/10 text-amber-400",
  viewer:          "bg-zinc-500/10 text-zinc-400",
};

const auditResultStyle: Record<string, string> = {
  success:  "text-emerald-400 bg-emerald-500/10",
  failed:   "text-red-400 bg-red-500/10",
  pending:  "text-amber-400 bg-amber-500/10",
  rejected: "text-red-400 bg-red-500/10",
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleString();
}

// ─── Setting input components ────────────────────────────────────────────────

function SettingSection({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="py-6 border-b border-white/5 last:border-0">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
      </div>
      <div className="space-y-4 max-w-lg">{children}</div>
    </div>
  );
}

function SettingField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{label}</label>
      {hint && <p className="text-[10px] text-zinc-600 mt-0.5 mb-1.5">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function SettingInput({ value, onChange, type = "text", placeholder }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[var(--primary)]/50 focus:bg-white/[0.06] transition-all"
    />
  );
}

function SettingToggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-4 bg-white/[0.02] rounded-xl border border-white/5">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        {desc && <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${value ? "bg-[var(--primary)]" : "bg-white/10"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? "translate-x-6" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function SystemSettingsPage() {
  const { user } = useCurrentUser();
  const [tab, setTab] = useState<Tab>("approval");
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);

  // Reject state
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  // Audit filters
  const [auditModule, setAuditModule] = useState("all");
  const [auditResult, setAuditResult] = useState("all");

  // Settings local state
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (tab === "approval") {
      const { data } = await insforge.database
        .from("change_requests").select("*").eq("status", "pending").order("created_at", { ascending: false });
      setPendingRequests(data || []);
    } else if (tab === "audit") {
      let q = insforge.database.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
      if (auditModule !== "all") q = q.eq("module", auditModule);
      if (auditResult !== "all") q = q.eq("result", auditResult);
      const { data } = await q;
      setAuditLog(data || []);
    } else {
      const { data } = await insforge.database.from("system_settings").select("*");
      const map: Record<string, any> = {};
      (data || []).forEach((s: any) => { map[s.setting_key] = s.setting_value; });
      setSettings(map);
      setLocalSettings(map);
    }
    setLoading(false);
  }, [tab, auditModule, auditResult]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id: string) => {
    if (!user) return;
    const result = await approveChange(id, { id: user.id, name: user.full_name || user.email, role: user.role as any, email: user.email });
    if (result.success) { toast.success("Approved and applied"); loadData(); }
    else toast.error(result.message);
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim() || !user) return;
    setRejectLoading(true);
    await rejectChange(rejectId, { id: user.id, name: user.full_name || user.email, role: user.role as any }, rejectReason);
    toast.success("Request rejected");
    setRejectId(null);
    setRejectReason("");
    setRejectLoading(false);
    loadData();
  };

  const setSetting = (key: string, value: any) => {
    setLocalSettings(p => ({ ...p, [key]: value }));
    setSettingsDirty(true);
  };

  const saveAllSettings = async () => {
    setSavingSettings(true);
    const upserts = Object.entries(localSettings).map(([k, v]) => ({
      setting_key: k, setting_value: v, setting_group: "general",
    }));
    await insforge.database.from("system_settings").upsert(upserts, { onConflict: "setting_key" });
    toast.success("Settings saved");
    setSettingsDirty(false);
    setSavingSettings(false);
    setSettings(localSettings);
  };

  const str = (key: string, def = "") => {
    const v = localSettings[key];
    if (v === undefined || v === null) return def;
    return typeof v === "string" ? v.replace(/^"|"$/g, "") : String(v);
  };
  const bool = (key: string, def = false) => {
    const v = localSettings[key];
    if (v === undefined || v === null) return def;
    return v === true || v === "true";
  };
  const num = (key: string, def = "") => {
    const v = localSettings[key];
    if (v === undefined || v === null) return def;
    return String(v);
  };

  // Unique modules for audit filter
  const auditModules = Array.from(new Set(auditLog.map((a: any) => a.module).filter(Boolean)));

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Approval workflow, audit trail, and system configuration</p>
        </div>
        {settingsDirty && !["approval", "audit"].includes(tab) && (
          <button
            onClick={saveAllSettings}
            disabled={savingSettings}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-2xl overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              tab === t.id
                ? "bg-white/10 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
            {t.id === "approval" && pendingRequests.length > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-zinc-600">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <>
            {/* ── APPROVAL QUEUE ── */}
            {tab === "approval" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-white">Pending Approvals</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${pendingRequests.length > 0 ? "bg-red-500/15 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                      {pendingRequests.length} pending
                    </span>
                  </div>
                  <button onClick={loadData} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className="py-20 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-7 h-7 text-emerald-400" />
                    </div>
                    <p className="text-white font-semibold">All clear</p>
                    <p className="text-zinc-500 text-sm mt-1">No changes waiting for approval.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map(r => (
                      <div key={r.id} className="bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden">
                        {/* Card header */}
                        <div className="flex items-center justify-between gap-4 px-5 py-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${roleBadge[r.requester_role] || roleBadge.viewer}`}>
                                  {r.requester_role?.replace(/_/g, " ")}
                                </span>
                                <span className="text-sm font-semibold text-white">{r.requester_name}</span>
                                <span className="text-xs text-zinc-500">·</span>
                                <span className="text-xs font-mono text-[var(--accent)]">{r.action?.replace(/_/g, " ")}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                {r.record_label && <p className="text-xs text-zinc-400 truncate">{r.record_label}</p>}
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${priorityStyle[r.priority] || priorityStyle.normal}`}>
                                  {r.priority}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-zinc-600 hidden sm:block">{timeAgo(r.created_at)}</span>
                            <button
                              onClick={() => handleApprove(r.id)}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => { setRejectId(r.id); setRejectReason(""); }}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        </div>

                        {/* Diff section */}
                        {(r.before_data || r.after_data) && (
                          <div className="border-t border-white/5">
                            <button
                              onClick={() => setExpandedDiff(expandedDiff === r.id ? null : r.id)}
                              className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] transition-colors"
                            >
                              <span className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                {r.change_summary || "View field changes"}
                              </span>
                              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedDiff === r.id ? "rotate-90" : ""}`} />
                            </button>
                            {expandedDiff === r.id && (
                              <div className="px-5 pb-4">
                                <FieldDiffView before={r.before_data} after={r.after_data} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── AUDIT TRAIL ── */}
            {tab === "audit" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-base font-bold text-white">Audit Trail</h2>
                  <div className="flex items-center gap-2">
                    <select
                      value={auditModule}
                      onChange={e => setAuditModule(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none appearance-none"
                    >
                      <option value="all" className="bg-[#0e0e12]">All Modules</option>
                      {auditModules.map(m => <option key={m} value={m} className="bg-[#0e0e12]">{m}</option>)}
                    </select>
                    <select
                      value={auditResult}
                      onChange={e => setAuditResult(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none appearance-none"
                    >
                      <option value="all" className="bg-[#0e0e12]">All Results</option>
                      <option value="success" className="bg-[#0e0e12]">Success</option>
                      <option value="pending" className="bg-[#0e0e12]">Pending</option>
                      <option value="rejected" className="bg-[#0e0e12]">Rejected</option>
                      <option value="failed" className="bg-[#0e0e12]">Failed</option>
                    </select>
                    <button onClick={loadData} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-white/[0.02] border-b border-white/5">
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Time</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">User</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Action</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Module</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Record</th>
                          <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {auditLog.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-600">No audit records found.</td></tr>
                        ) : auditLog.map((a: any) => (
                          <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 font-mono text-zinc-600 text-[10px]">
                              <div>{new Date(a.created_at).toLocaleDateString()}</div>
                              <div>{new Date(a.created_at).toLocaleTimeString()}</div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-zinc-300">{a.user_name}</p>
                              <p className={`text-[9px] px-1.5 py-0.5 rounded mt-0.5 inline-block ${roleBadge[a.user_role] || ""}`}>
                                {a.user_role?.replace(/_/g, " ")}
                              </p>
                            </td>
                            <td className="px-4 py-3 font-mono text-[var(--accent)] text-[10px]">{a.action?.replace(/_/g, " ")}</td>
                            <td className="px-4 py-3 text-zinc-400 capitalize">{a.module}</td>
                            <td className="px-4 py-3 text-zinc-500 max-w-[180px] truncate">{a.record_label || "—"}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${auditResultStyle[a.result] || auditResultStyle.success}`}>
                                {a.result}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── COMPANY SETTINGS ── */}
            {tab === "company" && (
              <div className="space-y-0 divide-y divide-white/5 rounded-2xl border border-white/5 bg-white/[0.01] px-6">
                <SettingSection title="Organisation Identity" desc="These details appear on reports, invoices, and system documents.">
                  <SettingField label="Company Name">
                    <SettingInput value={str("company_name")} onChange={v => setSetting("company_name", JSON.stringify(v))} placeholder="EXBD Group" />
                  </SettingField>
                  <SettingField label="Commercial Registration (CR) Number">
                    <SettingInput value={str("company_cr_number")} onChange={v => setSetting("company_cr_number", JSON.stringify(v))} placeholder="1010000000" />
                  </SettingField>
                  <SettingField label="VAT Number">
                    <SettingInput value={str("company_vat_number")} onChange={v => setSetting("company_vat_number", JSON.stringify(v))} placeholder="300000000000003" />
                  </SettingField>
                </SettingSection>
                <SettingSection title="Location & Contact" desc="Registered address and contact information.">
                  <SettingField label="Registered Address">
                    <textarea
                      value={str("company_address")}
                      onChange={e => setSetting("company_address", JSON.stringify(e.target.value))}
                      placeholder="Riyadh, Saudi Arabia"
                      rows={3}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[var(--primary)]/50 resize-none transition-all"
                    />
                  </SettingField>
                  <SettingField label="Contact Email">
                    <SettingInput value={str("company_email")} onChange={v => setSetting("company_email", JSON.stringify(v))} placeholder="admin@company.com" />
                  </SettingField>
                  <SettingField label="Phone Number">
                    <SettingInput value={str("company_phone")} onChange={v => setSetting("company_phone", JSON.stringify(v))} placeholder="+966 11 000 0000" />
                  </SettingField>
                </SettingSection>
              </div>
            )}

            {/* ── FINANCIAL SETTINGS ── */}
            {tab === "financial" && (
              <div className="space-y-0 divide-y divide-white/5 rounded-2xl border border-white/5 bg-white/[0.01] px-6">
                <SettingSection title="Exchange Rates" desc="Used for currency conversions in payroll and reports.">
                  <SettingField label="SAR → BDT Rate" hint="Used for Bangladesh manpower salary conversions">
                    <SettingInput type="number" value={num("sar_to_bdt_rate", "32")} onChange={v => setSetting("sar_to_bdt_rate", parseFloat(v) || 0)} placeholder="32" />
                  </SettingField>
                </SettingSection>
                <SettingSection title="Tax & Contributions" desc="Applied automatically where relevant.">
                  <SettingField label="VAT Rate (%)" hint="Standard VAT for Saudi Arabia">
                    <SettingInput type="number" value={num("vat_rate", "15")} onChange={v => setSetting("vat_rate", parseFloat(v) || 0)} placeholder="15" />
                  </SettingField>
                  <SettingField label="GOSI Rate (%)">
                    <SettingInput type="number" value={num("gosi_rate", "10")} onChange={v => setSetting("gosi_rate", parseFloat(v) || 0)} placeholder="10" />
                  </SettingField>
                </SettingSection>
                <SettingSection title="Payroll Automation" desc="Controls automatic actions when payroll is saved.">
                  <SettingToggle
                    label="Auto-post journal on payroll save"
                    desc="Creates accounting entries automatically when payroll is saved"
                    value={bool("auto_journal_on_payroll")}
                    onChange={v => setSetting("auto_journal_on_payroll", v)}
                  />
                  <SettingToggle
                    label="Payroll requires approval"
                    desc="Non-admin users must request approval before payroll can be saved"
                    value={bool("payroll_approval_required", true)}
                    onChange={v => setSetting("payroll_approval_required", v)}
                  />
                </SettingSection>
              </div>
            )}

            {/* ── NOTIFICATION SETTINGS ── */}
            {tab === "notifications" && (
              <div className="space-y-0 divide-y divide-white/5 rounded-2xl border border-white/5 bg-white/[0.01] px-6">
                <SettingSection title="Document Expiry Alerts" desc="Days before expiry when alert notifications are triggered.">
                  {[
                    { key: "iqama_expiry_alert_days",      label: "Iqama Expiry",      placeholder: "90" },
                    { key: "passport_expiry_alert_days",   label: "Passport Expiry",   placeholder: "90" },
                    { key: "insurance_expiry_alert_days",  label: "Health Insurance",  placeholder: "30" },
                    { key: "license_expiry_alert_days",    label: "Driving License",   placeholder: "30" },
                    { key: "istimara_expiry_alert_days",   label: "Vehicle Istimara",  placeholder: "30" },
                    { key: "vehicle_ins_alert_days",       label: "Vehicle Insurance", placeholder: "30" },
                  ].map(({ key, label, placeholder }) => (
                    <SettingField key={key} label={`${label} (days before)`}>
                      <SettingInput type="number" value={num(key, placeholder)} onChange={v => setSetting(key, parseInt(v) || 30)} placeholder={placeholder} />
                    </SettingField>
                  ))}
                </SettingSection>
                <SettingSection title="System Notifications" desc="Control when system-level notifications are sent.">
                  <SettingToggle
                    label="New approval request"
                    desc="Notify master admin when any user submits a change for approval"
                    value={bool("notify_on_approval_request", true)}
                    onChange={v => setSetting("notify_on_approval_request", v)}
                  />
                  <SettingToggle
                    label="Approval decision"
                    desc="Notify requester when their change is approved or rejected"
                    value={bool("notify_on_approval_decision", true)}
                    onChange={v => setSetting("notify_on_approval_decision", v)}
                  />
                </SettingSection>
              </div>
            )}

            {/* ── SECURITY SETTINGS ── */}
            {tab === "security" && (
              <div className="space-y-0 divide-y divide-white/5 rounded-2xl border border-white/5 bg-white/[0.01] px-6">
                <SettingSection title="Session Management" desc="Controls how long users stay signed in.">
                  <SettingField label="Session Timeout (minutes)" hint="Users are signed out after this period of inactivity">
                    <SettingInput type="number" value={num("session_timeout_minutes", "60")} onChange={v => setSetting("session_timeout_minutes", parseInt(v))} placeholder="60" />
                  </SettingField>
                </SettingSection>
                <SettingSection title="Login Security" desc="Brute-force and credential policies.">
                  <SettingField label="Max Login Attempts" hint="Account is locked after this many failed attempts">
                    <SettingInput type="number" value={num("max_login_attempts", "5")} onChange={v => setSetting("max_login_attempts", parseInt(v))} placeholder="5" />
                  </SettingField>
                  <SettingField label="Password Expiry (days)" hint="Users must change password after this many days — set 0 to disable">
                    <SettingInput type="number" value={num("password_expiry_days", "0")} onChange={v => setSetting("password_expiry_days", parseInt(v))} placeholder="0" />
                  </SettingField>
                  <SettingField label="Account Lockout Duration (minutes)">
                    <SettingInput type="number" value={num("lockout_duration_minutes", "30")} onChange={v => setSetting("lockout_duration_minutes", parseInt(v))} placeholder="30" />
                  </SettingField>
                </SettingSection>
                <SettingSection title="Access Controls" desc="Additional restrictions on system access.">
                  <SettingToggle
                    label="Require master admin approval for new users"
                    desc="New user registrations need manual approval before they can log in"
                    value={bool("require_user_approval", true)}
                    onChange={v => setSetting("require_user_approval", v)}
                  />
                  <SettingToggle
                    label="Log all data access"
                    desc="Record every read operation in the audit trail (increases log volume)"
                    value={bool("log_read_access", false)}
                    onChange={v => setSetting("log_read_access", v)}
                  />
                </SettingSection>
              </div>
            )}
          </>
        )}
      </div>

      {/* Unsaved changes bar */}
      {settingsDirty && !["approval", "audit"].includes(tab) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-5 py-3 bg-[#16161a] border border-[var(--primary)]/30 rounded-2xl shadow-2xl">
          <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
          <span className="text-sm text-zinc-300 font-medium">You have unsaved changes</span>
          <button
            onClick={() => { setLocalSettings(settings); setSettingsDirty(false); }}
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Discard
          </button>
          <button
            onClick={saveAllSettings}
            disabled={savingSettings}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60"
          >
            {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Now
          </button>
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setRejectId(null)}>
          <div className="w-full max-w-sm bg-[#0e0e12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h3 className="text-base font-bold text-white">Reject Request</h3>
              <button onClick={() => setRejectId(null)} className="text-zinc-600 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-zinc-500">This reason will be sent to the requester as a notification.</p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Explain why this change is being rejected…"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-red-500/40 resize-none transition-all"
              />
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-white/8">
              <button onClick={() => setRejectId(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-zinc-400 text-sm font-medium hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {rejectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
