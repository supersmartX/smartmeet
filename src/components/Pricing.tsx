"use client"

import { useState } from "react"
import Button from "./Button"
import { createCheckoutSession } from "@/actions/stripe"

const plans = [
  {
    name: "Beta Free",
    price: "$0",
    priceId: "", // No price ID for free
    description: "Experience the core pipeline during our beta period.",
    features: [
      "10 recordings per month",
      "Standard AI Transcription",
      "Basic Summary generation",
      "Python code generation",
      "Export to .py and .txt",
    ],
    cta: "Current Plan",
    variant: "secondary" as const,
  },
  {
    name: "Beta Pro",
    price: "$9",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_BETA_PRO_ID",
    period: "/month",
    description: "Full power for early adopters. 50% off for life.",
    features: [
      "1,000 recordings per month",
      "Advanced AI Pipeline (GPT-4/Claude)",
      "Comprehensive Project Documentation",
      "Automated Test generation",
      "Priority AI processing",
      "Custom API Key integration",
    ],
    cta: "Upgrade to Pro",
    variant: "primary" as const,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceId: "", 
    description: "Tailored solutions for large engineering teams.",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Shared recording workspace",
      "On-premise deployment options",
      "SLA & Dedicated support",
    ],
    cta: "Contact Sales",
    variant: "secondary" as const,
  },
]

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (priceId: string) => {
    if (!priceId) return;
    setLoading(priceId);
    try {
      const { url } = await createCheckoutSession(priceId);
      window.location.href = url;
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("Failed to initiate checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <section id="pricing" className="py-24 sm:py-32 bg-white dark:bg-black relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-primary/10 border border-brand-primary/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary mb-6">
            Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 mb-6">
            Beta Launch <span className="text-transparent bg-clip-text bg-brand-gradient">Early Access</span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
            Join our beta and get exclusive early-bird pricing. Help us shape the future of AI meeting intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4 sm:px-0">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col group ${
                plan.popular
                  ? "bg-zinc-900 dark:bg-zinc-900 border-zinc-800 dark:border-zinc-800 shadow-2xl md:scale-105 z-10"
                  : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-brand-via/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-gradient text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-glow">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className={`text-sm font-black uppercase tracking-[0.2em] mb-4 ${
                  plan.popular ? "text-brand-via" : "text-zinc-400"
                }`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className={`text-5xl font-black tracking-tight ${
                    plan.popular ? "text-white" : "text-zinc-900 dark:text-zinc-100"
                  }`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={plan.popular ? "text-zinc-500" : "text-zinc-400"}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className={`text-sm font-medium leading-relaxed ${
                  plan.popular ? "text-zinc-400" : "text-zinc-500"
                }`}>
                  {plan.description}
                </p>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 group/item">
                    <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      plan.popular ? "bg-brand-primary/20 text-brand-primary" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
                    }`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className={`text-sm font-medium ${
                      plan.popular ? "text-zinc-300" : "text-zinc-600 dark:text-zinc-400"
                    }`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                variant={plan.variant}
                fullWidth
                onClick={() => handleUpgrade(plan.priceId)}
                loading={loading === plan.priceId}
                disabled={!plan.priceId || (plan.name === "Beta Free")}
                className={plan.popular ? "bg-white text-black hover:bg-zinc-200" : ""}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
