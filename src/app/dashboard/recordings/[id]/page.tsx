"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import Link from "next/link"

import { 
  Mic, 
  Clock, 
  Users, 
  Download, 
  Share2, 
  Search, 
  ArrowLeft, 
  Sparkles, 
  Send,
  FileText,
  MessageSquare,
  Code,
  CheckCircle2,
  ChevronRight,
  Copy
} from "lucide-react"

/* ----------------------------- ICONS ----------------------------- */

const MicIcon = () => <Mic className="w-4 h-4" />
const ClockIcon = () => <Clock className="w-4 h-4" />
const UsersIcon = () => <Users className="w-4 h-4" />
const DownloadIcon = () => <Download className="w-4 h-4" />
const ShareIcon = () => <Share2 className="w-4 h-4" />

/* ----------------------------- DATA ------------------------------ */

type PipelineStep = "audio" | "stt" | "summary" | "code" | "tests"
type LeftTab = "transcript" | "summary"
type RightTab = "code" | "tests"

const mockTranscript = [
  {
    speaker: "Ehsan",
    time: "10:03",
    text: "Let’s review sprint progress and identify blockers before we finalize the AI pipeline."
  },
  {
    speaker: "Ava",
    time: "10:04",
    text: "The Meeting Details screen is ready. I want to validate transcript-to-comment interactions."
  },
  {
    speaker: "Harry",
    time: "10:06",
    text: "Transcript search API works locally, but latency increases under heavy load. I’m testing caching."
  },
  {
    speaker: "Mary",
    time: "10:09",
    text: "User testing showed strong preference for a minimal layout. Some requested a compact mode."
  }
]

const mockCode = `def get_transcript_with_cache(recording_id: str):
    """
    Proposed caching solution for search latency issues
    identified during Dec 22nd Standup.
    """
    cache_key = f"transcript_{recording_id}"
    cached_data = redis_client.get(cache_key)
    
    if cached_data:
        return json.loads(cached_data)
        
    transcript = db.fetch_transcript(recording_id)
    redis_client.setex(cache_key, 3600, json.dumps(transcript))
    return transcript`

const mockTests = [
  { name: "Cache Hit Latency", status: "passed", duration: "12ms" },
  { name: "DB Fallback Logic", status: "passed", duration: "145ms" },
  { name: "Search Index Consistency", status: "passed", duration: "89ms" },
  { name: "API Rate Limiting", status: "failed", duration: "0ms", error: "429 Too Many Requests" }
]

/* --------------------------- COMPONENT ---------------------------- */

