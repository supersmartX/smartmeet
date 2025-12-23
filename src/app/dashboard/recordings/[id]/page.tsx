"use client"

import { useState, useCallback, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import Link from "next/link"

import { highlightText } from "@/utils/text"
import { mockTranscript, mockCode, mockTests, type TestResult } from "@/data/mock"
import { 
  Clock, 
  Users, 
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
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<EditorTab>("transcript")
  const [prompt, setPrompt] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAnswering, setIsAnswering] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  
  // Logic Generation State
  const [isLogicGenerated, setIsLogicGenerated] = useState(false)
  const [isGeneratingLogic, setIsGeneratingLogic] = useState(false)
  
  // Check if meeting is technical based on keywords
  const isTechnicalMeeting = mockTranscript.some(item => 
    /api|cache|latency|database|testing|backend|frontend|pipeline|logic|code|deploy/i.test(item.text)
  )

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

  const tabs: { id: EditorTab; label: string; icon: React.ComponentType<{ className?: string }>; ext: string; hidden?: boolean }[] = [
    { id: "transcript", label: "Transcript", icon: MessageSquare, ext: "" },
    { id: "summary", label: "AI Summary", icon: Sparkles, ext: "" },
    { id: "code", label: "Meeting Logic", icon: Code, ext: "", hidden: !isLogicGenerated },
    { id: "tests", label: "Compliance", icon: CheckCircle2, ext: "", hidden: !isLogicGenerated },
    { id: "docs", label: "Documentation", icon: FileText, ext: "", hidden: !isLogicGenerated },
  ]

  const [terminalTab, setTerminalTab] = useState<"chat" | "context">("chat")

  const handleGenerateLogic = () => {
    setIsGeneratingLogic(true)
    setTimeout(() => {
      setIsLogicGenerated(true)
      setIsGeneratingLogic(false)
      setActiveTab("code")
    }, 2000)
  }

  useEffect(() => {
    // Persist active tab in URL query params if needed, or local storage
    const savedTab = localStorage.getItem("smartmeet_active_tab") as EditorTab
    if (savedTab && tabs.some(t => t.id === savedTab)) {
      // Use requestAnimationFrame to avoid synchronous state update
      requestAnimationFrame(() => {
        setActiveTab(savedTab)
      })
    }
  }, [tabs])

  const handleTabChange = (tabId: EditorTab) => {
    setActiveTab(tabId)
    localStorage.setItem("smartmeet_active_tab", tabId)
  }

  const filteredTranscript = mockTranscript.filter((item: { speaker: string, text: string }) => 
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
    navigator.clipboard.writeText(mockCode)
    setCopyStatus("Copied!")
    setTimeout(() => setCopyStatus("Copy Code"), 2000)
  }

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-zinc-950 overflow-hidden ${isResizing ? 'cursor-row-resize select-none' : ''}`}>
      {/* Editor Header / Breadcrumbs (Local) */}
      <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <Link href="/dashboard" className="hover:text-brand-via transition-colors">smartmeet</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/dashboard/recordings" className="hover:text-brand-via transition-colors">recordings</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-zinc-900 dark:text-zinc-100">Meeting Analysis</span>
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

      {/* Editor Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-950">
          {/* Search bar for transcript */}
          {activeTab === "transcript" && (
            <div className="px-8 py-4 border-b border-zinc-100 dark:border-zinc-900 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10">
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

          <div className="p-8">
            {activeTab === "transcript" && (
              <div className="space-y-8 max-w-3xl">
                {filteredTranscript.length > 0 ? (
                  filteredTranscript.map((item, i) => (
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
                  {mockTranscript.length > 0 ? (
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] p-8 border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-via/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-brand-via/10 transition-all" />
                      
                      <p className="text-lg text-zinc-900 dark:text-zinc-100 font-bold leading-tight mb-8">
                        The AI analysis for this meeting is complete. You can find the key points and technical context below.
                      </p>

                      <div className="grid grid-cols-1 gap-4 mb-8">
                        {/* Summary points would be rendered here when available */}
                      </div>

                      {isTechnicalMeeting && !isLogicGenerated && (
                        <div className="bg-zinc-900 dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-[24px] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl shadow-brand-via/20">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-brand-via/20 flex items-center justify-center shrink-0">
                              <Code className="w-6 h-6 text-brand-via" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white dark:text-zinc-900 uppercase tracking-tight">Technical Context Detected</h4>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-widest mt-1">Generate logic & compliance reports</p>
                            </div>
                          </div>
                          <button 
                            onClick={handleGenerateLogic}
                            disabled={isGeneratingLogic}
                            className="w-full sm:w-auto bg-brand-gradient text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                          >
                            {isGeneratingLogic ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> GENERATING...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" /> GENERATE LOGIC
                              </>
                            )}
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
              <div className="animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-brand-via" />
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Generated Logic</h3>
                  </div>
                  {isLogicGenerated && mockCode && (
                    <button 
                      onClick={handleCopyCode}
                      className="flex items-center gap-2 text-[10px] font-bold text-brand-via hover:underline uppercase tracking-widest"
                    >
                      <Copy className={`w-3 h-3 ${copyStatus === "Copied!" ? "animate-bounce" : ""}`} /> {copyStatus}
                    </button>
                  )}
                </div>
                {isLogicGenerated ? (
                  <div className="bg-[#1e1e1e] rounded-xl p-6 font-mono text-sm leading-relaxed overflow-x-auto border border-white/5 shadow-2xl">
                    <pre className="text-zinc-300">
                      {mockCode || "// No logic code was generated for this meeting context."}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] p-12 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center gap-4">
                    <div className="w-20 h-20 rounded-3xl bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-sm">
                      <Code className="w-8 h-8 text-zinc-200 dark:text-zinc-700" />
                    </div>
                    <div className="max-w-xs">
                      <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-2">No Logic Generated</h3>
                      <p className="text-[10px] text-zinc-500 font-medium leading-relaxed uppercase tracking-wider">The technical logic for this meeting has not been generated yet.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "tests" && (
              <div className="animate-in fade-in duration-500 max-w-3xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Compliance & Tests</h2>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Automated Validation Reports</p>
                    </div>
                  </div>
                  {mockTests.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Health Score</span>
                      <span className="text-sm font-black text-emerald-600">92%</span>
                    </div>
                  )}
                </div>

                {mockTests.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Security Checks</span>
                        <div className="flex items-end justify-between">
                          <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">14/14</span>
                          <span className="text-[10px] font-bold text-emerald-500">Passed</span>
                        </div>
                      </div>
                      <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Performance Metrics</span>
                        <div className="flex items-end justify-between">
                          <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">3/4</span>
                          <span className="text-[10px] font-bold text-amber-500">1 Warning</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {mockTests.map((test: TestResult, i: number) => (
                        <div key={i} className="flex items-center justify-between p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 group hover:border-brand-via/30 transition-all shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              test.status === "passed" 
                                ? "bg-emerald-500/10 text-emerald-500" 
                                : "bg-red-500/10 text-red-500"
                            }`}>
                              {test.status === "passed" ? <CheckCircle2 className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{test.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">{test.duration}</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-200" />
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Level: Critical</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {test.error && (
                              <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-3 py-1 rounded-full uppercase tracking-widest border border-red-500/20">{test.error}</span>
                            )}
                            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] p-12 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center gap-4">
                    <div className="w-20 h-20 rounded-3xl bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-sm">
                      <ShieldCheck className="w-8 h-8 text-zinc-200 dark:text-zinc-700" />
                    </div>
                    <div className="max-w-xs">
                      <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-2">No Compliance Data</h3>
                      <p className="text-[10px] text-zinc-500 font-medium leading-relaxed uppercase tracking-wider">Automated compliance checks will appear here once the meeting logic is finalized.</p>
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
                      Hello {user?.name}! {mockTranscript.length > 0 ? "I've analyzed the transcript. You can ask me anything about the meeting discussions, blockers, or next steps." : "The transcript is still being processed. Once it's ready, I can help you analyze the meeting content."}
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
                        "{prompt}"
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
                        <div className={`w-1.5 h-1.5 rounded-full ${mockTranscript.length > 0 ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Top Participants</h4>
                  <div className="space-y-3">
                    {mockTranscript.length > 0 ? (
                      mockTranscript.slice(0, 3).map((item, i) => (
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
