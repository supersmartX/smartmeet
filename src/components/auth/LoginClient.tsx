"use client";

import { useState, useEffect } from "react";
import { signIn, getProviders, ClientSafeProvider } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, User, Key, ArrowRight, Loader2, Github, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { signUp } from "@/actions/auth";

export default function LoginClient() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    apiKey: "",
    mfaToken: ""
  });
  const [mfaRequired, setMfaRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const passwordRequirements = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  };

  const isPasswordStrong = passwordRequirements.length && passwordRequirements.uppercase && passwordRequirements.lowercase && passwordRequirements.number && passwordRequirements.special;
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    
    console.log('🔍 Login error params:', { errorParam, errorDescription });
    
    if (errorParam === "OAuthAccountNotLinked") {
      setError("This email is already associated with another login method. Please sign in using your original method.");
    } else if (errorParam === "OAuthSigninFailed") {
      setError("OAuth signin failed. Please check your account and try again.");
    } else if (errorParam === "OAuthCallback") {
      setError("OAuth callback error. The authentication provider returned an error.");
    } else if (errorParam === "OAuthCreateAccount") {
      setError("Failed to create account during OAuth signin.");
    } else if (errorParam === "EmailCreateAccount") {
      setError("Failed to create account. Please try a different login method.");
    } else if (errorParam === "Callback") {
      setError("Callback route error. Please try again.");
    } else if (errorParam) {
      const detailedError = errorDescription 
        ? `Authentication error: ${errorParam} - ${errorDescription}`
        : `Authentication error: ${errorParam}`;
      setError(detailedError);
      console.error('🔍 Detailed OAuth error:', { errorParam, errorDescription });
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        console.log('🔍 Fetching auth providers...');
        const res = await getProviders();
        console.log('✅ Providers fetched:', res);
        setProviders(res);
      } catch (error) {
        console.error('❌ Failed to fetch providers:', error);
        setError('Failed to load authentication providers');
      }
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
        const signUpResult = await signUp(formData);
        
        if (!signUpResult.success) {
          setError(signUpResult.error || "Failed to create account");
          return;
        }

        // After signup, sign in automatically
      }

      const res = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        mfaToken: formData.mfaToken,
        redirect: true,
        callbackUrl: "/dashboard",
      });

      if (res?.error) {
        if (res.error === "MFA_REQUIRED") {
          setMfaRequired(true);
        } else {
          setError(res.error);
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthSignIn = (providerId: string) => {
    console.log(`🚀 Starting OAuth sign-in for provider: ${providerId}`);
    signIn(providerId, { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <Link href="/" className="inline-block group">
            <div className="w-16 h-16 bg-zinc-900 dark:bg-zinc-100 rounded-[28px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-2xl shadow-black/20">
              <Image 
                src="/logoX.png" 
                alt="Logo" 
                width={32} 
                height={32} 
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">
              {mfaRequired ? "Security Check" : mode === "signup" ? "Join SupersmartX" : "Welcome Back"}
            </h1>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
              {mfaRequired ? "Enter your 2FA code to continue" : "Advanced Meeting Intelligence Pipeline"}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{error}</p>
          </div>
        )}

        {/* Auth Form */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 p-8 rounded-[32px] shadow-xl shadow-black/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles className="w-12 h-12 text-zinc-400" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {mfaRequired ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">6-Digit Auth Code</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      name="mfaToken"
                      type="text"
                      required
                      placeholder="000000"
                      maxLength={6}
                      className="w-full h-14 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 text-sm font-bold tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {mode === "signup" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        name="name"
                        type="text"
                        required
                        placeholder="Steve Wozniak"
                        className="w-full h-14 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="steve@apple.com"
                      className="w-full h-14 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Password</label>
                    {mode === "signin" && (
                      <Link href="/forgot-password" className="text-[10px] font-black text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 uppercase tracking-widest transition-colors">
                        Forgot?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      className="w-full h-14 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-12 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === "signup" && formData.password && (
                  <div className="grid grid-cols-2 gap-2 p-4 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    {Object.entries({
                      "8+ Characters": passwordRequirements.length,
                      "Uppercase": passwordRequirements.uppercase,
                      "Lowercase": passwordRequirements.lowercase,
                      "Number": passwordRequirements.number,
                      "Special": passwordRequirements.special
                    }).map(([label, met]) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${met ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-800"}`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${met ? "text-emerald-500" : "text-zinc-400"}`}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting || (mode === "signup" && !isPasswordStrong)}
              className="w-full h-14 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mfaRequired ? "Verify Code" : mode === "signup" ? "Create Account" : "Secure Login"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {!mfaRequired && (
            <div className="mt-8 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-100 dark:border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                  <span className="bg-zinc-50 dark:bg-zinc-900/50 px-4 text-zinc-400">or connect with</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {providers && Object.values(providers).map((provider) => {
                  if (provider.id === "credentials") return null;
                  return (
                    <button
                      key={provider.id}
                      onClick={() => handleOAuthSignIn(provider.id)}
                      className="h-14 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center justify-center gap-3 group/oauth"
                    >
                      {provider.id === 'github' ? (
                        <Github className="w-4 h-4 group-hover/oauth:scale-110 transition-transform" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[8px] group-hover/oauth:scale-110 transition-transform">
                          {provider.name[0]}
                        </div>
                      )}
                      Continue with {provider.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Toggle */}
        <p className="text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          {mode === "signup" ? "Already have an account?" : "Don't have an account yet?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setError("");
              setMfaRequired(false);
            }}
            className="text-zinc-900 dark:text-zinc-100 hover:underline underline-offset-4"
          >
            {mode === "signup" ? "Sign In" : "Create One"}
          </button>
        </p>
      </div>
    </div>
  );
}

const Sparkles = ({ className }: { className?: string }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);