export default function RecordingDetailPage() {
  const { user } = useAuth()
  const [leftTab, setLeftTab] = useState<LeftTab>("transcript")
  const [rightTab, setRightTab] = useState<RightTab>("code")
  const [prompt, setPrompt] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAnswering, setIsAnswering] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)

  const filteredTranscript = mockTranscript.filter((item: { speaker: string, text: string }) => 
    item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.speaker.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const steps: { key: PipelineStep; label: string; icon: string }[] = [
    { key: "audio", label: "Audio Input", icon: "🎤" },
    { key: "stt", label: "Speech-to-Text", icon: "🗣️" },
    { key: "summary", label: "Summarization", icon: "📝" },
    { key: "code", label: "Code Generation", icon: "💻" },
    { key: "tests", label: "Testing", icon: "✅" },
  ]

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    
    setIsAnswering(true)
    setAnswer(null)
    
    // Mock AI response
    const timer = setTimeout(() => {
      setAnswer(`Based on the transcript, the main blockers discussed were search latency and QA sign-off. Harry is currently testing caching to resolve the latency issues.`)
      setIsAnswering(false)
    }, 1500)
    return () => clearTimeout(timer)
  }

  return (
    <div className="flex flex-col h-auto lg:h-full bg-zinc-50 dark:bg-black overflow-visible lg:overflow-hidden">
      {/* ---------------- HEADER ---------------- */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-8 py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 shrink-0 shadow-sm relative z-20">
        <div className="flex flex-col">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/dashboard" className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-brand-via hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all group">
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight leading-none mb-1.5">
                Product Team Standup
              </h1>
              <p className="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest">Recorded on Dec 22, 2025 • AI Analysis Complete</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex flex-wrap items-center gap-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 px-3 sm:px-4 py-2 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm"><MicIcon /> Recording</span>
            <span className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 px-3 sm:px-4 py-2 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm"><ClockIcon /> 18 min</span>
            <span className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 px-3 sm:px-4 py-2 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm"><UsersIcon /> 9 people</span>
          </div>

          <div className="h-8 w-[1px] bg-zinc-200 dark:bg-zinc-800 hidden lg:block mx-2" />

          <div className="flex gap-3">
            <button className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm">
              <DownloadIcon /> Export
            </button>
            <button className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-gradient text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-glow">
              <ShareIcon /> Share
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- BODY ---------------- */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">

        {/* -------- PRIMARY COLUMN -------- */}
        <section className="flex-1 lg:w-[65%] border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-950 min-h-0 overflow-visible lg:overflow-hidden">

          {/* Pipeline Status Bar */}
          <div className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-8 py-5 flex items-center justify-start gap-8 overflow-x-auto custom-scrollbar no-scrollbar">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center gap-6 shrink-0 group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-sm group-hover:border-brand-via/50 group-hover:shadow-md transition-all">
                    <span className="text-lg group-hover:scale-110 transition-transform">{step.icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">{step.label}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">Complete</span>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="text-zinc-300 dark:text-zinc-700">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sticky context */}
          <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md z-20 border-b border-zinc-100 dark:border-zinc-900 shadow-sm sticky top-0">
            <div className="flex flex-wrap gap-2 px-4 sm:px-8 pt-6">
              {(["transcript", "summary"] as LeftTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setLeftTab(tab)}
                  className={`flex-1 sm:flex-initial px-4 sm:px-6 py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    leftTab === tab
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg shadow-black/10"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  {tab === "transcript" ? (
                    <>
                      <MessageSquare className="w-3.5 h-3.5" />
                      Speech-to-Text
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      Summarization
                    </>
                  )}
                </button>
              ))}
            </div>

            <div className="px-4 sm:px-8 py-5">
              <div className="relative group max-w-md">
                <input
                  placeholder="Search transcript…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-2 border-zinc-100 dark:border-zinc-800 rounded-xl pl-12 pr-5 py-3 text-sm focus:outline-none focus:border-brand-via transition-all bg-zinc-50/50 dark:bg-zinc-900/50 dark:text-zinc-100"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-10 space-y-10 custom-scrollbar">

            {leftTab === "transcript" &&
              filteredTranscript.map((item, i: number) => (
                <article key={i} className="flex gap-4 sm:gap-6 max-w-[65ch] group">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-100 dark:bg-zinc-900 border-2 border-zinc-50 dark:border-zinc-800 flex items-center justify-center font-black text-zinc-400 dark:text-zinc-600 shrink-0 group-hover:bg-brand-gradient group-hover:text-white group-hover:border-transparent transition-all shadow-sm">
                    {item.speaker[0]}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-black text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">{item.speaker}</span>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest bg-zinc-50 dark:bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-100 dark:border-zinc-800">{item.time}</span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-sm sm:text-[15px] font-medium">
                      {item.text}
                    </p>
                  </div>
                </article>
              ))}

            {leftTab === "summary" && (
              <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-brand-gradient p-[1px] rounded-[24px] sm:rounded-[32px] shadow-glow">
                    <div className="bg-white dark:bg-zinc-950 p-6 sm:p-10 rounded-[23px] sm:rounded-[31px]">
                      <h3 className="text-lg sm:text-xl font-black mb-6 flex items-center gap-3 tracking-tight">
                          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-brand-via" />
                          <span className="text-brand-gradient">AI Executive Summary</span>
                      </h3>
                      <div className="space-y-6 text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                          <p className="text-base sm:text-lg text-zinc-900 dark:text-zinc-100 font-black tracking-tight leading-snug">The team discussed the upcoming AI pipeline finalization and identified several key blockers in the backend latency.</p>
                          <ul className="space-y-4">
                              <li className="flex items-start gap-4">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-brand-via/10 flex items-center justify-center mt-0.5 shrink-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-via" />
                                </div>
                                <span className="text-sm sm:text-base"><strong className="text-zinc-900 dark:text-zinc-100 font-black uppercase tracking-widest text-[9px] sm:text-[10px] block mb-1">Backend</strong> Deployment is pending final QA sign-off.</span>
                              </li>
                              <li className="flex items-start gap-4">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-brand-via/10 flex items-center justify-center mt-0.5 shrink-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-via" />
                                </div>
                                <span className="text-sm sm:text-base"><strong className="text-zinc-900 dark:text-zinc-100 font-black uppercase tracking-widest text-[9px] sm:text-[10px] block mb-1">Search</strong> Latency issues identified in local testing, caching solution proposed.</span>
                              </li>
                              <li className="flex items-start gap-4">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-brand-via/10 flex items-center justify-center mt-0.5 shrink-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-via" />
                                </div>
                                <span className="text-sm sm:text-base"><strong className="text-zinc-900 dark:text-zinc-100 font-black uppercase tracking-widest text-[9px] sm:text-[10px] block mb-1">UI/UX</strong> Minimal layout preferred by test users, compact mode requested.</span>
                              </li>
                          </ul>
                      </div>
                    </div>
                  </div>
              </div>
            )}
          </div>

          {/* AI Prompt */}
          <div className="border-t border-zinc-100 dark:border-zinc-900 px-4 sm:px-8 py-6 sm:py-8 bg-zinc-50/30 dark:bg-zinc-900/30">
            {answer && (
                <div className="max-w-3xl mx-auto mb-6 sm:mb-8 bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border-2 border-zinc-50 dark:border-zinc-800 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex gap-4 sm:gap-6">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-brand-gradient flex items-center justify-center text-white shrink-0 shadow-glow">
                          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="font-black text-brand-gradient uppercase tracking-[0.2em] text-[9px] sm:text-[10px] mb-2">Smartmeet AI Response</p>
                            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                              {answer}
                            </p>
                        </div>
                    </div>
                </div>
            )}
            <form onSubmit={handleAskAI} className="relative max-w-3xl mx-auto group">
              <input
                  placeholder="Ask Smartmeet AI about this meeting…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl pl-6 sm:pl-8 pr-16 py-4 sm:py-5 text-sm shadow-xl shadow-black/5 focus:outline-none focus:border-brand-via bg-white dark:bg-zinc-900 dark:text-zinc-100 transition-all group-hover:shadow-2xl"
              />
              <button 
                type="submit"
                disabled={isAnswering || !prompt.trim()}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-30 disabled:scale-100"
              >
                  {isAnswering ? (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-zinc-500 border-t-zinc-900 dark:border-zinc-300 dark:border-t-zinc-100 rounded-full animate-spin" />
                  ) : (
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
              </button>
            </form>
          </div>
        </section>

        {/* -------- SECONDARY COLUMN -------- */}
        <aside className="w-full lg:w-[35%] flex flex-col bg-zinc-50/50 dark:bg-black/50 overflow-visible lg:overflow-hidden border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 h-auto lg:h-full shrink-0 lg:shrink">

          {/* Output Tabs */}
          <div className="px-8 pt-10">
            <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 rounded-2xl p-1.5 border border-zinc-200/30 dark:border-zinc-700/30 shadow-inner">
              {(["code", "tests"] as RightTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 ${
                    rightTab === tab
                      ? "bg-white dark:bg-zinc-900 shadow-lg text-zinc-900 dark:text-zinc-100 border border-zinc-100 dark:border-zinc-800"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {tab === "code" ? (
                    <>
                      <Code className="w-3.5 h-3.5" />
                      Code Output
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Test Results
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Output Content */}
          <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">

            {rightTab === "code" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Python Caching Logic</h4>
                  <button className="flex items-center gap-2 text-[10px] font-black text-brand-via hover:text-brand-to uppercase tracking-widest transition-all group">
                    <Copy className="w-3 h-3 group-hover:scale-110 transition-transform" />
                    Copy Code
                  </button>
                </div>
                <div className="bg-[#0a0a0a] rounded-[32px] p-8 overflow-x-auto border border-zinc-800 shadow-2xl shadow-black/40 relative group">
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <pre className="text-xs font-mono text-zinc-300 leading-relaxed">
                    <code>{mockCode}</code>
                  </pre>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border-2 border-zinc-50 dark:border-zinc-800 shadow-sm">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold italic leading-relaxed text-center">
                    "AI generated based on technical discussion about caching and search latency."
                  </p>
                </div>
              </div>
            )}

            {rightTab === "tests" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <h4 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] px-2">Automated Test Pipeline</h4>
                <div className="space-y-3">
                  {mockTests.map((test, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-900 p-5 rounded-[24px] border-2 border-zinc-50 dark:border-zinc-800 shadow-sm flex items-center justify-between group hover:border-brand-via/30 transition-all hover:shadow-md">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{test.name}</span>
                        {test.error && <span className="text-[10px] text-rose-500 font-mono font-black uppercase tracking-widest">{test.error}</span>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border ${
                          test.status === "passed" 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50" 
                            : "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50"
                        }`}>
                          {test.status}
                        </span>
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-600 font-mono font-black uppercase">{test.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-8 bg-zinc-900 dark:bg-white rounded-[32px] border border-zinc-800 dark:border-zinc-100 shadow-glow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gradient opacity-10 blur-3xl group-hover:opacity-20 transition-opacity" />
                  <p className="text-[11px] text-zinc-300 dark:text-zinc-600 text-center font-black uppercase tracking-widest leading-relaxed relative z-10">
                    AI successfully validated 3/4 pipeline steps. <span className="text-rose-400 dark:text-rose-500">1 blocker remaining</span>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
