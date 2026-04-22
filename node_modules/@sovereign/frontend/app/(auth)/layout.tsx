import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">

      {/* Ambient background glows */}
      <div className="absolute top-[15%] left-[8%]  w-[500px] h-[500px] bg-primary/8  blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[15%] right-[8%] w-[400px] h-[400px] bg-accent/6  blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2  w-[300px] h-[300px] bg-primary/4  blur-[80px]  rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2" />

      <div className="w-full max-w-md relative z-10">
        <div className="glass p-8 rounded-3xl border border-white/10 shadow-2xl shadow-black/40">
          {children}
        </div>

        <p className="text-center text-zinc-600 text-[11px] mt-6 tracking-wide">
          &copy; {new Date().getFullYear()} EXBD Group Limited Company. All rights reserved.
        </p>
      </div>
    </div>
  );
}