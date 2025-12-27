"use client";

import { useState, useEffect } from "react";
import { signIn, getProviders, ClientSafeProvider } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, User, Key, ArrowRight, Loader2, Sparkles, Github, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { signUp } from "@/actions/auth";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    apiKey: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const passwordRequirements = {
    length: formData.password.length >= 8,
    number: /\d/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };

  const isPasswordStrong = passwordRequirements.length && passwordRequirements.number && passwordRequirements.special;
  
  const router = useRouter();

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders();
      setProviders(res);
    };
    fetchProviders();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (mode === "signup") {
        await signUp(formData);
        // After signup, sign in automatically
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
        if (result?.error) {
          setError("Account created, but failed to sign in automatically. Please sign in manually.");
          setMode("signin");
        } else {
          router.push("/dashboard");
        }
      } else {
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid email or password. Please try again.");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "An error occurred. Please try again.");
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
              alt="SupersmartX Logo"
              fill
              className="object-contain"
            />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">SupersmartX</span>
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
              <div 
                aria-live="polite"
                className="bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2"
              >
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
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none block w-full pl-12 pr-20 py-4 border-2 border-zinc-50 dark:border-zinc-800 rounded-2xl shadow-sm placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-brand-via bg-zinc-50/50 dark:bg-zinc-950 dark:text-zinc-100 text-sm transition-all font-bold"
                  placeholder="••••••••"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {formData.password && (
                    <div className="transition-all duration-300">
                      {isPasswordStrong ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in zoom-in" />
                      ) : (
                        <div className="flex gap-1">
                          <div className={`h-1 w-2 rounded-full transition-colors ${passwordRequirements.length ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                          <div className={`h-1 w-2 rounded-full transition-colors ${passwordRequirements.number ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                          <div className={`h-1 w-2 rounded-full transition-colors ${passwordRequirements.special ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-brand-via transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {mode === "signup" && formData.password && !isPasswordStrong && (
                <div className="px-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-300">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Requirements:</p>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <li className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${passwordRequirements.length ? 'text-emerald-500' : 'text-zinc-400'}`}>
                      <div className={`w-1 h-1 rounded-full ${passwordRequirements.length ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                      8+ Characters
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
                </div>
              )}
            </div>

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

          {/* Social Logins */}
          {providers && Object.values(providers).some(p => p.id !== "credentials") && (
            <div className="mt-8 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-zinc-100 dark:border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black">
                  <span className="px-4 bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600">Or continue with</span>
                </div>
              </div>

              <div className={`grid gap-4 ${Object.values(providers).filter(p => p.id !== "credentials").length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {providers.google && (
                  <button
                    onClick={() => signIn("google", { callbackUrl: `${window.location.origin}/dashboard` })}
                    className="flex items-center justify-center gap-3 py-4 px-4 rounded-2xl border-2 border-zinc-50 dark:border-zinc-800 hover:border-brand-via transition-all bg-zinc-50/50 dark:bg-zinc-950 group"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        className="text-[#4285F4]"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        className="text-[#34A853]"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        className="text-[#FBBC05]"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        className="text-[#EA4335]"
                      />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">Google</span>
                  </button>
                )}

                {providers.github && (
                  <button
                    onClick={() => signIn("github", { callbackUrl: `${window.location.origin}/dashboard` })}
                    className="flex items-center justify-center gap-3 py-4 px-4 rounded-2xl border-2 border-zinc-50 dark:border-zinc-800 hover:border-brand-via transition-all bg-zinc-50/50 dark:bg-zinc-950 group"
                  >
                    <Github className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">GitHub</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
