"use client"

import { useState, useMemo } from "react"
import { 
  Book, 
  MessageSquare, 
  Mail, 
  FileText,
  ChevronRight, 
  Search,
  Zap,
  Shield,
  Video,
  Activity
} from "lucide-react"

const categories = [
  { title: "Getting Started", icon: Zap, desc: "Learn how to use the AI pipeline effectively." },
  { title: "Recordings", icon: Video, desc: "Manage and process your meeting recordings." },
  { title: "Security & Privacy", icon: Shield, desc: "How we protect your data and API keys." },
]

const faqs = [
  { 
    q: "How does the AI transcription work?", 
    a: "SupersmartX uses advanced neural models to convert audio into text. Once uploaded, our pipeline processes the audio through multiple stages: transcription, summarization, and logic extraction (Code) using your provided API key." 
  },
  { 
    q: "Is my data secure?", 
    a: "Absolutely. Your audio files are stored in secure Supabase storage buckets with restricted access. API keys are encrypted using AES-256 before being stored in our database. We never share your meeting data with third parties." 
  },
  { 
    q: "How do I use my own API Key?", 
    a: "You can add your OpenAI or compatible API key in the Settings page. This key is used to power the AI processing for your specific meetings, ensuring you have full control over your usage and costs." 
  },
  { 
    q: "What audio formats are supported?", 
    a: "We support common audio formats including MP3, WAV, and M4A. For best results, we recommend clear audio with minimal background noise." 
  },
  { 
    q: "Can I export my meeting results?", 
    a: "Yes! You can view and copy the transcription, summary, and generated logic directly from the recording details page. We are also working on PDF and JSON export features." 
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs
    const query = searchQuery.toLowerCase()
    return faqs.filter(faq => 
      faq.q.toLowerCase().includes(query) || 
      faq.a.toLowerCase().includes(query)
    )
  }, [searchQuery])

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full flex flex-col gap-10 animate-in fade-in duration-700">
      {/* Header */}
      <header className="text-center space-y-4">
        <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">How can we help?</h1>
        <div className="max-w-xl mx-auto relative group">
          <input 
            type="text" 
            placeholder="Search for answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-brand-via/5 focus:border-brand-via transition-all shadow-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
        </div>
      </header>

      {/* System Status Quick Check */}
      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-5 h-5 text-emerald-500" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">System Status</p>
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">AI Processing Pipeline is Operational</p>
          </div>
        </div>
        <div className="hidden sm:block">
          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md uppercase tracking-tighter">99.9% Uptime</span>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat, i) => (
          <button key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:border-brand-via/30 transition-all text-left group">
            <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <cat.icon className="w-6 h-6 text-brand-via" />
            </div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight mb-2">{cat.title}</h3>
            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">{cat.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* FAQs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-[0.2em]">Frequently Asked Questions</h2>
            {searchQuery && (
              <span className="text-[10px] font-bold text-zinc-400 uppercase">
                {filteredFaqs.length} results
              </span>
            )}
          </div>
          <div className="space-y-3">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, i) => (
                <details key={i} className="group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                  <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{faq.q}</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-5 pb-5 text-[11px] text-zinc-500 font-medium leading-relaxed border-t border-zinc-50 dark:border-zinc-800 pt-4">
                    {faq.a}
                  </div>
                </details>
              ))
            ) : (
              <div className="py-12 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <Search className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">No results found</p>
                <p className="text-[10px] text-zinc-500">Try searching for something else</p>
              </div>
            )}
          </div>
        </div>

        {/* Support Sidebar */}
        <div className="space-y-6">
          <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-[0.2em]">Contact Support</h2>
          <div className="bg-brand-gradient p-px rounded-3xl">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[23px] space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-brand-via" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Live Chat</p>
                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Online Now</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Email Support</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Response in 24h</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => window.location.href = 'mailto:support@supersmartx.ai'}
                className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg"
              >
                Start Conversation
              </button>
            </div>
          </div>

          <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
            <Book className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-1">Developer Docs</p>
            <p className="text-[9px] text-zinc-500 font-medium mb-4">Integrate SupersmartX into your own apps.</p>
            <button className="text-[9px] font-black text-brand-via uppercase tracking-widest hover:underline flex items-center gap-1 mx-auto">
              Read Documentation <FileText className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
