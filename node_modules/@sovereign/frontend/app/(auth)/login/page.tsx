"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { auth } from "@/lib/auth";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";
import { Mail, Lock, Loader2, ShieldCheck } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  React.useEffect(() => {
    const checkUsers = async () => {
      const { data, error } = await insforge.database.rpc("check_first_user");
      setIsFirstUser(error ? false : data === true);
    };
    checkUsers();
  }, []);

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      if (isFirstUser) {
        const { data: signUpData, error: signUpError } = await auth.signUp({
          email: values.email,
          password: values.password,
          name: "System Master Admin",
        });
        if (signUpError) { toast.error(signUpError.message); return; }
        if (signUpData?.user) {
          const { error: dbError } = await insforge.database.from("erp_users").insert({
            auth_id: signUpData.user.id,
            full_name: "System Master Admin",
            email: values.email,
            role: "master_admin",
            is_active: true,
          });
          if (dbError) {
            toast.error("Account created but failed to assign role. Contact support.");
          } else {
            if (signUpData.accessToken) {
              document.cookie = `insforge-token=${signUpData.accessToken}; path=/; max-age=604800; SameSite=Lax`;
            }
            toast.success("Master account initialized. Welcome!");
            window.location.href = "/";
          }
        }
      } else {
        const { data, error } = await auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) {
          toast.error(error.message);
        } else if (data?.accessToken) {
          document.cookie = `insforge-token=${data.accessToken}; path=/; max-age=604800; SameSite=Lax`;
          toast.success("Welcome back!");
          window.location.href = "/";
        }
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-7">

      {/* Brand header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="relative w-[72px] h-[96px]">
            <Image
              src="/exbd-logo.png"
              alt="EXBD Group"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="gradient-text">EXBD Group</span>
          </h1>
          <p className="text-[13px] font-semibold text-zinc-400 tracking-wide uppercase">
            Sovereign ERP Engine
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            {isFirstUser === null
              ? "Checking system status…"
              : isFirstUser
              ? "No accounts detected. Initialize the first Master Admin."
              : "Sign in to access the management portal"}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Email Address
          </label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input
              {...register("email")}
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all placeholder:text-zinc-600"
            />
          </div>
          {errors.email && <p className="text-xs text-red-400 pl-1">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all placeholder:text-zinc-600"
            />
          </div>
          {errors.password && <p className="text-xs text-red-400 pl-1">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading || isFirstUser === null}
          className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 mt-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {isFirstUser ? "Initialize System" : "Sign In"}
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </>
          )}
        </button>
      </form>

      {/* Footer divider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/5" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-surface/80 px-3 flex items-center gap-1.5 text-[10px] text-zinc-600 uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3" />
            Secure Enterprise Access
          </span>
        </div>
      </div>
    </div>
  );
}