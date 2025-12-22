"use client"

import { useAuth } from "@/context/AuthContext"
import Link from "next/link"
import { useState } from "react"
import { Search, Plus, Video, Clock, Users, Calendar, ArrowRight, Play, Loader2, MoreVertical } from "lucide-react"

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

  const filteredRecordings = recordings.filter(rec => 
    rec.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full h-full flex flex-col">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-3">My Recordings</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            Welcome back, <span className="text-brand-via font-bold">{user?.name}</span>. Your AI insights are ready.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative group flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="Search meetings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-via/20 transition-all shadow-sm group-hover:shadow-md dark:text-zinc-100"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
            </div>
            <button className="bg-brand-gradient text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-glow">
                <Video className="w-4 h-4" /> Start Recording
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-black/5 flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar overflow-y-hidden">
          <table className="w-full text-left border-collapse min-w-[500px] md:min-w-[700px]">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-8 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Meeting Name</th>
                <th className="px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Date</th>
                <th className="hidden md:table-cell px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Duration</th>
                <th className="px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {filteredRecordings.map((recording) => (
                <tr key={recording.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                            {recording.status === "Processing" ? (
                              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                            ) : (
                              <Video className="w-6 h-6 text-brand-via" />
                            )}
                        </div>
                        <div className="flex flex-col">
                            <Link href={`/dashboard/recordings/${recording.id}`} className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-brand-via transition-colors text-base">
                                {recording.title}
                            </Link>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5 mt-0.5">
                                <Users className="w-3.5 h-3.5" /> {recording.participants} participants
                            </span>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-sm text-zinc-600 dark:text-zinc-400 font-bold">{recording.date}</td>
                  <td className="hidden md:table-cell px-6 py-6 text-sm text-zinc-600 dark:text-zinc-400 font-bold">{recording.duration}</td>
                  <td className="px-6 py-6">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        recording.status === "Processing" 
                        ? "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50" 
                        : "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
                    }`}>
                      {recording.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <Link 
                        href={`/dashboard/recordings/${recording.id}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded-full hover:scale-105 transition-all shadow-lg shadow-black/5 group/btn"
                    >
                        View Pipeline <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {recordings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center flex-1">
                <div className="w-24 h-24 bg-zinc-50 dark:bg-zinc-800 rounded-[32px] flex items-center justify-center mb-8 shadow-inner">
                    <Video className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3 tracking-tight">No recordings yet</h3>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mb-10 font-medium">
                    Start your first meeting recording to see the Smartmeet AI pipeline in action.
                </p>
                <button 
                    onClick={() => setRecordings(mockRecordings)}
                    className="bg-brand-gradient text-white px-8 py-4 rounded-full font-bold text-sm shadow-glow hover:scale-105 transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Start New Recording
                </button>
            </div>
        )}
      </div>
      
      <div className="mt-8 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-[0.2em]">
        <p>Showing {recordings.length} recordings</p>
      </div>
    </div>
  )
}
