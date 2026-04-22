"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronDown, Plus, CircleDot, ExternalLink } from "lucide-react";
import Link from "next/link";

const TYPE_COLORS: Record<string, string> = {
  asset: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  liability: "bg-red-500/10 text-red-400 border-red-500/20",
  equity: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  revenue: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  expense: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  parent_id: string | null;
  description: string | null;
  is_active: boolean;
  children?: Account[];
  balance?: number;
}

interface AccountTreeProps {
  accounts: Account[];
  balances: Record<string, number>;
  onAddAccount: () => void;
}

function buildTree(accounts: Account[]): Account[] {
  const map = new Map<string, Account>();
  const roots: Account[] = [];

  accounts.forEach(a => map.set(a.id, { ...a, children: [] }));
  accounts.forEach(a => {
    const node = map.get(a.id)!;
    if (a.parent_id && map.has(a.parent_id)) {
      map.get(a.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots.sort((a, b) => a.code.localeCompare(b.code));
}

function AccountNode({ account, balances, depth = 0 }: { account: Account; balances: Record<string, number>; depth?: number }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = account.children && account.children.length > 0;
  const balance = balances[account.id] || 0;

  return (
    <div>
      <div
        className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] cursor-pointer`}
        style={{ paddingLeft: `${16 + depth * 24}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-5 h-5 flex items-center justify-center">
          {hasChildren ? (
            isOpen ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />
          ) : (
            <CircleDot className="w-3 h-3 text-zinc-600" />
          )}
        </div>

        <span className="font-mono text-xs text-zinc-500 w-14 shrink-0">{account.code}</span>
        <span className="text-sm font-medium text-white flex-1">{account.name}</span>

        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${TYPE_COLORS[account.type] || "bg-white/5 text-zinc-400 border-white/10"}`}>
          {account.type}
        </span>

        <span className={`font-mono text-sm w-32 text-right ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {balance !== 0 ? `SAR ${Math.abs(balance).toLocaleString("en", { minimumFractionDigits: 2 })}` : "—"}
        </span>

        <Link 
          href={`/accounting/ledger`}
          className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-all ml-2"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isOpen && hasChildren && (
        <div>
          {account.children!.map(child => (
            <AccountNode key={child.id} account={child} balances={balances} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountTree({ accounts, balances, onAddAccount }: AccountTreeProps) {
  const tree = buildTree(accounts);

  return (
    <div className="glass rounded-[24px] border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/5">
        <div className="flex items-center gap-6">
          <span className="text-[10px] uppercase font-bold text-zinc-500 w-20">Code</span>
          <span className="text-[10px] uppercase font-bold text-zinc-500 flex-1">Account Name</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-[10px] uppercase font-bold text-zinc-500">Type</span>
          <span className="text-[10px] uppercase font-bold text-zinc-500 w-32 text-right">Balance</span>
        </div>
      </div>

      {/* Tree */}
      <div className="max-h-[600px] overflow-y-auto">
        {tree.map(account => (
          <AccountNode key={account.id} account={account} balances={balances} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-white/5 bg-black/20">
        <button
          onClick={onAddAccount}
          className="text-xs text-emerald-400 font-bold flex items-center gap-1 hover:text-emerald-300 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add New Account
        </button>
      </div>
    </div>
  );
}
