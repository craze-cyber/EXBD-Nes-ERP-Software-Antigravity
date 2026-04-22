"use client";

import React, { useState } from "react";
import DailyExpenses from "@/components/erp/expenses/DailyExpenses";
import CompanyMonthly from "@/components/erp/expenses/CompanyMonthly";
import GovernmentMonthly from "@/components/erp/expenses/GovernmentMonthly";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { PieChart } from "lucide-react";

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<"daily" | "company" | "government">("daily");

  const tabs = [
    { id: "daily", label: "Daily Expenses" },
    { id: "company", label: "Company Monthly" },
    { id: "government", label: "Government Monthly" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Management</h1>
          <p className="text-zinc-400 mt-2">Manage daily operations and monthly recurring expenses.</p>
        </div>
        <div>
          <Link href="/expenses/reports">
            <button className="px-4 py-2.5 border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-all flex items-center gap-2 text-white">
              <PieChart className="w-4 h-4" /> Reports
            </button>
          </Link>
        </div>
      </div>

      <div className="flex space-x-1 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`relative px-6 py-3 text-sm font-bold transition-colors ${
              activeTab === tab.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          {activeTab === "daily" && (
            <motion.div key="daily" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <DailyExpenses />
            </motion.div>
          )}
          {activeTab === "company" && (
            <motion.div key="company" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <CompanyMonthly />
            </motion.div>
          )}
          {activeTab === "government" && (
            <motion.div key="government" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <GovernmentMonthly />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
