"use client"
import { Mic, Cpu, FileCode2, ArrowRight } from "lucide-react"

export default function HowItWorks() {
  const steps = [
    {
      icon: Mic,
      title: "Record or Upload",
      description: "Start a live recording of your meeting or upload an existing audio file. Our system handles multiple formats with crystal clear precision.",
      color: "blue"
    },
    {
      icon: Cpu,
      title: "AI Neural Processing",
      description: "Our pipeline transcribes audio, identifies speakers, and extracts key context using state-of-the-art LLMs like GPT-4o and Claude 3.5.",
      color: "purple"
    },
    {
      icon: FileCode2,
      title: "Generate Assets",
      description: "Instantly receive a structured summary, project documentation, and production-ready code modules based on your discussion.",
      color: "pink"
    }
  ]

  return (
    <section className="py-24 sm:py-32 bg-white dark:bg-black relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 mb-6">
            The Process
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 mb-6">
            From Voice to <span className="text-transparent bg-clip-text bg-brand-gradient">Clear Action</span> in Minutes
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
            We've simplified the bridge between verbal discussions and concrete project results.
          </p>
        </div>

        <div className="relative">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-100 dark:bg-zinc-900 -translate-y-1/2 hidden lg:block -z-10" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative">
            {steps.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center group">
                <div className={`w-20 h-20 rounded-[2.5rem] bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 flex items-center justify-center mb-8 relative transition-all duration-500 group-hover:scale-110 group-hover:border-brand-via/50 shadow-xl shadow-black/5`}>
                  <step.icon className="w-8 h-8 text-brand-via" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-brand-gradient text-white text-[10px] font-black flex items-center justify-center shadow-glow">
                    0{i + 1}
                  </div>
                </div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-4 uppercase tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-xs">
                  {step.description}
                </p>
                
                {i < steps.length - 1 && (
                  <div className="mt-8 lg:hidden">
                    <ArrowRight className="w-6 h-6 text-zinc-300 dark:text-zinc-800 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
