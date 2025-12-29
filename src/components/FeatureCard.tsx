type Props = { title: string; description: string; icon: string }

export default function FeatureCard({ title, description, icon }: Props) {
  return (
    <div className="group p-8 rounded-[2rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-brand-via/50 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-via/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gradient opacity-0 group-hover:opacity-5 blur-3xl transition-opacity" />
      
      <div className="w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-2xl mb-8 group-hover:scale-110 group-hover:bg-brand-via/10 transition-all duration-500">
        {icon}
      </div>
      
      <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 mb-4 uppercase">
        {title}
      </h3>
      
      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
        {description}
      </p>
      
      <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-brand-via uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
        Explore Feature
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>
    </div>
  )
}
