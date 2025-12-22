"use client"

import { useAuth } from "@/context/AuthContext"
import Link from "next/link"
import { useState } from "react"
import { Search, Plus, Video, ArrowRight, Sparkles, Zap, ShieldCheck, CheckCircle2 } from "lucide-react"

const mockRecordings = [
  { id: "1", title: "Product Team Standup", date: "Dec 22, 2025", duration: "18m", status: "Completed", participants: 9 },
  { id: "2", title: "AI Pipeline Discussion", date: "Dec 21, 2025", duration: "45m", status: "Completed", participants: 4 },
  { id: "3", title: "Q1 Strategy Planning", date: "Dec 20, 2025", duration: "1h 12m", status: "Completed", participants: 6 },
  { id: "4", title: "Design Review: Mobile App", date: "Dec 19, 2025", duration: "32m", status: "Processing", participants: 3 },
  { id: "5", title: "Client Discovery Call", date: "Dec 18, 2025", duration: "58m", status: "Completed", participants: 2 },
  { id: "6", title: "Weekly All-Hands", date: "Dec 15, 2025", duration: "42m", status: "Completed", participants: 24 },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [recordings, setRecordings] = useState(mockRecordings)
  const [searchQuery, setSearchQuery] = useState("")
  const [showToast, setShowToast] = useState(false)

  const handleNewMeeting = () => {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const filteredRecordings = recordings.filter(rec => 
    rec.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-brand-via/20 text-brand-via rounded-sm px-0.5 border-b border-brand-via/30">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    )
  }

  const stats = [
    { label: "Total Meetings", value: "24", icon: Video, color: "text-brand-via", bg: "bg-brand-via/10", trend: "+12%", href: "/dashboard/recordings" },
    { label: "AI Insights", value: "142", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10", trend: "+28%", href: "/dashboard/recordings?filter=action+items" },
    { label: "Time Saved", value: "12.5h", icon: Zap, color: "text-emerald-500", bg: "bg-emerald-500/10", trend: "Elite", href: "/dashboard/recordings" },
    { label: "Compliance Score", value: "98%", icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-500/10", trend: "Stable", href: "/dashboard/recordings" },
  ]

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8 animate-in fade-in duration-700">
      {/* Welcome Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Workspace Overview</h1>
            <span className="px-2 py-0.5 rounded-full bg-brand-via/10 text-brand-via text-[8px] font-black uppercase tracking-widest border border-brand-via/20">Pro Plan</span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            Welcome back, {user?.name}. Your AI pipeline analyzed <span className="text-zinc-900 dark:text-zinc-100 font-bold">4 meetings</span> today.
          </p>
        </div>
        <div className="flex items-center gap-3">
            <div className="relative group">
              <input
                type="text"
                placeholder="Quick search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-brand-via/5 focus:border-brand-via transition-all shadow-sm"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
            </div>
            <button 
              onClick={handleNewMeeting}
              className="bg-brand-gradient text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center gap-2 shadow-glow shrink-0"
            >
                <Plus className="w-4 h-4" /> NEW MEETING
            </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Link key={i} href={stat.href} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-brand-via/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${
                stat.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'
              }`}>
                {stat.trend}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{stat.value}</span>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight mt-1">{stat.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity / Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-[0.2em]">Recent Meetings</h2>
            <Link href="/dashboard/recordings" className="text-[10px] font-black text-brand-via hover:underline uppercase tracking-widest flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-black/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Date</th>
                    <th className="hidden md:table-cell px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Participants</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {filteredRecordings.length > 0 ? (
                    filteredRecordings.slice(0, 4).map((recording) => (
                      <tr key={recording.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                                  <Video className="w-5 h-5 text-brand-via" />
                              </div>
                              <Link href={`/dashboard/recordings/${recording.id}`} className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-brand-via transition-colors text-sm truncate max-w-[200px]">
                                  {highlightText(recording.title, searchQuery)}
                              </Link>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-500 dark:text-zinc-400 font-bold">{highlightText(recording.date, searchQuery)}</td>
                        <td className="hidden md:table-cell px-6 py-4">
                          <div className="flex -space-x-1.5">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                                <img src={`https://i.pravatar.cc/100?img=${i + 20 + parseInt(recording.id)}`} className="w-full h-full object-cover shadow-sm" />
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                              recording.status === "Processing" 
                              ? "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50" 
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
                          }`}>
                            {recording.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link 
                              href={`/dashboard/recordings/${recording.id}`}
                              className="p-2 text-zinc-400 hover:text-brand-via transition-colors inline-block"
                          >
                              <ArrowRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="w-16 h-16 rounded-[24px] bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                            <Search className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
                          </div>
                          <div className="max-w-[200px]">
                            <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-1">No meetings found</h3>
                            <p className="text-[10px] text-zinc-500 font-medium">Try adjusting your search query to find your meeting.</p>
                          </div>
                          <button 
                            onClick={() => setSearchQuery("")}
                            className="mt-2 text-[10px] font-black text-brand-via uppercase tracking-widest hover:underline"
                          >
                            Clear search
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* User Journey / Recommended Actions */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-[0.2em]">Next Actions</h2>
          <div className="bg-zinc-900 dark:bg-white p-6 rounded-3xl shadow-2xl shadow-brand-via/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-via/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-brand-via/30 transition-all" />
            <Sparkles className="w-8 h-8 text-brand-via mb-4" />
            <h3 className="text-white dark:text-zinc-900 font-black text-lg leading-tight mb-2">Technical Blockers Detected</h3>
            <p className="text-zinc-400 dark:text-zinc-500 text-xs font-medium mb-6">
              Your last meeting (Product Team Standup) contains 3 high-priority technical blockers.
            </p>
            <Link 
              href="/dashboard/recordings/1"
              className="w-full py-3 bg-brand-via text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 transition-all"
            >
              Review Now <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">User Journey Map</h4>
              <span className="text-[10px] font-bold text-brand-via bg-brand-via/10 px-2 py-0.5 rounded">75% Complete</span>
            </div>
            
            <div className="relative flex flex-col gap-6">
              {/* Vertical line connecting steps */}
              <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-zinc-100 dark:bg-zinc-800" />
              
              {[
                { label: "Onboarding", desc: "Account setup & profile", status: "completed", date: "Dec 10" },
                { label: "Connect Calendar", desc: "Sync with Google/Outlook", status: "completed", date: "Dec 11" },
                { label: "First AI Analysis", desc: "Logic extraction from call", status: "completed", date: "Today" },
                { label: "Team Collaboration", desc: "Invite teammates to workspace", status: "pending", date: "Next" }
              ].map((step, i) => (
                <div key={i} className="relative flex gap-4 group">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-4 border-white dark:border-zinc-900 z-10 transition-all ${
                    step.status === 'completed' 
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 text-zinc-400'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black ${step.status === 'completed' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                        {step.label}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase">{step.date}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-500 font-medium leading-tight">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
              View Full Roadmap
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-zinc-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
            <Sparkles className="w-4 h-4 text-brand-via" />
            <span className="text-[10px] font-black uppercase tracking-widest">Recording pipeline is initializing...</span>
          </div>
        </div>
      )}
    </div>
  )
}
