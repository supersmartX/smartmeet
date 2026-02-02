"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { highlightText } from "@/utils/text"
import { 
  getMeetingById, 
  generateMeetingSummary,
  processMeetingAI,
  enqueueMeetingAI
} from "@/actions/meeting"
import { MeetingWithRelations, Transcript } from "@/types/meeting"
import { useToast } from "@/hooks/useToast"
import { Toast } from "@/components/Toast"
import { MeetingHeader } from "@/components/dashboard/recordings/MeetingHeader"
import { MeetingTabs, EditorTab } from "@/components/dashboard/recordings/MeetingTabs"

import { 
  Video,
  Search, 
  Sparkles, 
  MessageSquare,
  Loader2,
  ShieldCheck,
  AlertCircle
} from "lucide-react"

/* --------------------------- COMPONENT ---------------------------- */

export default function RecordingDetailPage() {
  const params = useParams()
  const router = useRouter()

  const [meeting, setMeeting] = useState<MeetingWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<EditorTab>("transcript")
  const [searchQuery, setSearchQuery] = useState("")

  const { toast, showToast: toastVisible, hideToast } = useToast()
  
  // New AI States
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  
  // SSR Protection: Check authentication and authorization
  const { data: session, status } = useSession()
  const [isAuthorized, setIsAuthorized] = useState(false)
  
  useEffect(() => {
    // Check authentication
    if (status === 'unauthenticated') {
      router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname))
      return
    }
    
    if (status === 'authenticated' && session?.user?.id) {
      setIsAuthorized(true)
    }
  }, [status, session, router])
  
  const fetchMeeting = useCallback(async (isPolling = false) => {
    if (!isAuthorized || !params.id) return false // Return false if precondition fails

    try {
      if (!isPolling) setIsLoading(true)
      setError(null)
      
      const result = await getMeetingById(params.id as string)
      if (!result.success || !result.data) {
        setError(result.error || "Meeting not found.")
        return false // Return false to signal stop polling
      } else if (result.data.userId !== session?.user?.id) {
        setError("You don't have permission to view this meeting.")
        return false // Return false to signal stop polling
      } else {
        setMeeting(result.data)
        
        // Stop polling if completed or failed
        if ((result.data.status === 'COMPLETED' || result.data.status === 'FAILED')) {
          return false // Return false to signal stop polling
        }
      }
    } catch (err) {
      console.error("Fetch meeting error:", err)
      if (!isPolling) setError("Failed to load meeting details. Please try again.")
    } finally {
      if (!isPolling) setIsLoading(false)
    }
    return true // Continue polling
  }, [isAuthorized, params.id, session?.user?.id])

  useEffect(() => {
    if (!isAuthorized || !params.id) return
    
    let pollInterval: NodeJS.Timeout | null = null

    // Initial fetch
    fetchMeeting()

    // Start polling if pending or processing
    if (!meeting || (meeting.status !== 'COMPLETED' && meeting.status !== 'FAILED')) {
      pollInterval = setInterval(async () => {
        const shouldContinue = await fetchMeeting(true)
        if (!shouldContinue && pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
      }, 5000)
    }

    let eventSource: EventSource | null = null

    // Use SSE for real-time status updates if meeting is processing
    if (meeting?.status === 'PROCESSING' || meeting?.status === 'PENDING') {
      const statusUrl = `/api/v1/meetings/${params.id}/status`
      eventSource = new EventSource(statusUrl)

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.status && data.status !== meeting?.status) {
            fetchMeeting(true)
          }
        } catch (error) {
          console.error("SSE parse error:", error)
        }
      }

      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error)
        eventSource?.close()
      }
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval)
      if (eventSource) eventSource.close()
    }
  }, [params.id, isAuthorized, meeting?.status, fetchMeeting])

  const tabs = useMemo(() => [
    { id: "transcript", label: "Transcript", icon: MessageSquare, ext: "" },
    { id: "summary", label: "AI Summary", icon: Sparkles, ext: "" },
  ], []) as { id: EditorTab; label: string; icon: React.ComponentType<{ className?: string }>; ext: string; hidden?: boolean }[]

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true)
    try {
      const result = await generateMeetingSummary(params.id as string)
      if (result.success && result.data) {
        setMeeting((prev: MeetingWithRelations | null) => 
          prev ? { ...prev, summary: result.data! } : null
        )
        toastVisible("Summary regenerated successfully", "success")
      } else {
        toastVisible(result.error || "Failed to generate summary", "error")
      }
    } catch (error) {
      console.error("Failed to generate summary:", error)
      toastVisible("An unexpected error occurred while generating summary", "error")
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  useEffect(() => {
    // Persist active tab in session storage (client-side only)
    if (typeof window !== 'undefined') {
      const savedTab = sessionStorage.getItem("smartmeet_active_tab") as EditorTab
      if (savedTab && tabs.some(t => t.id === savedTab)) {
        // Use requestAnimationFrame to avoid synchronous state update
        requestAnimationFrame(() => {
          setActiveTab(savedTab)
        })
      }
    }
  }, [tabs])

  const handleTabChange = (tabId: EditorTab) => {
    setActiveTab(tabId)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem("smartmeet_active_tab", tabId)
    }
  }

  const filteredTranscript = (meeting?.transcripts || []).filter((item: Transcript) =>
    item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.speaker.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderHighlightedText = (text: string, query: string): React.ReactNode => {
    const parts = highlightText(text, query)
    return parts.map((part, i) => 
      typeof part === 'string' ? part : (
        <mark key={i} className="bg-brand-via/20 text-brand-via rounded px-0.5">
          {part.match}
        </mark>
      )
    )
  }

  const journeySteps = [
    { 
      label: "Captured", 
      status: meeting ? "completed" as const : "pending" as const,
      description: "Audio file received and stored safely."
    },
    { 
      label: "Transcribed", 
      status: (meeting?.transcripts?.length || 0) > 0 ? "completed" as const : meeting?.processingStep === 'TRANSCRIPTION' ? 'processing' as const : meeting?.status === 'FAILED' ? 'failed' as const : "pending" as const,
      description: meeting?.processingStep === 'TRANSCRIPTION' ? "Neural engine is active..." : "Neural engine converting audio to text."
    },
    { 
      label: "AI Summary", 
      status: meeting?.summary ? "completed" as const : meeting?.processingStep === 'SUMMARIZATION' ? 'processing' as const : meeting?.status === 'FAILED' ? 'failed' as const : "pending" as const,
      description: meeting?.processingStep === 'SUMMARIZATION' ? "Synthesizing themes..." : "Extracting key discussions and themes."
    }
  ]

  const handleRefresh = async () => {
    setIsLoading(true)
    await fetchMeeting()
    toastVisible("Refreshed meeting data", "success")
  }

  const handleRetry = async () => {
    const meetingId = (meeting?.id || params.id) as string;
    if (!meetingId) return;

    setIsLoading(true);
    try {
      toastVisible("Queuing for reprocessing...", "info");
      const result = await enqueueMeetingAI(meetingId);
      
      if (result.success) {
        toastVisible("Reprocessing started.", "success");
        window.location.reload();
      } else {
        toastVisible(result.error || "Failed to restart processing", "error");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Retry error:", err);
      toastVisible("Failed to restart processing", "error");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
        <Toast {...toast} onClose={hideToast} />
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="h-10 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
            <div className="h-4 w-40 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="h-12 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Stats Row Skeleton */}
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-320px)] min-h-[600px]">
          {/* Main Content Skeleton */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="h-14 w-full bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
            <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] animate-pulse" />
          </div>

          {/* Sidebar Skeleton */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="h-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] animate-pulse" />
            <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-black p-8">
        <Toast {...toast} onClose={hideToast} />
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center border transition-all ${
            error ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
          }`}>
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight mb-2">
              {error ? "Analysis Failed" : "Session not found"}
            </h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
              {error || "We couldn't find the recording you're looking for. It might have been deleted or you don't have permission to view it."}
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            {error && (
              <button 
                onClick={handleRetry}
                className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-black/10"
              >
                Try Re-analyzing
              </button>
            )}
            <Link 
              href="/dashboard" 
              className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-center ${
                error 
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200' 
                  : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-[1.02] shadow-xl shadow-black/10'
              }`}
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // SSR Protection: Show authentication error or redirect
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-brand-via mb-4" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-zinc-950">
        <Toast {...toast} onClose={hideToast} />
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Authentication Required</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Please sign in to view this meeting.</p>
          <Link 
            href="/login" 
            className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-black/10"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (error && error.includes("permission")) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-zinc-950">
        <Toast {...toast} onClose={hideToast} />
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Access Denied</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">You don&apos;t have permission to view this meeting.</p>
          <Link 
            href="/dashboard" 
            className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-10 space-y-8 animate-in fade-in duration-500 bg-white dark:bg-zinc-950 min-h-screen">
      <Toast {...toast} onClose={hideToast} />
      
      <MeetingHeader meeting={meeting} journeySteps={journeySteps} onRefresh={handleRefresh} />

      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-900">
           <MeetingTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
           
           {meeting?.audioUrl && (
            <div className="w-full lg:w-auto bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 shrink-0">
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                  <Video className="w-4 h-4 text-zinc-500" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Original Audio</span>
              </div>
              <audio 
                src={meeting.audioUrl} 
                controls 
                className="h-8 w-full sm:w-64 lg:w-80 filter dark:invert opacity-80 hover:opacity-100 transition-opacity"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Search bar for transcript */}
          {activeTab === "transcript" && (
            <div className="relative max-w-2xl group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
              <input
                aria-label="Search transcript"
                placeholder="Search in transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-14 pr-6 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-via/10 focus:border-brand-via transition-all shadow-sm placeholder:text-zinc-400"
              />
            </div>
          )}

          <div className="min-h-[400px]">
            {meeting?.status === 'FAILED' && (
              <div className="mb-8 p-6 bg-red-500/5 border border-red-500/20 rounded-3xl flex flex-col items-center text-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-1">Processing Failed</h3>
                  <p className="text-[10px] text-zinc-500 font-medium max-w-xs mx-auto">
                    {meeting.testResults?.includes("System Error") 
                      ? meeting.testResults 
                      : "Something went wrong during the AI analysis. This could be due to a temporary service interruption or an issue with the audio file."}
                  </p>
                </div>
                <button 
                  onClick={() => processMeetingAI(meeting.id)}
                  className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg"
                >
                  Retry Analysis
                </button>
              </div>
            )}

            {activeTab === "transcript" && (
              <div className="space-y-6 max-w-4xl">
                {meeting?.transcripts?.length > 0 ? (
                  filteredTranscript.map((item: Transcript, i: number) => (
                    <div key={i} className="flex gap-6 group p-4 rounded-3xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-xs font-black text-zinc-400 shrink-0 border border-zinc-200 dark:border-zinc-800 group-hover:border-brand-via transition-colors shadow-sm">
                        {item.speaker[0]}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{renderHighlightedText(item.speaker, searchQuery)}</span>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-lg">{item.time}</span>
                          {item.confidence && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                              {Math.round(item.confidence * 100)}% Match
                            </span>
                          )}
                        </div>
                        <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                          {renderHighlightedText(item.text, searchQuery)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center gap-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px] bg-zinc-50/50 dark:bg-zinc-900/20">
                    <div className="w-20 h-20 rounded-3xl bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-xl">
                      <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight mb-2">No transcript available</h3>
                      <p className="text-sm text-zinc-500 font-medium max-w-xs mx-auto mb-4">
                        {meeting?.status === 'PROCESSING' 
                          ? `Processing: ${meeting.processingStep?.replace('_', ' ') || 'Initializing'}...` 
                          : "The transcript for this meeting is currently being processed or could not be generated."}
                      </p>
                      {meeting?.status === 'PROCESSING' && (
                         <button 
                           onClick={handleRefresh}
                           className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg"
                         >
                           Check Status
                         </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "summary" && (
              <div className="max-w-4xl animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-8 p-6 bg-brand-via/5 border border-brand-via/10 rounded-3xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-via/10 flex items-center justify-center border border-brand-via/20 shadow-lg shadow-brand-via/5">
                      <Sparkles className="w-6 h-6 text-brand-via" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Executive Summary</h2>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">AI-Generated Insights & Action Items</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all border border-zinc-200 dark:border-zinc-800 shadow-sm"
                  >
                    {isGeneratingSummary ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-brand-via" />}
                    {isGeneratingSummary ? "Regenerating..." : "Regenerate"}
                  </button>
                </div>

                <div className="space-y-6">
                  {meeting?.summary?.content ? (
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[24px] sm:rounded-[32px] p-4 sm:p-8 border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-via/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-brand-via/10 transition-all" />
                      
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                          {meeting.summary.content}
                        </p>
                      </div>

                      <div className="mt-8 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-6">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Analysis Status</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Ready</span>
                        </div>
                      </div>
                    </div>
                  ) : meeting?.transcripts?.length > 0 ? (
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[24px] sm:rounded-[32px] p-4 sm:p-8 border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-via/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-brand-via/10 transition-all" />
                      
                      <p className="text-lg text-zinc-900 dark:text-zinc-100 font-bold leading-tight mb-8">
                        The AI analysis for this meeting is complete. You can find the key points and technical context below.
                      </p>

                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Analysis Status</span>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${meeting?.transcripts?.length > 0 ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">{meeting?.transcripts?.length > 0 ? 'Ready' : 'Processing'}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Key Discussion points</div>
                        
                      {meeting?.transcripts?.length > 0 ? (
                        meeting.transcripts.slice(0, 3).map((item: Transcript, i: number) => (
                          <div key={i} className="flex gap-3 group/item cursor-pointer">
                            <div className="w-6 h-6 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shrink-0 group-hover/item:border-brand-via transition-colors">
                              <MessageSquare className="w-3 h-3 text-zinc-400" />
                            </div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight font-medium group-hover/item:text-zinc-900 dark:group-hover/item:text-zinc-100 transition-colors line-clamp-2">
                              {item.text}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="grid grid-cols-1 gap-4 mb-8">
                          {/* Summary points would be rendered here when available */}
                        </div>
                      )}
                      </div>

                      {/* Relocated Metrics from Terminal */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                        <div>
                           <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Metadata</h4>
                           <div className="space-y-3">
                             <div className="flex justify-between">
                               <span className="text-[10px] font-bold text-zinc-500 uppercase">Latency Avg</span>
                               <span className="text-[10px] font-black text-zinc-400">--ms</span>
                             </div>
                             <div className="flex justify-between">
                               <span className="text-[10px] font-bold text-zinc-500 uppercase">Sentiment</span>
                               <span className="text-[10px] font-black text-zinc-400">Analysis Pending</span>
                             </div>
                             <div className="flex justify-between">
                               <span className="text-[10px] font-bold text-zinc-500 uppercase">Keywords</span>
                               <span className="text-[10px] font-black text-zinc-400">0 Detected</span>
                             </div>
                           </div>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Participants</h4>
                          <div className="space-y-3">
                            {meeting?.transcripts && meeting.transcripts.length > 0 ? (
                              Array.from(new Set(meeting.transcripts.map(t => t.speaker))).slice(0, 3).map((speaker, i) => (
                                <div key={i} className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">{speaker}</span>
                                  <span className="text-[10px] font-bold text-zinc-400">Active</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] text-zinc-500 font-medium">No participant data available yet.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] p-12 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center gap-4">
                      <div className="w-20 h-20 rounded-3xl bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <Sparkles className="w-8 h-8 text-zinc-200 dark:text-zinc-700" />
                      </div>
                      <div className="max-w-xs">
                        <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-2">Generating Summary</h3>
                        <p className="text-[10px] text-zinc-500 font-medium leading-relaxed uppercase tracking-wider">Our AI is analyzing your meeting audio to generate an executive summary. This usually takes 1-2 minutes.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
