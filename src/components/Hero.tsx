"use client"
import Button from "@/components/Button"
import { PRODUCT_NAME, HEADLINE, SUBHEADLINE } from "@/config/marketing"
import { useState } from "react"
import Image from "next/image"
import { useAuth } from "@/context/AuthContext"
import { useExtensionDetection } from "@/hooks/useExtensionDetection"

export default function Hero() {
  const { isAuthenticated } = useAuth()
  const { extensionUrl, browserName } = useExtensionDetection()
  const [imgError, setImgError] = useState(false)
  
  return (
    <section className="relative pt-20 pb-16 sm:pt-32 sm:pb-24 overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-via/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-8 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 w-fit shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-brand-via animate-ping" />
              {PRODUCT_NAME} • AUDIO-TO-CODE PIPELINE
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] text-zinc-900 dark:text-zinc-100">
                {HEADLINE.split(' ').map((word, i) => (
                  <span key={i} className={i > 2 ? "text-transparent bg-clip-text bg-brand-gradient" : ""}>
                    {word}{" "}
                  </span>
                ))}
              </h1>
              <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                {SUBHEADLINE}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {extensionUrl && extensionUrl !== "#" ? (
                <Button
                  href={extensionUrl}
                  variant="primary"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto h-14 px-8 text-xs font-black uppercase tracking-widest rounded-2xl bg-brand-gradient shadow-glow hover:scale-105 transition-all"
                >
                  Add to {browserName}
                </Button>
              ) : null}
              <Button
                href={isAuthenticated ? "/dashboard" : "/login"}
                variant={extensionUrl && extensionUrl !== "#" ? "secondary" : "primary"}
                className={`w-full sm:w-auto h-14 px-8 text-xs font-black uppercase tracking-widest rounded-2xl border-2 transition-all ${
                  extensionUrl && extensionUrl !== "#" 
                    ? "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900" 
                    : "bg-brand-gradient text-white border-transparent shadow-glow hover:scale-105"
                }`}
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
              </Button>
            </div>

            <div className="p-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Live Processing Pipeline</p>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm overflow-x-auto pb-2 custom-scrollbar gap-4">
                {[
                  { icon: "🎤", label: "Audio", color: "from-blue-500" },
                  { icon: "🗣️", label: "STT", color: "from-indigo-500" },
                  { icon: "📝", label: "Summary", color: "from-purple-500" },
                  { icon: "💻", label: "Code", color: "from-pink-500" },
                  { icon: "✅", label: "Test", color: "from-emerald-500" }
                ].map((item, i, arr) => (
                  <div key={item.label} className="flex items-center gap-4 shrink-0">
                    <div className="flex flex-col items-center gap-2 group">
                      <div className={`w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform`}>
                        {item.icon}
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{item.label}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="h-[2px] w-8 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              {[
                "No credit card required",
                "GDPR & SOC2 Compliant",
                "Open Source Engine"
              ].map((text) => (
                <div key={text} className="flex items-center gap-2 text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="relative lg:block hidden">
            <div className="absolute -inset-4 bg-brand-gradient opacity-20 blur-3xl rounded-[4rem] animate-pulse" />
            <div className="relative bg-white dark:bg-zinc-950 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden aspect-[4/3] group">
              {!imgError ? (
                <Image
                  src="/dashboard-preview.png"
                  alt="Smartmeet Dashboard"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={() => setImgError(true)}
                  priority
                />
              ) : (
                <div className="w-full h-full bg-zinc-50 dark:bg-zinc-900 flex flex-col items-center justify-center p-12 text-center gap-6">
                  <div className="relative w-24 h-24 animate-bounce">
                    <Image
                      src="/logoX.png"
                      alt="Smartmeet Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">AI Meeting Intelligence</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium max-w-xs">Transcribe, summarize, and extract actionable insights automatically.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-4">
                    <div className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                    <div className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                    <div className="h-24 col-span-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                  </div>
                </div>
              )}
              {/* Overlay elements for more "expert" look */}
              <div className="absolute top-6 right-6 p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur shadow-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-right-8 duration-1000">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-black">AI</div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Analysis Status</p>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">98.4% Accuracy</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
