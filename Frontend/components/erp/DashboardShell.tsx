"use client";

import React, { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Image from "next/image";
import Sidebar from "./Sidebar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when viewport grows to desktop size
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">

      {/* ── Mobile backdrop overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      {/* Desktop: always visible (relative flow) | Mobile: slides in as overlay */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out",
          "lg:relative lg:translate-x-0 lg:z-auto lg:flex-shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Mobile top header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-surface/90 backdrop-blur-md flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative h-9 w-14">
            <Image
              src="/exbd-logo.png"
              alt="EXBD Group"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Right spacer keeps logo centred */}
          <div className="w-9" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto relative">
          <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </div>

          {/* Subtle ambient glow */}
          <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-primary/4 blur-[140px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="fixed bottom-0 left-1/2 w-[400px] h-[400px] bg-accent/3 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        </main>
      </div>
    </div>
  );
}