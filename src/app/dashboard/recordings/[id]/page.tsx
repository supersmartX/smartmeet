"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { highlightText } from "@/utils/text"
import { 
  getMeetingById, 
  generateMeetingLogic, 
  askAIAboutMeeting,
  generateMeetingSummary,
  testMeetingCompliance,
  generateMeetingPlan,
  processMeetingAI,
  enqueueMeetingAI
} from "@/actions/meeting"
import { MeetingWithRelations, Transcript, ActionItem } from "@/types/meeting"
import { useToast } from "@/hooks/useToast"
import { Toast } from "@/components/Toast"
import { downloadFile } from "@/services/api"
import { MeetingHeader, JourneyStep } from "@/components/dashboard/recordings/MeetingHeader"
import { MeetingTabs, TabConfig, EditorTab } from "@/components/dashboard/recordings/MeetingTabs"
import { MeetingTerminal } from "@/components/dashboard/recordings/MeetingTerminal"

import { 
  Video,
  Search, 
  Sparkles, 
  FileText,
  MessageSquare,
  Code,
  CheckCircle2,
  ArrowRight,
  Copy,
  Loader2,
  ShieldCheck,
  Download,
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
  const [prompt, setPrompt] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAnswering, setIsAnswering] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)

  const { toast, showToast: toastVisible, hideToast } = useToast()

  // Logic Generation State
  const [isLogicGenerated, setIsLogicGenerated] = useState(false)
  const [isGeneratingLogic, setIsGeneratingLogic] = useState(false)
  
  // New AI States
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isTestingCompliance, setIsTestingCompliance] = useState(false)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [testResults, setTestResults] = useState<string | null>(null)
  const [planResult, setPlanResult] = useState<string | null>(null)
  
  // Initialize results from meeting data
  useEffect(() => {
    if (meeting) {
      if (meeting.testResults && !testResults) {
        setTestResults(meeting.testResults)
      }
      if (meeting.projectDoc && !planResult) {
        setPlanResult(meeting.projectDoc)
      }
    }
  }, [meeting, testResults, planResult])
  
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
  
  useEffect(() => {
    if (!isAuthorized || !params.id) return
    
    let pollInterval: NodeJS.Timeout | null = null

    const fetchMeeting = async (isPolling = false) => {
      try {
        if (!isPolling) setIsLoading(true)
        setError(null)
        
        const result = await getMeetingById(params.id as string)
        if (!result.success || !result.data) {
          setError(result.error || "Meeting not found.")
          if (pollInterval) clearInterval(pollInterval)
        } else if (result.data.userId !== session?.user?.id) {
          setError("You don't have permission to view this meeting.")
          if (pollInterval) clearInterval(pollInterval)
        } else {
          setMeeting(result.data)
          if (result.data?.code) {
            setIsLogicGenerated(true)
          }
          
          // Stop polling if completed or failed
          if ((result.data.status === 'COMPLETED' || result.data.status === 'FAILED') && pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
        }
      } catch (err) {
        console.error("Fetch meeting error:", err)
        if (!isPolling) setError("Failed to load meeting details. Please try again.")
      } finally {
        if (!isPolling) setIsLoading(false)
      }
    }

    fetchMeeting()

    // Start polling if pending or processing
    // We check the current local state or assume we need to poll if we don't have a final state
    if (!meeting || (meeting.status !== 'COMPLETED' && meeting.status !== 'FAILED')) {
      pollInterval = setInterval(() => fetchMeeting(true), 5000)
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
  }, [params.id, isAuthorized, session?.user?.id, meeting?.status])

  // Check if meeting is technical (calculated on backend)
  const isTechnicalMeeting = meeting?.isTechnical || false

  // Terminal Resize Logic
  const [terminalHeight, setTerminalHeight] = useState(192) // 48 * 4
  const [isResizing, setIsResizing] = useState(false)

  const startResizing = useCallback(() => {
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newHeight = window.innerHeight - e.clientY
      if (newHeight > 100 && newHeight < 600) {
        setTerminalHeight(newHeight)
      }
    }
  }, [isResizing])

  const toggleTerminalSize = useCallback(() => {
    setTerminalHeight(prev => prev > 300 ? 192 : 400)
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", resize)
    window.addEventListener("mouseup", stopResizing)
    return () => {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
    }
  }, [resize, stopResizing])

  const tabs = useMemo(() => [
    { id: "transcript", label: "Transcript", icon: MessageSquare, ext: "" },
    { id: "summary", label: "AI Summary", icon: Sparkles, ext: "" },
    { id: "code", label: "Meeting Logic", icon: Code, ext: "", hidden: !isLogicGenerated && !meeting?.code && meeting?.status !== 'PROCESSING' },
    { id: "tests", label: "Compliance", icon: CheckCircle2, ext: "", hidden: !isLogicGenerated && !testResults && !meeting?.testResults && meeting?.status !== 'PROCESSING' },
    { id: "docs", label: "Documentation", icon: FileText, ext: "", hidden: !isLogicGenerated && !planResult && !meeting?.projectDoc && meeting?.status !== 'PROCESSING' },
  ], [isLogicGenerated, meeting?.code, meeting?.testResults, meeting?.projectDoc, testResults, planResult, meeting?.status]) as { id: EditorTab; label: string; icon: React.ComponentType<{ className?: string }>; ext: string; hidden?: boolean }[]

  const [terminalTab, setTerminalTab] = useState<"chat" | "context">("chat")

  const handleGenerateLogic = async () => {
    setIsGeneratingLogic(true)
    
    try {
      const result = await generateMeetingLogic(params.id as string)
      if (result.success && result.data) {
        setMeeting((prev: MeetingWithRelations | null) => prev ? { ...prev, code: result.data! } : null)
        setIsLogicGenerated(true)
        setIsGeneratingLogic(false)
        setActiveTab("code")
        toastVisible("Business logic generated successfully", "success")
      } else {
        toastVisible(result.error || "Failed to generate logic", "error")
        setIsGeneratingLogic(false)
      }
    } catch (error) {
      console.error("Failed to generate logic:", error)
      toastVisible("An unexpected error occurred while generating logic", "error")
      setIsGeneratingLogic(false)
    }
  }

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

  const handleTestCompliance = async () => {
    setIsTestingCompliance(true)
    try {
      const result = await testMeetingCompliance(params.id as string)
      if (result.success && result.data) {
        setTestResults(result.data)
        setMeeting((prev: MeetingWithRelations | null) => 
          prev ? { ...prev, testResults: result.data! } : null
        )
        toastVisible("Compliance tests completed", "success")
      } else {
        toastVisible(result.error || "Failed to run compliance tests", "error")
      }
    } catch (error) {
      console.error("Failed to run compliance tests:", error)
      toastVisible("An unexpected error occurred during compliance testing", "error")
    } finally {
      setIsTestingCompliance(false)
    }
  }

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true)
    try {
      const result = await generateMeetingPlan(params.id as string)
      if (result.success && result.data) {
        setPlanResult(result.data)
        setMeeting((prev: MeetingWithRelations | null) => 
          prev ? { ...prev, projectDoc: result.data! } : null
        )
        toastVisible("Development plan generated", "success")
      } else {
        toastVisible(result.error || "Failed to generate plan", "error")
      }
    } catch (error) {
      console.error("Failed to generate plan:", error)
      toastVisible("An unexpected error occurred while generating plan", "error")
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  const handleDownloadDoc = async () => {
    const docData = planResult || meeting?.projectDoc;
    if (!docData || !docData.includes("Document saved at:")) {
      toastVisible("No downloadable document available", "error");
      return;
    }
    
    try {
      const path = docData.split(": ")[1].trim();
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://api.supersmartx.com:8000";
      const downloadUrl = `${baseUrl}/${path}`;
      const filename = path.split('/').pop() || "project_doc.docx";
      
      await downloadFile(downloadUrl, filename);
      toastVisible("Document download started", "success");
    } catch (error) {
      console.error("Download failed:", error);
      toastVisible("Failed to download document", "error");
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

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    
    setIsAnswering(true)
    setAnswer(null)
    
    try {
      const result = await askAIAboutMeeting(params.id as string, prompt)
      if (result.success && result.data) {
        setAnswer(result.data)
        setPrompt("")
      } else {
        setAnswer(`Error: ${result.error || "Failed to get an answer from AI."}`)
      }
    } catch (error) {
      console.error("Ask AI error:", error)
      setAnswer("An unexpected error occurred. Please try again.")
    } finally {
      setIsAnswering(false)
    }
  }

  const suggestions: string[] = []

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
    },
    { 
      label: "Logic", 
      status: (isLogicGenerated || meeting?.code) ? "completed" as const : meeting?.processingStep === 'CODE_GENERATION' ? 'processing' as const : meeting?.status === 'FAILED' ? 'failed' as const : "pending" as const,
      description: meeting?.processingStep === 'CODE_GENERATION' ? "Synthesizing logic..." : "Translating talk into executable code."
    },
    { 
      label: "Documentation", 
      status: (planResult || meeting?.projectDoc) ? "completed" as const : (meeting?.processingStep === 'TESTING' || meeting?.processingStep === 'DOCUMENTATION') ? 'processing' as const : meeting?.status === 'FAILED' ? 'failed' as const : "pending" as const,
      description: (meeting?.processingStep === 'TESTING' || meeting?.processingStep === 'DOCUMENTATION') ? "Drafting roadmap..." : "Generating final roadmap and tests."
    },
  ]

  const [copyStatus, setCopyStatus] = useState("Copy Code")

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

  const handleCopyCode = () => {
    if (meeting?.code) {
      navigator.clipboard.writeText(meeting.code)
      setCopyStatus("Copied!")
      setTimeout(() => setCopyStatus("Copy Code"), 2000)
    }
  }

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
    <div className={`flex flex-col h-full bg-white dark:bg-zinc-950 overflow-hidden ${isResizing ? 'cursor-row-resize select-none' : ''}`}>
      <Toast {...toast} onClose={hideToast} />
      {/* Editor Header / Breadcrumbs (Local) */}
      <MeetingHeader meeting={meeting} journeySteps={journeySteps} />

      {/* Editor Tab Bar */}
      <MeetingTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Audio Player */}
      {meeting?.audioUrl && (
        <div className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center gap-4 shrink-0 overflow-hidden">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <Video className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Recording</span>
          </div>
          <audio 
            src={meeting.audioUrl} 
            controls 
            className="h-8 flex-1 max-w-2xl filter dark:invert opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>
      )}

      {/* Editor Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-950">
          {/* Search bar for transcript */}
          {activeTab === "transcript" && (
            <div className="px-4 sm:px-8 py-4 border-b border-zinc-100 dark:border-zinc-900 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10">
              <div className="relative max-w-md group">
                <input
                  aria-label="Search transcript"
                  placeholder="Search in transcript..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-via transition-all"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-brand-via" />
              </div>
            </div>
          )}

          <div className="p-4 sm:p-8">
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
              <div className="space-y-8 max-w-3xl">
                {meeting?.transcripts?.length > 0 ? (
                  filteredTranscript.map((item: Transcript, i: number) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0 border border-zinc-200 dark:border-zinc-800 group-hover:border-brand-via transition-colors">
                        {item.speaker[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{renderHighlightedText(item.speaker, searchQuery)}</span>
                          <span className="text-[10px] text-zinc-400 font-medium">{item.time}</span>
                          {item.confidence && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 ml-1">
                              {Math.round(item.confidence * 100)}% Confidence
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          {renderHighlightedText(item.text, searchQuery)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                      <MessageSquare className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-1">No transcript available</h3>
                      <p className="text-[10px] text-zinc-500 font-medium">The transcript for this meeting is currently being processed.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "summary" && (
              <div className="max-w-3xl animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-via/10 flex items-center justify-center border border-brand-via/20">
                      <Sparkles className="w-5 h-5 text-brand-via" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Executive Summary</h2>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">AI-Generated Insights</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all border border-zinc-200 dark:border-zinc-700"
                  >
                    {isGeneratingSummary ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
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

                      {isTechnicalMeeting && !isLogicGenerated && (
                        <div className="bg-zinc-900 dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl shadow-brand-via/20">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-brand-via/20 flex items-center justify-center shrink-0">
                              <Code className="w-5 h-5 sm:w-6 sm:h-6 text-brand-via" />
                            </div>
                            <div>
                              <h4 className="text-xs sm:text-sm font-black text-white dark:text-zinc-900 uppercase tracking-tight">Technical Context Detected</h4>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-widest mt-1 text-center sm:text-left">Generate logic & compliance reports</p>
                            </div>
                          </div>
                          <button 
                            onClick={handleGenerateLogic}
                            disabled={isGeneratingLogic}
                            className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                          >
                            {isGeneratingLogic ? "Generating..." : "Generate Logic"}
                          </button>
                        </div>
                      )}
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

            {activeTab === "code" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-via/10 flex items-center justify-center border border-brand-via/20">
                      <Code className="w-5 h-5 text-brand-via" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Meeting Logic</h2>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Extracted Pseudo-code</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleCopyCode}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copyStatus}
                  </button>
                </div>

                <div className="relative">
                  {isLogicGenerated && meeting?.code && (
                    <div className="absolute -top-3 -right-3 px-3 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg z-10 animate-bounce">
                      Verified Logic
                    </div>
                  )}
                  <div className="bg-zinc-900 rounded-[24px] sm:rounded-[32px] p-4 sm:p-8 border border-zinc-800 shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-via/5 rounded-full -mr-32 -mt-32 blur-[100px]" />
                    <pre className="text-[10px] sm:text-xs md:text-sm font-mono text-zinc-300 leading-relaxed overflow-x-auto custom-scrollbar relative z-10">
                      <code>
                        {meeting?.code || "// No logic code was generated for this meeting context."}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "tests" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-via/10 flex items-center justify-center border border-brand-via/20">
                      <CheckCircle2 className="w-5 h-5 text-brand-via" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Compliance & Testing</h2>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Automated Validation</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleTestCompliance}
                    disabled={isTestingCompliance || !isLogicGenerated}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isTestingCompliance ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    {isTestingCompliance ? "Running Tests..." : "Run Compliance"}
                  </button>
                </div>

                {testResults ? (
                  <div className="space-y-6">
                    <div className="bg-zinc-900 rounded-[24px] sm:rounded-[32px] p-4 sm:p-8 border border-zinc-800 shadow-2xl overflow-hidden relative group">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-[100px]" />
                      <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-4">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest ml-2">Test Execution Output</span>
                      </div>
                      <pre className="text-[10px] sm:text-xs md:text-sm font-mono text-emerald-400/90 leading-relaxed overflow-x-auto custom-scrollbar relative z-10">
                        <code>{testResults}</code>
                      </pre>
                    </div>

                    {/* Logic for showing success/failure badge based on test output */}
                    <div className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        testResults.toLowerCase().includes("fail") || testResults.toLowerCase().includes("error")
                        ? "bg-red-500/10 border-red-500/20 text-red-500"
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                      }`}>
                        {testResults.toLowerCase().includes("fail") || testResults.toLowerCase().includes("error") 
                        ? <ShieldCheck className="w-5 h-5 rotate-180" /> 
                        : <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Validation Status</p>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {testResults.toLowerCase().includes("fail") || testResults.toLowerCase().includes("error")
                          ? "Compliance Issues Detected"
                          : "All Validation Checks Passed"}
                        </h4>
                      </div>
                    </div>
                  </div>
                ) : meeting?.actionItems?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {meeting.actionItems.map((test: ActionItem, i: number) => (
                      <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-[24px] border border-zinc-100 dark:border-zinc-800 hover:border-brand-via/30 transition-all group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </div>
                            <span className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">Action Item {i + 1}</span>
                          </div>
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">Identified</span>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">{test.title}</h4>
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Assigned/Status: {test.status || 'Pending'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] p-12 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center gap-4">
                    <div className="w-20 h-20 rounded-3xl bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-sm">
                      <ShieldCheck className="w-8 h-8 text-zinc-200 dark:text-zinc-700" />
                    </div>
                    <div className="max-w-xs">
                      <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-2">No Action Items</h3>
                      <p className="text-[10px] text-zinc-500 font-medium leading-relaxed uppercase tracking-wider">No specific action items or compliance tasks were identified in this meeting.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "docs" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-via/10 flex items-center justify-center border border-brand-via/20">
                      <FileText className="w-5 h-5 text-brand-via" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Project Documentation</h2>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Implementation Roadmap</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(planResult?.includes("Document saved at:") || meeting?.projectDoc?.includes("Document saved at:")) && (
                      <button 
                        onClick={handleDownloadDoc}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download .docx
                      </button>
                    )}
                    <button 
                      onClick={handleGeneratePlan}
                      disabled={isGeneratingPlan}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-via text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-brand-via/20 disabled:opacity-50"
                    >
                      {isGeneratingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {isGeneratingPlan ? "Building Plan..." : "Generate Plan"}
                    </button>
                  </div>
                </div>

                {planResult || meeting?.projectDoc ? (
                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] sm:rounded-[32px] p-4 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl relative overflow-hidden">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                        {planResult || meeting?.projectDoc}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] p-12 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center gap-4">
                    <div className="w-20 h-20 rounded-3xl bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-sm">
                      <FileText className="w-8 h-8 text-zinc-200 dark:text-zinc-700" />
                    </div>
                    <div className="max-w-xs">
                      <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-2">No Plan Generated</h3>
                      <p className="text-[10px] text-zinc-500 font-medium leading-relaxed uppercase tracking-wider">Click the button above to generate a detailed implementation plan based on the meeting discussions.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Next Steps Guidance */}
            {meeting?.status === 'COMPLETED' && (
              <div className="mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-900 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1.5 h-4 bg-brand-via rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Recommended Next Steps</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setActiveTab("summary")}
                    className="flex flex-col gap-3 p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 hover:border-brand-via/30 hover:bg-white dark:hover:bg-zinc-900 transition-all group text-left"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 group-hover:text-brand-via transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">Review Summary</h4>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-tight">Verify the key takeaways and discussion points.</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-brand-via group-hover:translate-x-1 transition-all mt-auto" />
                  </button>

                  <button 
                    onClick={() => setActiveTab("tests")}
                    className="flex flex-col gap-3 p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 hover:border-brand-via/30 hover:bg-white dark:hover:bg-zinc-900 transition-all group text-left"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 group-hover:text-brand-via transition-colors">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">Track Actions</h4>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-tight">Follow up on assigned tasks and compliance items.</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-brand-via group-hover:translate-x-1 transition-all mt-auto" />
                  </button>

                  <button 
                    onClick={() => setActiveTab("code")}
                    className="flex flex-col gap-3 p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 hover:border-brand-via/30 hover:bg-white dark:hover:bg-zinc-900 transition-all group text-left"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 group-hover:text-brand-via transition-colors">
                      <Code className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">Implement Logic</h4>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-tight">Integrate the generated code into your project.</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-brand-via group-hover:translate-x-1 transition-all mt-auto" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <MeetingTerminal 
          terminalHeight={terminalHeight}
          terminalTab={terminalTab}
          setTerminalTab={setTerminalTab}
          toggleTerminalSize={toggleTerminalSize}
          startResizing={startResizing}
          answer={answer}
          prompt={prompt}
          setPrompt={setPrompt}
          handleAskAI={handleAskAI}
          isAnswering={isAnswering}
          meeting={meeting}
          suggestions={suggestions}
          sessionName={session?.user?.name}
        />
      </div>
    </div>
  )
}
