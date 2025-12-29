"use client"

import { Plus, ExternalLink, Slack, Video, Calendar, Database } from "lucide-react"

const integrationCategories = [
  { id: 'video', name: 'Video Conferencing', icon: Video },
  { id: 'communication', name: 'Communication', icon: Slack },
  { id: 'calendar', name: 'Calendar', icon: Calendar },
  { id: 'storage', name: 'Storage', icon: Database },
]

export default function IntegrationsPage() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Integrations</h1>
            <span className="px-2 py-0.5 bg-brand-via/10 text-brand-via text-[10px] font-black uppercase tracking-widest rounded-md">Upcoming</span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            Connect your favorite tools to automate your meeting workflow.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
            Request App
          </button>
          <button className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed flex items-center gap-2">
            <Plus className="w-4 h-4" /> BROWSE MARKETPLACE
          </button>
        </div>
      </header>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {integrationCategories.map((cat) => (
          <button 
            key={cat.id}
            className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl flex items-center gap-2 hover:border-brand-via/30 transition-all group"
          >
            <cat.icon className="w-4 h-4 text-zinc-400 group-hover:text-brand-via transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Empty State / Coming Soon */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: 'Slack', desc: 'Sync summaries and action items to channels.', icon: Slack, status: 'Coming Soon' },
          { name: 'Zoom', desc: 'Auto-import recordings and transcripts.', icon: Video, status: 'Coming Soon' },
          { name: 'Google Calendar', desc: 'Sync meeting schedules and participants.', icon: Calendar, status: 'Coming Soon' },
        ].map((app, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-4 right-4">
              <span className="text-[8px] font-black px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-md uppercase tracking-widest">
                {app.status}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <app.icon className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
            </div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight mb-1">{app.name}</h3>
            <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">{app.desc}</p>
            <div className="mt-6 pt-6 border-t border-zinc-50 dark:border-zinc-800 flex items-center justify-between">
              <button className="text-[10px] font-black text-zinc-300 dark:text-zinc-600 uppercase tracking-widest cursor-not-allowed">
                Connect
              </button>
              <ExternalLink className="w-3 h-3 text-zinc-200 dark:text-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
