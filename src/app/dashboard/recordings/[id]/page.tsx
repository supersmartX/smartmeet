"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useParams } from "next/navigation"
import Script from "next/script"

import { highlightText } from "@/utils/text"
import { getMeetingById, updateMeetingCode } from "@/actions/meeting"
import { 
  Clock, 
  Users, 
  Video,
  Share2, 
  Search, 
  Sparkles, 
  Send,
  FileText,
  MessageSquare,
  Code,
  CheckCircle2,
  ChevronRight,
  Copy,
  Loader2,
  Zap,
  ShieldCheck
} from "lucide-react"

/* --------------------------- COMPONENT ---------------------------- */

type EditorTab = "transcript" | "summary" | "code" | "tests" | "docs"

export default function RecordingDetailPage() {
  const params = useParams()
  interface Meeting {
    id: string;
    title: string;
    date: Date;
    duration?: string;
    participants?: number;
    status: string;
    userId: string;
    code?: string;
    audioUrl?: string;
    transcripts: Transcript[];
    summary?: Summary;
    actionItems: ActionItem[];
  }

  interface Transcript {
    id: string;
    speaker: string;
    time: string;
    text: string;
  }

  interface Summary {
    id: string;
    content: string;
  }

  interface ActionItem {
    id: string;
    title: string;
    status: string;
    content?: string;
  }

  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<EditorTab>("transcript")
  const [prompt, setPrompt] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAnswering, setIsAnswering] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)

  // Logic Generation State
  const [isLogicGenerated, setIsLogicGenerated] = useState(false)
  const [isGeneratingLogic, setIsGeneratingLogic] = useState(false)
  
  // SSR Protection: Check authentication and authorization
  const { data: session, status } = useSession()
  const [isAuthorized, setIsAuthorized] = useState(false)
  
  useEffect(() => {
    // Check authentication
    if (status === 'unauthenticated') {
      setError("Please sign in to view this meeting.")
      setIsLoading(false)
      return
    }
    
    if (status === 'authenticated' && session?.user?.id) {
      setIsAuthorized(true)
    }
  }, [status, session])
  
  useEffect(() => {
    if (!isAuthorized || !params.id) return
    
    const fetchMeeting = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const data = await getMeetingById(params.id as string)
        if (!data) {
          setError("Meeting not found.")
        } else if (data.userId !== session?.user?.id) {
          setError("You don't have permission to view this meeting.")
        } else {
          setMeeting(data)
          if (data?.code) {
            setIsLogicGenerated(true)
          }
        }
      } catch (err) {
        setError("Failed to load meeting details. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchMeeting()
  }, [params.id])

  // Check if meeting is technical based on keywords
  const isTechnicalMeeting = meeting?.transcripts?.some((item: Transcript) => 
    /api|cache|latency|database|testing|backend|frontend|pipeline|logic|code|deploy/i.test(item.text)
  ) || false

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
    { id: "code", label: "Meeting Logic", icon: Code, ext: "", hidden: !isLogicGenerated },
    { id: "tests", label: "Compliance", icon: CheckCircle2, ext: "", hidden: !isLogicGenerated },
    { id: "docs", label: "Documentation", icon: FileText, ext: "", hidden: !isLogicGenerated },
  ], [isLogicGenerated]) as { id: EditorTab; label: string; icon: React.ComponentType<{ className?: string }>; ext: string; hidden?: boolean }[]

  const [terminalTab, setTerminalTab] = useState<"chat" | "context">("chat")

  const handleGenerateLogic = async () => {
    setIsGeneratingLogic(true)
    
    // Mock code generation logic
    const mockCode = `// Generated Meeting Logic for: ${meeting?.title}\n\n/**\n * Key Decisions & Business Logic extracted from discussion\n */\n\nfunction processMeetingOutcome() {\n  const decisions = [\n    "Adopt new authentication provider",\n    "Implement Redis for session caching",\n    "Migrate to Prisma ORM v6"\n  ];\n\n  return decisions.map(d => ({\n    task: d,\n    priority: "High",\n    status: "TODO"\n  }));\n}\n\n// Action Items Count: ${meeting?.actionItems?.length || 0}`

    try {
      await updateMeetingCode(params.id as string, mockCode)
      setMeeting((prev: Meeting | null) => prev ? { ...prev, code: mockCode } : null)
      setIsLogicGenerated(true)
      setIsGeneratingLogic(false)
      setActiveTab("code")
    } catch (error) {
      console.error("Failed to generate logic:", error)
      setIsGeneratingLogic(false)
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

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    
    setIsAnswering(true)
    setAnswer(null)
    
    const timer = setTimeout(() => {
      setAnswer(`I've analyzed the transcript and summary. Based on the current meeting data, there are no specific blockers or action items detected yet. How else can I help?`)
      setIsAnswering(false)
    }, 1500)
    return () => clearTimeout(timer)
  }

  const suggestions: string[] = []

  const journeySteps = [
    { label: "Captured", status: "completed" as const },
    { label: "Transcribed", status: "completed" as const },
    { label: "AI Summary", status: "completed" as const },
    { label: "Logic", status: isLogicGenerated ? ("completed" as const) : ("pending" as const) },
    { label: "Documentation", status: isLogicGenerated ? ("completed" as const) : ("pending" as const) },
  ]

  const [copyStatus, setCopyStatus] = useState("Copy Code")

  const handleCopyCode = () => {
    if (meeting?.code) {
      navigator.clipboard.writeText(meeting.code)
      setCopyStatus("Copied!")
      setTimeout(() => setCopyStatus("Copy Code"), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-via/10 flex items-center justify-center border border-brand-via/20">
            <Loader2 className="w-6 h-6 text-brand-via animate-spin" />
          </div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Loading session intelligence...</p>
        </div>
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-black p-8">
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
                onClick={() => window.location.reload()}
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
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Access Denied</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">You don't have permission to view this meeting.</p>
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
      {/* Editor Header / Breadcrumbs (Local) */}
      <div className="h-auto min-h-10 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between px-4 py-2 sm:py-0 shrink-0 gap-3">
        <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest overflow-hidden shrink-0">
            <Link href="/dashboard" className="hover:text-brand-via transition-colors shrink-0 hidden xs:inline">smartmeet</Link>
            <ChevronRight className="w-3 h-3 shrink-0 hidden xs:inline" />
            <Link href="/dashboard/recordings" className="hover:text-brand-via transition-colors shrink-0">recordings</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-zinc-900 dark:text-zinc-100 truncate max-w-[100px] xs:max-w-none">Analysis</span>
          </div>
          
          <div className="hidden xl:flex items-center gap-6 ml-6 pl-6 border-l border-zinc-200 dark:border-zinc-800">
            {journeySteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 group relative">
                <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
                  step.status === 'completed' 
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                    : 'bg-zinc-300 dark:bg-zinc-700'
                }`} />
                <div className="flex flex-col">
                  <span className={`text-[8px] font-black uppercase tracking-tighter leading-none ${
                    step.status === 'completed' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'
                  }`}>
                    {step.label}
                  </span>
                  <span className="text-[7px] font-bold text-zinc-400 uppercase tracking-tighter">
                    {step.status === 'completed' ? 'Verified' : 'Pending'}
                  </span>
                </div>
                {i < journeySteps.length - 1 && <div className="w-6 h-[1px] bg-zinc-200 dark:bg-zinc-800 ml-2" />}
                
                {/* Hover Tooltip */}
                <div className="absolute top-full left-0 mt-2 py-1 px-2 bg-zinc-900 text-white text-[7px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  Step {i + 1}: {step.label} {step.status === 'completed' ? 'Successful' : 'In Progress'}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400">
            <Clock className="w-3 h-3" /> --m
            <Users className="w-3 h-3 ml-2" /> --
          </div>
          <div className="h-4 w-[1px] bg-zinc-200 dark:border-zinc-800" />
          <button className="text-[10px] font-bold text-brand-via hover:underline uppercase tracking-widest flex items-center gap-1.5">
            <Share2 className="w-3 h-3" /> Share
          </button>
        </div>
      </div>

      {/* Editor Tab Bar */}
      <div className="flex bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar shrink-0">
        {tabs.filter(t => !t.hidden).map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-[11px] border-r border-zinc-200 dark:border-zinc-800 transition-all min-w-[120px] relative group ${
                isActive 
                  ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" 
                  : "text-zinc-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-900/50"
              }`}
            >
              {isActive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-via" />}
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-brand-via" : "text-zinc-400"}`} />
              <span className="truncate font-medium">{tab.label}{tab.ext}</span>
            </button>
          )
        })}
      </div>

      {/* Audio Player */}
      {meeting?.audioUrl && (
        <div className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center gap-4 shrink-0 overflow-hidden">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <Video className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Recording</span>
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
                  placeholder="Search in transcript..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-via transition-all"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-brand-via" />
              </div>
            </div>
          )}

          <div className="p-4 sm:p-8">
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
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-brand-via/10 flex items-center justify-center border border-brand-via/20">
                    <Sparkles className="w-5 h-5 text-brand-via" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Executive Summary</h2>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">AI-Generated Insights</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {meeting?.transcripts?.length > 0 ? (
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
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-brand-via/10 flex items-center justify-center border border-brand-via/20">
                    <CheckCircle2 className="w-5 h-5 text-brand-via" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Compliance & Testing</h2>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Automated Validation</p>
                  </div>
                </div>

                {meeting?.actionItems?.length > 0 ? (
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
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">{test.content}</h4>
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
          </div>
        </div>

        {/* Editor Terminal (AI Chat) */}
        <div 
          style={{ height: terminalHeight }}
          className="border-t border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50 dark:bg-zinc-900/50 shrink-0 relative"
        >
          {/* Terminal Tabs */}
          <div className="flex bg-zinc-100/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 px-4 shrink-0">
            <button 
              onClick={() => setTerminalTab("chat")}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                terminalTab === "chat" ? "text-brand-via" : "text-zinc-400"
              }`}
            >
              AI Assistant
              {terminalTab === "chat" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-via" />}
            </button>
            <button 
              onClick={() => setTerminalTab("context")}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                terminalTab === "context" ? "text-brand-via" : "text-zinc-400"
              }`}
            >
              Technical Context
              {terminalTab === "context" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-via" />}
            </button>
          </div>

          {/* Resize Handle */}
          <div 
            onMouseDown={startResizing}
            className="absolute -top-1 left-0 right-0 h-2 cursor-row-resize z-30 group"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full group-hover:bg-brand-via transition-colors" />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {terminalTab === "chat" ? (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="w-8 h-8 rounded-lg bg-brand-via/10 flex items-center justify-center shrink-0 border border-brand-via/20">
                    <Sparkles className="w-4 h-4 text-brand-via" />
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl rounded-tl-none border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                      Hello {session?.user?.name}! {meeting?.transcripts?.length > 0 ? "I've analyzed the transcript. You can ask me anything about the meeting discussions, blockers, or next steps." : "The transcript is still being processed. Once it's ready, I can help you analyze the meeting content."}
                    </p>
                  </div>
                </div>

                {answer && (
                  <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="w-8 h-8 rounded-lg bg-brand-via/10 flex items-center justify-center shrink-0 border border-brand-via/20">
                      <Sparkles className="w-4 h-4 text-brand-via" />
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl rounded-tl-none border border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <p className="text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed font-medium italic">
                        &quot;{prompt}&quot;
                      </p>
                      <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-3" />
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                        {answer}
                      </p>
                    </div>
                  </div>
                )}
                
                {!answer && !isAnswering && suggestions.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                    {suggestions.map((s, i) => (
                      <button 
                        key={i}
                        onClick={() => {
                          setPrompt(s)
                          const mockEvent = { preventDefault: () => {} } as React.FormEvent
                          handleAskAI(mockEvent)
                        }}
                        className="p-3 text-left bg-zinc-100/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl transition-all group"
                      >
                        <p className="text-[10px] font-bold text-zinc-500 group-hover:text-brand-via transition-colors">{s}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
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
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Pipeline Status</h4>
                  <div className="space-y-2">
                    {['Transcription', 'Diarization', 'Context Extraction', 'Logic Generation'].map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${meeting?.transcripts?.length > 0 ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Top Participants</h4>
                  <div className="space-y-3">
                    {meeting?.transcripts?.length > 0 ? (
                      meeting.transcripts.slice(0, 3).map((item: Transcript, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">{item.speaker}</span>
                          <span className="text-[10px] font-bold text-zinc-400">Analyzing...</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-zinc-500 font-medium">No participant data available yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
            <form onSubmit={handleAskAI} className="max-w-4xl mx-auto relative group">
              <input 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask your AI meeting assistant..."
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-12 py-3 text-xs focus:outline-none focus:ring-4 focus:ring-brand-via/10 focus:border-brand-via transition-all"
              />
              <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
              <button 
                type="submit"
                disabled={isAnswering || !prompt.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-via text-white rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 shadow-glow"
              >
                {isAnswering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
