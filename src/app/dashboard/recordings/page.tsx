"use client"

import { useAuth } from "@/context/AuthContext"
import Link from "next/link"
import { useState } from "react"
import { Search, Video, MoreHorizontal, ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react"

const mockRecordings = [
  { id: "1", title: "Product Team Standup", date: "Dec 22, 2025", duration: "18m", status: "Completed", participants: 9 },
  { id: "2", title: "AI Pipeline Discussion", date: "Dec 21, 2025", duration: "45m", status: "Completed", participants: 4 },
  { id: "3", title: "Q1 Strategy Planning", date: "Dec 20, 2025", duration: "1h 12m", status: "Completed", participants: 6 },
  { id: "4", title: "Design Review: Mobile App", date: "Dec 19, 2025", duration: "32m", status: "Processing", participants: 3 },
  { id: "5", title: "Client Discovery Call", date: "Dec 18, 2025", duration: "58m", status: "Completed", participants: 2 },
  { id: "6", title: "Weekly All-Hands", date: "Dec 15, 2025", duration: "42m", status: "Completed", participants: 24 },
]

export default function RecordingsPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState("all")

  return (
    <div className="p-8 max-w-7xl mx-auto w-full min-h-full flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-1">My Recordings</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium uppercase tracking-widest text-[10px]">
            Manage and organize your meeting history
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative group">
                <input 
                    type="text" 
                    placeholder="Search recordings..." 
                    className="pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-brand-via/10 focus:border-brand-via w-full sm:w-72 transition-all shadow-sm"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
            </div>
            <button className="bg-brand-gradient text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-glow flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> NEW RECORDING
            </button>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-1 overflow-x-auto custom-scrollbar">
        {["All Recordings", "My Meetings", "Shared with me", "Archived"].map((tab) => (
            <button 
                key={tab}
                className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shrink-0 ${
                    tab === "All Recordings" 
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xl shadow-black/10" 
                    : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
            >
                {tab}
            </button>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-black/5 flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar overflow-y-hidden">
          <table className="w-full text-left border-collapse min-w-[500px] md:min-w-[800px]">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-8 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Meeting Name</th>
                <th className="px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Date</th>
                <th className="hidden md:table-cell px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Duration</th>
                <th className="hidden lg:table-cell px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Participants</th>
                <th className="px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {mockRecordings.map((recording) => (
                <tr key={recording.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                            {recording.status === "Processing" ? (
                              <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                            ) : (
                              <Video className="w-5 h-5 text-brand-via" />
                            )}
                        </div>
                        <Link href={`/dashboard/recordings/${recording.id}`} className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-brand-via transition-colors text-base">
                            {recording.title}
                        </Link>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-sm text-zinc-600 dark:text-zinc-400 font-bold">{recording.date}</td>
                  <td className="hidden md:table-cell px-6 py-6 text-sm text-zinc-600 dark:text-zinc-400 font-bold">{recording.duration}</td>
                  <td className="hidden lg:table-cell px-6 py-6">
                    <div className="flex -space-x-2">
                      {[...Array(Math.min(recording.participants, 4))].map((_, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                          <img src={`https://i.pravatar.cc/100?img=${i + 20 + parseInt(recording.id)}`} className="w-full h-full rounded-full object-cover" />
                        </div>
                      ))}
                      {recording.participants > 4 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                          +{recording.participants - 4}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        recording.status === "Processing" 
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500" 
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-500"
                    }`}>
                      {recording.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-4">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Showing 1-6 of 12 recordings</p>
        <div className="flex gap-3">
            <button className="px-6 py-2.5 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 disabled:opacity-50 flex items-center gap-2" disabled>
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button className="px-6 py-2.5 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center gap-2">
              Next <ChevronRight className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  )
}
