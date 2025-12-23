"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { highlightText } from "@/utils/text"
import { Search, Video, MoreHorizontal, ChevronLeft, ChevronRight, Plus, Loader2, Sparkles, Upload } from "lucide-react"
import { audioToCode } from "@/services/api"
import { getMeetings } from "@/actions/meeting"

export default function RecordingsPage() {
  const { data: session } = useSession()
  const user = session?.user
  const [recordings, setRecordings] = useState<any[]>([])
  const [filter, setFilter] = useState("all meetings")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchMeetings = async () => {
      const data = await getMeetings()
      setRecordings(data)
    }
    fetchMeetings()
  }, [])

  const handleNewRecording = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setShowToast(true)

    try {
      const response = await audioToCode(file)
      if (response.success) {
        // In a real app, we would redirect to the new recording page or refresh the list
        console.log("Pipeline complete:", response.data)
      } else {
        console.error("Pipeline failed:", response.error)
      }
    } catch (error) {
      console.error("Upload error:", error)
    } finally {
      setIsUploading(false)
      setTimeout(() => setShowToast(false), 5000)
    }
  }

  const filteredRecordings = recordings.filter(rec => {
    const matchesSearch = rec.title.toLowerCase().includes(searchQuery.toLowerCase())
    if (filter === "all meetings") return matchesSearch
    if (filter === "recent") {
      // Logic for recent: meetings from the last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recordingDate = new Date(rec.date)
      return matchesSearch && recordingDate >= sevenDaysAgo
    }
    if (filter === "action items") return matchesSearch && rec.status === "Completed" // Simplified for now
    return matchesSearch
  })

  const renderHighlightedText = (text: string, query: string) => {
    const parts = highlightText(text, query);
    return parts.map((part, i) => {
      if (typeof part === 'string') {
        return <span key={i}>{part}</span>;
      } else {
        return (
          <mark key={i} className="bg-brand-via/20 text-brand-via rounded-sm px-0.5 border-b border-brand-via/30">
            {part.match}
          </mark>
        );
      }
    });
  }

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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-brand-via/10 focus:border-brand-via w-full sm:w-72 transition-all shadow-sm"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
            </div>
            <button 
              onClick={handleNewRecording}
              disabled={isUploading}
              className="bg-brand-gradient text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
            >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isUploading ? "UPLOADING..." : "NEW RECORDING"}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="audio/*,video/*"
            />
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-1 overflow-x-auto custom-scrollbar">
        {["All Meetings", "Recent", "Action Items"].map((tab) => (
            <button 
                key={tab}
                onClick={() => setFilter(tab.toLowerCase())}
                className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shrink-0 ${
                    filter === tab.toLowerCase() || (filter === "all" && tab === "All Meetings")
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
              {filteredRecordings.length > 0 ? (
                filteredRecordings.map((recording) => (
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
                              {renderHighlightedText(recording.title, searchQuery)}
                          </Link>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-sm text-zinc-600 dark:text-zinc-400 font-bold">{renderHighlightedText(recording.date, searchQuery)}</td>
                    <td className="hidden md:table-cell px-6 py-6 text-sm text-zinc-600 dark:text-zinc-400 font-bold">{recording.duration}</td>
                    <td className="hidden lg:table-cell px-6 py-6">
                        <div className="flex items-center gap-1.5">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                                <span className="text-xs font-black text-zinc-500">{recording.participants}</span>
                            </div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Members</span>
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
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/dashboard/recordings/${recording.id}`}
                          className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[9px] font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all"
                        >
                          Open
                        </Link>
                        <div className="relative">
                          <button 
                            onClick={() => setActiveMenu(activeMenu === recording.id ? null : recording.id)}
                            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                          >
                              <MoreHorizontal className="w-5 h-5" />
                          </button>
                          
                          {activeMenu === recording.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-2xl z-20 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Rename</button>
                                <button className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Download</button>
                                <button className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Share</button>
                                <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-1" />
                                <button className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">Delete</button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="w-20 h-20 rounded-[32px] bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center">
                        <Search className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                      </div>
                      <div className="max-w-[240px]">
                        <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-1">No recordings found</h3>
                        <p className="text-xs text-zinc-500 font-medium">Try adjusting your search or filters to find what you're looking for.</p>
                      </div>
                      <button 
                        onClick={() => {setSearchQuery(""); setFilter("all meetings")}}
                        className="mt-2 text-[10px] font-black text-brand-via uppercase tracking-widest hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-4">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
          Showing {filteredRecordings.length > 0 ? `1-${filteredRecordings.length}` : '0'} of {filteredRecordings.length} recordings
        </p>
        <div className="flex gap-3">
            <button className="px-6 py-2.5 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 disabled:opacity-50 flex items-center gap-2" disabled>
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button className="px-6 py-2.5 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center gap-2">
              Next <ChevronRight className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-zinc-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
            {isUploading ? (
              <Loader2 className="w-4 h-4 text-brand-via animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-brand-via" />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isUploading ? "Recording pipeline is initializing..." : "Processing complete! Check back soon."}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
