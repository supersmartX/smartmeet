"use client"

import { useState } from "react"
import { CreditCard, Zap, ArrowRight } from "lucide-react"
import Button from "@/components/Button"
import { createPortalSession } from "@/actions/stripe"

interface BillingSectionProps {
  plan: string
  meetingQuota: number
  meetingsUsed: number
  stripeSubscriptionId?: string | null
}

export function BillingSection({ 
  plan, 
  meetingQuota, 
  meetingsUsed, 
  stripeSubscriptionId 
}: BillingSectionProps) {
  const [isPortalLoading, setIsPortalLoading] = useState(false)

  const handleManageBilling = async () => {
    setIsPortalLoading(true)
    try {
      const { url } = await createPortalSession()
      window.location.href = url
    } catch (error) {
      console.error("Portal error:", error)
      alert("Failed to open billing portal.")
    } finally {
      setIsPortalLoading(false)
    }
  }

  const usagePercentage = Math.min((meetingsUsed / meetingQuota) * 100, 100)

  return (
    <section className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-6 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">Plan & Billing</h3>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Manage your subscription and quotas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Current Plan</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-zinc-900 dark:text-zinc-100">{plan}</span>
                {plan === "PRO" && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest">Active</span>
                )}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Monthly Usage</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-zinc-900 dark:text-zinc-100">{meetingsUsed} / {meetingQuota}</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Meetings</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-zinc-500">Usage Progress</span>
              <span className={usagePercentage > 90 ? "text-red-500" : "text-brand-primary"}>{Math.round(usagePercentage)}%</span>
            </div>
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 rounded-full ${
                  usagePercentage > 90 ? "bg-red-500" : "bg-brand-gradient"
                }`}
                style={{ width: `${usagePercentage}%` }} 
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 min-w-[200px]">
          {stripeSubscriptionId ? (
            <Button
              variant="secondary"
              onClick={handleManageBilling}
              loading={isPortalLoading}
              className="group"
            >
              Manage Billing
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          ) : (
            <Button
              variant="primary"
              href="/#pricing"
              className="group"
            >
              Upgrade to Pro
              <Zap className="w-4 h-4 ml-2 fill-current" />
            </Button>
          )}
          <p className="text-[9px] font-bold text-zinc-400 text-center uppercase tracking-widest leading-relaxed">
            Secure payments via Stripe. <br />Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  )
}
