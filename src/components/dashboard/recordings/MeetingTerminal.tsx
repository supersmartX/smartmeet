import { Minimize2, Maximize2, Sparkles, Send, Loader2 } from "lucide-react"
import { MeetingWithRelations, Transcript } from "@/types/meeting"
import { FormEvent } from "react"

interface MeetingTerminalProps {
  terminalHeight: number
  terminalTab: "chat" | "context"
  setTerminalTab: (tab: "chat" | "context") => void
  toggleTerminalSize: () => void
  startResizing: () => void
  answer: string | null
  prompt: string
  setPrompt: (prompt: string) => void
  handleAskAI: (e?: FormEvent, overridePrompt?: string) => void
  isAnswering: boolean
  meeting: MeetingWithRelations | null
  suggestions: string[]
  sessionName?: string | null
}

export function MeetingTerminal({
  terminalHeight,
  terminalTab,
  setTerminalTab,
  toggleTerminalSize,
  startResizing,
  answer,
  prompt,
  setPrompt,
  handleAskAI,
  isAnswering,
  meeting,
  suggestions,
  sessionName
}: MeetingTerminalProps) {
  return (
    <div 
      style={{ height: terminalHeight }}
      className="border-t border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50 dark:bg-zinc-900/50 shrink-0 relative transition-[height] duration-300 ease-in-out"
    >
      {/* Terminal Tabs */}
      <div className="flex bg-zinc-100/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 px-4 shrink-0 justify-between items-center">
        <div className="flex">
          <button 
            onClick={() => setTerminalTab("chat")}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all relative ${
              terminalTab === "chat" ? "text-brand-via" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            AI Assistant
            {terminalTab === "chat" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-via" />}
          </button>
          <button 
            onClick={() => setTerminalTab("context")}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all relative ${
              terminalTab === "context" ? "text-brand-via" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Technical Context
            {terminalTab === "context" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-via" />}
          </button>
        </div>
        
        <button
          onClick={toggleTerminalSize}
          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-500"
          aria-label={terminalHeight > 300 ? "Minimize terminal" : "Maximize terminal"}
        >
          {terminalHeight > 300 ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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
                  Hello {sessionName}! {meeting?.transcripts && meeting.transcripts.length > 0 ? "I've analyzed the transcript. You can ask me anything about the meeting discussions, blockers, or next steps." : "The transcript is still being processed. Once it's ready, I can help you analyze the meeting content."}
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
                      handleAskAI(undefined, s)
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
                    <div className={`w-1.5 h-1.5 rounded-full ${meeting?.transcripts && meeting.transcripts.length > 0 ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                    <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Top Participants</h4>
              <div className="space-y-3">
                {meeting?.transcripts && meeting.transcripts.length > 0 ? (
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
            aria-label="Ask AI about meeting"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask your AI meeting assistant..."
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-12 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-brand-via/10 focus:border-brand-via transition-all"
          />
          <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-brand-via transition-colors" />
          <button 
            type="submit"
            aria-label="Send message"
            disabled={isAnswering || !prompt.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-via text-white rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 shadow-glow"
          >
            {isAnswering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </form>
      </div>
    </div>
  )
}
