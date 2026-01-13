"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { resetPassword } from "@/actions/auth";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const passwordRequirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const isPasswordStrong = Object.values(passwordRequirements).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!isPasswordStrong) {
      setError("Password does not meet requirements.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const result = await resetPassword(token, password);
      if (result.success) {
        setMessage(result.data?.message || "Password reset successfully!");
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setError(result.error || "Failed to reset password.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest">
          Invalid or expired reset link.
        </div>
        <Link href="/forgot-password" title="Request a new link" className="text-brand-via font-black uppercase tracking-widest text-[10px] border-b-2 border-brand-via">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
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
        <label htmlFor="password" className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
          New Password
        </label>
        <div className="relative group">
          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="appearance-none block w-full pl-12 pr-12 py-4 border-2 border-zinc-50 dark:border-zinc-800 rounded-2xl shadow-sm placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-brand-via bg-zinc-50/50 dark:bg-zinc-950 dark:text-zinc-100 text-sm transition-all font-bold"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-brand-via transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        
        {password && !isPasswordStrong && (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            <li className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${passwordRequirements.length ? 'text-emerald-500' : 'text-zinc-400'}`}>
              <div className={`w-1 h-1 rounded-full ${passwordRequirements.length ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
              8+ Characters
            </li>
            <li className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${passwordRequirements.uppercase ? 'text-emerald-500' : 'text-zinc-400'}`}>
              <div className={`w-1 h-1 rounded-full ${passwordRequirements.uppercase ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
              One Uppercase
            </li>
            <li className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${passwordRequirements.lowercase ? 'text-emerald-500' : 'text-zinc-400'}`}>
              <div className={`w-1 h-1 rounded-full ${passwordRequirements.lowercase ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
              One Lowercase
            </li>
            <li className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${passwordRequirements.number ? 'text-emerald-500' : 'text-zinc-400'}`}>
              <div className={`w-1 h-1 rounded-full ${passwordRequirements.number ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
              One Number
            </li>
            <li className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${passwordRequirements.special ? 'text-emerald-500' : 'text-zinc-400'}`}>
              <div className={`w-1 h-1 rounded-full ${passwordRequirements.special ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
              One Special
            </li>
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
          Confirm Password
        </label>
        <div className="relative group">
          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="appearance-none block w-full pl-12 pr-5 py-4 border-2 border-zinc-50 dark:border-zinc-800 rounded-2xl shadow-sm placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-brand-via bg-zinc-50/50 dark:bg-zinc-950 dark:text-zinc-100 text-sm transition-all font-bold"
            placeholder="••••••••"
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
            Resetting...
          </>
        ) : (
          <>
            Update Password
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordClient() {
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
              width={56}
              height={56}
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
          New Password
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest">
          Secure your account with a new password
        </p>
      </div>

      <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl py-12 px-6 shadow-2xl shadow-black/5 rounded-[32px] sm:rounded-[40px] sm:px-12 border border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <ResetPasswordContent />
        </div>
      </div>
    </div>
  );
}