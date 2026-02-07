"use client"

import { useState } from "react"
import { Plus, ExternalLink, Slack, Video, Calendar, Database, Code, Shield } from "lucide-react"

const integrationCategories = [
  { id: 'all', name: 'All', icon: Database },
  { id: 'video', name: 'Video Conferencing', icon: Video },
  { id: 'communication', name: 'Communication', icon: Slack },
  { id: 'calendar', name: 'Calendar', icon: Calendar },
  { id: 'developer', name: 'Developer Tools', icon: Code },
]

const integrations = [
  { 
    name: 'Slack', 
    desc: 'Sync summaries and action items to channels.', 
    icon: Slack, 
    status: 'In Development', 
    category: 'communication',
    details: 'Requires bot permissions for channel messaging.'
  },
  { 
    name: 'Zoom', 
    desc: 'Auto-import recordings and transcripts.', 
    icon: Video, 
    status: 'Beta', 
    category: 'video',
    details: 'Connect via OAuth to sync cloud recordings.'
  },
  { 
    name: 'Google Calendar', 
    desc: 'Sync meeting schedules and participants.', 
    icon: Calendar, 
    status: 'Upcoming', 
    category: 'calendar',
    details: 'Used for auto-labeling meeting participants.'
  },
  { 
    name: 'Custom Webhook', 
    desc: 'Send meeting logic to your own endpoints.', 
    icon: Code, 
    status: 'New', 
    category: 'developer',
    details: 'POST JSON data to any secure URL.'
  },
  { 
    name: 'Supabase Storage', 
    desc: 'Store recordings in your own bucket.', 
    icon: Database, 
    status: 'In Development', 
    category: 'developer',
    details: 'Requires service role key for integration.'
  },
]

export default function IntegrationsClient() {
  const [activeCategory, setActiveCategory] = useState('all')

  const filteredIntegrations = integrations.filter(item => 
    activeCategory === 'all' || item.category === activeCategory
  )

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Integrations</h1>
            <span className="px-2 py-2 bg-brand-via/10 text-brand-via text-[10px] font-black uppercase tracking-widest rounded-md">V1.2</span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            Extend SupersmartX capabilities with your existing tools.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-10 px-4 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-colors border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
            Request App
          </button>
          <button className="h-10 bg-brand-gradient text-white px-6 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-brand-via/20 justify-center">
            <Plus className="w-4 h-4" /> BROWSE MARKETPLACE
          </button>
        </div>
      </header>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {integrationCategories.map((cat) => (
          <button 
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all border ${
              activeCategory === cat.id 
                ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900 shadow-lg' 
                : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:border-brand-via/30'
            }`}
          >
            <cat.icon className={`w-4 h-4 ${activeCategory === cat.id ? 'text-brand-via' : 'text-zinc-400'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((app, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-brand-via/20 transition-all">
            <div className="absolute top-4 right-4">
              <span className={`text-[8px] font-black px-2 py-2 rounded-md uppercase tracking-widest ${
                app.status === 'New' || app.status === 'Beta' 
                ? 'bg-emerald-500/10 text-emerald-500' 
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
              }`}>
                {app.status}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <app.icon className="w-6 h-6 text-brand-via/70 group-hover:text-brand-via transition-colors" />
            </div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight mb-1">{app.name}</h3>
            <p className="text-[10px] text-zinc-500 font-medium leading-relaxed mb-2">{app.desc}</p>
            <div className="flex items-center gap-2 text-[9px] text-zinc-400 font-bold uppercase tracking-tighter">
              <Shield className="w-3 h-3" /> {app.details}
            </div>
            <div className="mt-6 pt-6 border-t border-zinc-50 dark:border-zinc-800 flex items-center justify-between">
              <button 
                className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                  app.status === 'Upcoming' || app.status === 'In Development'
                  ? 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
                  : 'text-brand-via hover:text-brand-via/80'
                }`}
                disabled={app.status === 'Upcoming' || app.status === 'In Development'}
              >
                {app.status === 'Upcoming' || app.status === 'In Development' ? 'Coming Soon' : 'Connect'}
              </button>
              <ExternalLink className="w-3 h-3 text-zinc-200 dark:text-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}