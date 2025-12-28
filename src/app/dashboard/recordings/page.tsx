"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState, useRef, useEffect, Suspense } from "react"
import { highlightText } from "@/utils/text"
import { Search, Video, MoreHorizontal, ChevronLeft, ChevronRight, Plus, Loader2, Sparkles, Upload } from "lucide-react"
import { getMeetings, createMeeting, deleteMeeting, updateMeetingTitle, createSignedUploadUrl, updateMeetingStatus, processMeetingAI } from "@/actions/meeting"
import { supabase } from "@/lib/supabase"
import { v4 as uuidv4 } from "uuid"

interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration?: string;
  participants?: number;
  status: string;
  userId: string;
  audioUrl?: string;
}

function RecordingsContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const user = session?.user
  const [recordings, setRecordings] = useState<Meeting[]>([])
  const [filter, setFilter] = useState("all meetings")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [showToast, setShowToast] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchMeetings = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getMeetings()
      setRecordings(data)
    } catch (err) {
      console.error("Fetch meetings error:", err)
      setError("Failed to load recordings. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) return
    setIsRenaming(true)
    try {
      await updateMeetingTitle(id, editTitle)
      await fetchMeetings()
      setEditingId(null)
    } catch (error) {
      console.error("Rename error:", error)
      alert("Failed to rename recording.")
    } finally {
      setIsRenaming(false)
    }
  }

  const startEditing = (recording: Meeting) => {
    setEditingId(recording.id)
    setEditTitle(recording.title)
    setActiveMenu(null)
  }

  useEffect(() => {
    fetchMeetings()
  }, [])

  // Poll for updates if any meeting is in PROCESSING status
  useEffect(() => {
    const hasProcessing = recordings.some(r => r.status === "PROCESSING")
    if (!hasProcessing) return

    const interval = setInterval(() => {
      fetchMeetings()
    }, 5000)

    return () => clearInterval(interval)
  }, [recordings])

  useEffect(() => {
    if (searchParams.get("action") === "upload") {
      handleNewRecording()
    }
  }, [searchParams])

  const handleNewRecording = () => {
    fileInputRef.current?.click()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recording?")) return
    
    setIsDeleting(true)
    setActiveMenu(null)
    try {
      await deleteMeeting(id)
      await fetchMeetings()
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete recording.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // File size limit: 50MB
    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      alert("File is too large. Maximum size is 50MB.")
      return
    }

    if (!user?.id) {
      alert("You must be logged in to upload recordings.")
      return
    }

    setIsUploading(true)
    setShowToast(true)
    setUploadStatus("Starting upload...")

    try {
      // 1. Get signed URL from Supabase via Server Action
      setUploadStatus("Preparing secure channel...")
      const { signedUrl, path, token } = await createSignedUploadUrl(file.name)

      // 2. Upload file directly to Supabase
      setUploadStatus("Uploading recording...")
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'x-upsert': 'true'
        }
      })

      if (!uploadResponse.ok) throw new Error("Upload failed")

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recordings/${path}`

      setUploadStatus("Processing audio...")

      // 4. Get audio duration
      const duration = await new Promise<string>((resolve) => {
        const audio = new Audio()
        audio.src = URL.createObjectURL(file)
        audio.onloadedmetadata = () => {
          const minutes = Math.floor(audio.duration / 60)
          const seconds = Math.floor(audio.duration % 60)
          resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`)
          URL.revokeObjectURL(audio.src)
        }
        audio.onerror = () => resolve("0:00")
      })

      // 3. Create meeting in database
      setUploadStatus("Creating meeting record...")
      const meeting = await createMeeting({
        title: file.name.replace(/\.[^/.]+$/, ""),
        duration: duration,
        audioUrl: publicUrl
      })

      setUploadStatus("Processing with AI...")

      // 4. Start the AI pipeline on the server
      processMeetingAI(meeting.id, publicUrl).catch(async (err) => {
        console.error("AI Pipeline Error:", err)
        // Status is already handled inside processMeetingAI for most cases, 
        // but this is a fallback for unexpected errors.
        await updateMeetingStatus(meeting.id, "FAILED")
      })

      // We don't wait for the AI to finish before closing the initial upload state
      // unless we want to keep the toast open.
      setUploadStatus("AI processing started...")
      await fetchMeetings()
      
    } catch (error) {
      console.error("Upload error:", error)
      setUploadStatus("Upload failed.")
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
    if (filter === "action items") return matchesSearch && rec.status?.toUpperCase() === "COMPLETED" // Simplified for now
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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full min-h-full flex flex-col gap-6 sm:gap-8 bg-zinc-50 dark:bg-black">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-1">My Recordings</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-medium uppercase tracking-widest">
            Manage and organize your meeting history
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative flex-1 sm:min-w-[300px] group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-brand-via transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search recordings..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-brand-via/10 focus:border-brand-via transition-all shadow-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                />
            </div>
            <div className="flex items-center gap-3">
                <button 
                  onClick={handleNewRecording}
                  disabled={isUploading}
                  className="flex-1 sm:flex-none px-6 sm:px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>{isUploading ? "UPLOADING..." : "NEW RECORDING"}</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="audio/*,video/*"
                />
            </div>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-1 overflow-x-auto custom-scrollbar">
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

      <div className="bg-white dark:bg-zinc-900 rounded-[24px] sm:rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/5 flex-1 flex flex-col min-h-[400px] relative overflow-hidden">
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-600 dark:text-red-400">
              <Video className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Failed to load recordings</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">{error}</p>
            </div>
            <button 
              onClick={() => fetchMeetings()}
              className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
            >
              Try Again
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex flex-col p-8 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between animate-pulse border-b border-zinc-50 dark:border-zinc-800 pb-6 last:border-0">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl" />
                  <div className="flex flex-col gap-2">
                    <div className="w-48 h-5 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
                    <div className="w-24 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
                  </div>
                </div>
                <div className="hidden sm:block w-32 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
                <div className="w-20 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 sm:px-8 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Meeting Name</th>
                <th className="hidden sm:table-cell px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Date</th>
                <th className="hidden md:table-cell px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Duration</th>
                <th className="hidden lg:table-cell px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Participants</th>
                <th className="hidden sm:table-cell px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-4 sm:px-8 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredRecordings.length > 0 ? (
                filteredRecordings.map((recording) => (
                  <tr key={recording.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-4 sm:px-8 py-4 sm:py-6">
                      <div className="flex items-center gap-3 sm:gap-5">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shrink-0">
                              {recording.status?.toUpperCase() === "PROCESSING" ? (
                                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 animate-spin" />
                              ) : (
                                <Video className="w-4 h-4 sm:w-5 sm:h-5 text-brand-via" />
                              )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            {editingId === recording.id ? (
                               <div className="flex items-center gap-2 flex-1 min-w-0">
                                 <input
                                   type="text"
                                   value={editTitle}
                                   onChange={(e) => setEditTitle(e.target.value)}
                                   onKeyDown={(e) => e.key === 'Enter' && handleRename(recording.id)}
                                   onBlur={() => !isRenaming && setEditingId(null)}
                                   autoFocus
                                   className="bg-white dark:bg-zinc-900 border border-brand-via rounded-lg px-3 py-1.5 text-sm font-bold w-full focus:outline-none focus:ring-2 focus:ring-brand-via/20 text-zinc-900 dark:text-zinc-100"
                                 />
                               </div>
                             ) : (
                              <Link href={`/dashboard/recordings/${recording.id}`} className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-brand-via transition-colors text-sm sm:text-base truncate">
                                  {renderHighlightedText(recording.title, searchQuery)}
                              </Link>
                            )}
                            <div className="flex items-center gap-2 mt-1 sm:hidden">
                               <span className="text-[10px] text-zinc-500 font-bold">
                                 {recording.date instanceof Date ? recording.date.toLocaleDateString() : String(recording.date)}
                               </span>
                               <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                  recording.status?.toUpperCase() === "PROCESSING" 
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500" 
                                  : recording.status?.toUpperCase() === "FAILED"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-500"
                               }`}>
                                 {recording.status}
                               </span>
                            </div>
                          </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-6 text-sm text-zinc-600 dark:text-zinc-400 font-bold">
                      {renderHighlightedText(recording.date instanceof Date ? recording.date.toLocaleDateString() : String(recording.date), searchQuery)}
                    </td>
                    <td className="hidden md:table-cell px-6 py-6 text-sm text-zinc-600 dark:text-zinc-400 font-bold">{recording.duration}</td>
                    <td className="hidden lg:table-cell px-6 py-6">
                        <div className="flex items-center gap-1.5">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                                <span className="text-xs font-black text-zinc-500">{recording.participants}</span>
                            </div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Members</span>
                        </div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          recording.status?.toUpperCase() === "PROCESSING" 
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500" 
                          : recording.status?.toUpperCase() === "FAILED"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-500"
                      }`}>
                        {recording.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <Link 
                          href={`/dashboard/recordings/${recording.id}`}
                          className="hidden sm:inline-block px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[9px] font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all"
                        >
                          Open
                        </Link>
                        <div className={`relative ${activeMenu === recording.id ? 'z-50' : ''}`}>
                          <button 
                            onClick={() => setActiveMenu(activeMenu === recording.id ? null : recording.id)}
                            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                          >
                              <MoreHorizontal className="w-5 h-5" />
                          </button>
                          
                          {activeMenu === recording.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link 
                                  href={`/dashboard/recordings/${recording.id}`}
                                  className="sm:hidden w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors block"
                                >
                                  Open
                                </Link>
                                <button 
                                  onClick={() => startEditing(recording)}
                                  className="w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                >
                                  Rename
                                </button>
                                <button className="w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                  Download
                                </button>
                                <button className="w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                  Share
                                </button>
                                <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-1" />
                                <button 
                                  onClick={() => handleDelete(recording.id)}
                                  className="w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? "Deleting..." : "Delete"}
                                </button>
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
                        <p className="text-xs text-zinc-500 font-medium">Try adjusting your search or filters to find what you&apos;re looking for.</p>
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
        )
      }
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 py-4">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center sm:text-left">
          Showing {filteredRecordings.length > 0 ? `1-${filteredRecordings.length}` : '0'} of {filteredRecordings.length} recordings
        </p>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 disabled:opacity-50 flex items-center justify-center gap-2" disabled>
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center justify-center gap-2">
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
              {uploadStatus}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RecordingsPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-brand-via animate-spin" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Loading recordings...</p>
        </div>
      </div>
    }>
      <RecordingsContent />
    </Suspense>
  )
}
