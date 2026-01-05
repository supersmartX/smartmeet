"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { requestPasswordReset } from "@/actions/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const result = await requestPasswordReset(email);
      if (result.success) {
        setMessage(result.message || "Reset link sent to your email.");
      } else {
        setError(result.error || "Failed to request password reset.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col justify-center py-12 px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-from/10 dark:bg-brand-from/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-brand-to/10 dark:bg-brand-to/5 rounded-full blur-[120px] -z-10 animate-pulse delay-700" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <Link href="/" className="inline-flex items-center gap-3 mb-10 group">
          <div className="relative w-14 h-14 group-hover:rotate-6 transition-transform">
            <Image
              src="/logoX.png"
              alt="SupersmartX AI Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">SupersmartX</span>
            <span className="text-[10px] font-black text-brand-via uppercase tracking-[0.2em]">Audio-to-Code</span>
          </div>
        </Link>
        <h2 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-2">
          Reset Password
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest">
          Enter your email to receive a reset link
        </p>
      </div>

      <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl py-12 px-6 shadow-2xl shadow-black/5 rounded-[32px] sm:rounded-[40px] sm:px-12 border border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest">
                {message}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
                Email address
              </label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-12 pr-5 py-4 border-2 border-zinc-50 dark:border-zinc-800 rounded-2xl shadow-sm placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-brand-via bg-zinc-50/50 dark:bg-zinc-950 dark:text-zinc-100 text-sm transition-all font-bold"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !!message}
              className="w-full flex justify-center items-center gap-3 py-5 px-4 rounded-2xl shadow-glow text-xs font-black uppercase tracking-[0.2em] text-white bg-brand-gradient hover:scale-[1.02] active:scale-[0.98] focus:outline-none disabled:opacity-50 transition-all group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Send Reset Link
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="text-center pt-4">
              <Link href="/login" className="inline-flex items-center gap-2 text-[10px] font-black text-zinc-400 hover:text-brand-via uppercase tracking-widest transition-colors">
                <ArrowLeft className="w-3 h-3" />
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
