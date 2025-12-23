import FeatureCard from "@/components/FeatureCard"
import { FEATURES } from "@/config/marketing"

export default function Features() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-zinc-50/50 dark:bg-zinc-950/50 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-via/10 border border-brand-via/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-brand-via mb-6">
            Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 mb-6">
            Supercharge Your <span className="text-transparent bg-clip-text bg-brand-gradient">Meeting Workflow</span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
            Plan smarter agendas, capture decisions, and turn meetings into actions.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} title={f.title} description={f.description} icon={f.icon} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
