"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, User, Key, ArrowRight, Loader2, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    apiKey: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const { login } = useAuth();
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const success = await login(formData.email, formData.password, formData.apiKey);
      if (success) {
        router.push("/dashboard");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } catch (err) {
      setError("An error occurred during authentication. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col justify-center py-12 px-6 lg:px-8 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-from/10 dark:bg-brand-from/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-brand-to/10 dark:bg-brand-to/5 rounded-full blur-[120px] -z-10 animate-pulse delay-700" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <Link href="/" className="inline-flex items-center gap-3 mb-10 group">
          <div className="relative w-14 h-14 group-hover:rotate-6 transition-transform">
            <Image
              src="/logoX.png"
              alt="Supersmart Logo"
              fill
              className="object-contain"
            />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Supersmart</span>
            <span className="text-[10px] font-black text-brand-via uppercase tracking-[0.2em] -mt-1">Audio-to-Code</span>
          </div>
        </Link>
        <h2 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-2">
          {mode === "signin" ? "Welcome Back" : "Start Building"}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest">
          {mode === "signin" ? (
            <>
              New to the platform?{" "}
              <button onClick={() => setMode("signup")} className="text-zinc-900 dark:text-zinc-100 hover:text-brand-via transition-colors border-b-2 border-brand-via">
                Create Account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("signin")} className="text-zinc-900 dark:text-zinc-100 hover:text-brand-via transition-colors border-b-2 border-brand-via">
                Sign In
              </button>
            </>
          )}
        </p>
      </div>

      <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl py-12 px-6 shadow-2xl shadow-black/5 sm:rounded-[40px] sm:px-12 border border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}
            
            {mode === "signup" && (
              <div className="space-y-2">
                <label htmlFor="name" className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
                  Full Name
                </label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={mode === "signup"}
                    value={formData.name}
                    onChange={handleInputChange}
                    className="appearance-none block w-full pl-12 pr-5 py-4 border-2 border-zinc-50 dark:border-zinc-800 rounded-2xl shadow-sm placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-brand-via bg-zinc-50/50 dark:bg-zinc-950 dark:text-zinc-100 text-sm transition-all font-bold"
                    placeholder="Ehsan Miller"
                  />
                </div>
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
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="appearance-none block w-full pl-12 pr-5 py-4 border-2 border-zinc-50 dark:border-zinc-800 rounded-2xl shadow-sm placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-brand-via bg-zinc-50/50 dark:bg-zinc-950 dark:text-zinc-100 text-sm transition-all font-bold"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none block w-full pl-12 pr-5 py-4 border-2 border-zinc-50 dark:border-zinc-800 rounded-2xl shadow-sm placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-brand-via bg-zinc-50/50 dark:bg-zinc-950 dark:text-zinc-100 text-sm transition-all font-bold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-2">
                <label htmlFor="apiKey" className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
                  API Key (Optional)
                </label>
                <div className="relative group">
                  <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
                  <input
                    id="apiKey"
                    name="apiKey"
                    type="text"
                    value={formData.apiKey}
                    onChange={handleInputChange}
                    className="appearance-none block w-full pl-12 pr-5 py-4 border-2 border-zinc-50 dark:border-zinc-800 rounded-2xl shadow-sm placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-brand-via bg-zinc-50/50 dark:bg-zinc-950 dark:text-zinc-100 text-sm transition-all font-bold"
                    placeholder="sk-..."
                  />
                </div>
                <p className="mt-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-bold italic px-1 uppercase tracking-tight">
                  Bring your own OpenAI/Anthropic key for custom workflows.
                </p>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-3 py-5 px-4 rounded-2xl shadow-glow text-xs font-black uppercase tracking-[0.2em] text-white bg-brand-gradient hover:scale-[1.02] active:scale-[0.98] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {mode === "signin" ? "Sign in to Dashboard" : "Create My Account"}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-10">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-zinc-100 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black">
                <span className="px-4 bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600">Demo Account</span>
              </div>
            </div>
            <div className="mt-6 text-center text-[11px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest italic opacity-60">
              Try with any email and password for this MVP demo.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
