"use client";

interface Props {
  before: Record<string, any> | null;
  after: Record<string, any>;
  excludeFields?: string[];
  labelMap?: Record<string, string>;
}

const SKIP = ["id", "created_at", "updated_at", "__v", "created_by"];

function fmt(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function FieldDiffView({ before, after, excludeFields = [], labelMap = {} }: Props) {
  const skip = [...SKIP, ...excludeFields];
  const allKeys = Array.from(new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after),
  ])).filter(k => !skip.includes(k));

  const changed = allKeys.filter(k => fmt((before || {})[k]) !== fmt(after[k]));
  const unchanged = allKeys.filter(k => fmt((before || {})[k]) === fmt(after[k]));

  if (!before) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-green-400 font-medium mb-2">New record</p>
        {allKeys.map(k => (
          <div key={k} className="flex gap-2 text-xs py-1 border-b border-white/5">
            <span className="w-36 shrink-0 text-gray-500">{labelMap[k] ?? k.replace(/_/g, " ")}</span>
            <span className="text-green-300">+ {fmt(after[k])}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {changed.length === 0 && (
        <p className="text-xs text-gray-500 py-2">No field changes detected.</p>
      )}
      {changed.map(k => (
        <div key={k} className="text-xs py-1.5 border-b border-white/5">
          <div className="text-gray-400 mb-0.5">{labelMap[k] ?? k.replace(/_/g, " ")}</div>
          <div className="flex gap-3 pl-2">
            <span className="text-red-400 line-through flex-1 min-w-0 truncate">{fmt(before[k])}</span>
            <span className="text-gray-500">→</span>
            <span className="text-green-400 flex-1 min-w-0 truncate">{fmt(after[k])}</span>
          </div>
        </div>
      ))}
      {unchanged.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 select-none">
            {unchanged.length} unchanged fields
          </summary>
          <div className="mt-1 space-y-1">
            {unchanged.map(k => (
              <div key={k} className="flex gap-2 text-xs py-1 border-b border-white/5 opacity-40">
                <span className="w-36 shrink-0 text-gray-500">{labelMap[k] ?? k.replace(/_/g, " ")}</span>
                <span className="text-gray-400">{fmt(after[k])}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
