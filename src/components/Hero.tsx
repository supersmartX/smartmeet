"use client"
import Button from "@/components/Button"
import { PRODUCT_NAME, HEADLINE, SUBHEADLINE } from "@/config/marketing"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useExtensionDetection } from "@/hooks/useExtensionDetection"
import { 
  Mic, 
  MessageSquareText, 
  Sparkles, 
  Code2, 
  CheckCircle2, 
  ChevronRight,
  ArrowRight
} from "lucide-react"

export default function Hero() {
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"
  const { extensionUrl, browserName } = useExtensionDetection()
  
  const pipelineSteps = [
    { icon: Mic, label: "Capture", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { icon: MessageSquareText, label: "Transcription", color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
    { icon: Sparkles, label: "Analysis", color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { icon: Code2, label: "Decisions", color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20" },
    { icon: CheckCircle2, label: "Actions", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
  ]

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
              {PRODUCT_NAME} • AI MEETING INTELLIGENCE
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
                  target="_blank"
                  variant="primary"
                  className="w-full sm:w-auto"
                >
                  Add to {browserName}
                </Button>
              ) : null}
              <Button
                href={isAuthenticated ? "/dashboard" : "/login"}
                variant={extensionUrl && extensionUrl !== "#" ? "secondary" : "primary"}
                className="w-full sm:w-auto"
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
              </Button>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary via-brand-via to-brand-primary rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
              <div className="relative p-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl overflow-hidden">
                {/* Background Flow Animation */}
                <div className="absolute top-1/2 left-0 w-full h-px bg-zinc-100 dark:bg-zinc-800 -translate-y-1/2" />
                <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-via/50 to-transparent -translate-y-1/2 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />

                <div className="flex items-center justify-between mb-8 relative">
                  <div>
                    <h3 className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-[0.3em] mb-1">Processing Pipeline</h3>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Real-time Audio to Intelligence</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Live System</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 relative">
                  {pipelineSteps.map((step, i) => (
                    <div key={step.label} className="flex flex-col items-center gap-3 group/step">
                      <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${step.bg} ${step.border} border flex items-center justify-center transition-all duration-500 group-hover/step:scale-110 group-hover/step:shadow-lg group-hover/step:shadow-brand-via/10`}>
                        <step.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${step.color} transition-transform duration-500 group-hover/step:rotate-12`} />
                        
                        {/* Connecting Arrow (except last and on small screens) */}
                        {i < pipelineSteps.length - 1 && (
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden lg:block">
                            <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 animate-pulse" />
                          </div>
                        )}
                        
                        {/* Active Step Indicator */}
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/step:opacity-100 transition-opacity">
                          <div className={`w-1.5 h-1.5 rounded-full ${step.color.replace('text-', 'bg-')} animate-ping`} />
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight group-hover/step:text-brand-via transition-colors">{step.label}</p>
                        <div className="h-1 w-0 bg-brand-via mx-auto rounded-full group-hover/step:w-full transition-all duration-300" />
                      </div>
                    </div>
                  ))}
                </div>
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
              <div className="w-full h-full bg-zinc-50 dark:bg-zinc-900 flex flex-col items-center justify-center p-12 text-center gap-6">
                <div className="relative w-24 h-24 animate-bounce">
                  <Image
                    src="/logoX.png"
                    alt="SupersmartX Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">SupersmartX</span>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium max-w-xs">Transcribe, summarize, and extract actionable insights automatically.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-4">
                  <div className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                  <div className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                  <div className="h-24 col-span-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                </div>
              </div>
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
