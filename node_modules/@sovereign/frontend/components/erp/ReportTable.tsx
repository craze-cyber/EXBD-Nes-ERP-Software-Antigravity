"use client";

import React from "react";
import { Download } from "lucide-react";

interface ReportTableProps {
  title: string;
  columns: { key: string; label: string; align?: "left" | "right" | "center"; mono?: boolean }[];
  data: Record<string, any>[];
  totals?: Record<string, number>;
  onExport?: () => void;
}

export default function ReportTable({ title, columns, data, totals, onExport }: ReportTableProps) {
  return (
    <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
        {onExport && (
          <button onClick={onExport} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border border-white/5">
            <Download className="w-3 h-3" /> Export
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-white/[0.03] text-[10px] uppercase font-bold text-zinc-500 border-b border-white/5">
            <tr>
              {columns.map(col => (
                <th key={col.key} className={`px-5 py-3 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-white/[0.015] transition-colors">
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={`px-5 py-3 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${col.mono ? "font-mono" : ""} text-zinc-300`}
                  >
                    {row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot className="border-t-2 border-white/10 bg-white/[0.02]">
              <tr className="font-bold">
                {columns.map((col, i) => (
                  <td key={col.key} className={`px-5 py-3 ${col.align === "right" ? "text-right" : "text-left"} ${col.mono ? "font-mono" : ""} text-emerald-400`}>
                    {i === 0 ? "TOTAL" : totals[col.key] !== undefined ? totals[col.key].toLocaleString("en", { minimumFractionDigits: 2 }) : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
