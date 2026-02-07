"use client"

import React, { useEffect, useState } from "react";
import { 
  Zap, 
  BarChart3, 
  Shield, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Database
} from "lucide-react";
import { makeApiRequest } from "@/services/api";

interface UsageData {
  plan: string;
  meetingUsage: {
    used: number;
    limit: number;
    dailyLimit: number;
    percentage: number;
  };
  tokenUsage: {
    used: number;
    limit: number;
    percentage: number;
  };
  features: string[];
  limits: {
    maxFileSizeMb: number;
  };
}

export function UsageDashboard() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await makeApiRequest<UsageData>("/api/v1/usage");
        if (response.success && response.data) {
          setUsage(response.data);
        } else {
          setError(response.error?.message || "Failed to load usage data");
        }
      } catch (err) {
        console.error("[USAGE_FETCH_ERROR]", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-zinc-200 border-t-brand-via animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Loading Usage Data...</p>
        </div>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="p-8 rounded-[2rem] border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/10 flex flex-col items-center text-center gap-4">
        <AlertTriangle className="w-10 h-10 text-red-500" />
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-red-600">Error Loading Dashboard</h3>
          <p className="text-xs font-bold text-red-500/80 uppercase tracking-tight mt-1">{error || "Could not retrieve usage metrics"}</p>
        </div>
      </div>
    );
  }

  const isNearingLimit = usage.meetingUsage.percentage > 80;
  const isAtLimit = usage.meetingUsage.percentage >= 100;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Plan Status Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-[2.5rem] bg-zinc-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-via/20 blur-[100px] -mr-32 -mt-32" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-brand-via text-[10px] font-black uppercase tracking-widest">
              {usage.plan} Plan
            </span>
            {usage.plan === "FREE" && (
              <button className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                Upgrade <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <h2 className="text-3xl font-black tracking-tighter uppercase">Usage & Quotas</h2>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Monitor your plan consumption in real-time</p>
        </div>
        
        <div className="relative z-10 flex gap-4">
          <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Status</p>
            <div className="flex items-center gap-2 text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-black uppercase tracking-widest">Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Meeting Quota Card */}
        <div className="lg:col-span-2 space-y-8">
          <section className="p-8 rounded-[2rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-brand-via/10 flex items-center justify-center text-brand-via">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Meeting Quota</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Total recordings this cycle</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{usage.meetingUsage.used} / {usage.meetingUsage.limit}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Meetings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
                <span className="text-zinc-400">Consumption Progress</span>
                <span className={isAtLimit ? "text-red-500" : isNearingLimit ? "text-amber-500" : "text-brand-via"}>
                  {Math.round(usage.meetingUsage.percentage)}%
                </span>
              </div>
              <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden p-1 border border-zinc-200 dark:border-zinc-700">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    isAtLimit ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : 
                    isNearingLimit ? "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" : 
                    "bg-brand-gradient shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  }`}
                  style={{ width: `${usage.meetingUsage.percentage}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Daily Limit</p>
                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{usage.meetingUsage.dailyLimit} <span className="text-[10px] text-zinc-500">/ Day</span></p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Max File Size</p>
                  <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{usage.limits.maxFileSizeMb} <span className="text-[10px] text-zinc-500">MB</span></p>
                </div>
              </div>
            </div>
          </section>

          {/* AI Token Usage Card */}
          <section className="p-8 rounded-[2rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">AI Intelligence Tokens</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">GPT-4o & Claude 3.5 credits</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">{usage.tokenUsage.used.toLocaleString()} <span className="text-[10px] text-zinc-400">/ {usage.tokenUsage.limit.toLocaleString()}</span></p>
              </div>
            </div>
            
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${usage.tokenUsage.percentage}%` }}
              />
            </div>
            
            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight leading-relaxed">
              Tokens are consumed during transcription, summarization, and code generation. PRO and ENTERPRISE plans include significantly higher token caps for advanced reasoning.
            </p>
          </section>
        </div>

        {/* Features Card */}
        <section className="p-8 rounded-[2rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm h-full">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Plan Entitlements</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Features unlocked on {usage.plan}</p>
            </div>
          </div>

          <div className="space-y-4">
            {usage.features.map((feature) => (
              <div key={feature} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 group hover:border-brand-via transition-colors">
                <div className="flex items-center gap-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
                    {feature.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Show locked features if on FREE */}
            {usage.plan === "FREE" && (
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                {['detailed_summary', 'code_generation', 'test_execution', 'rbac'].map((feature) => (
                  <div key={feature} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-100/50 dark:border-zinc-800/50 opacity-60 grayscale">
                    <div className="flex items-center gap-4">
                      <XCircle className="w-4 h-4 text-zinc-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        {feature.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
