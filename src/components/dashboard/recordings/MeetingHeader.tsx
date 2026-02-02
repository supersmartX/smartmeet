import Link from "next/link"
import { ChevronRight, Clock, Users, Share2 } from "lucide-react"
import { MeetingWithRelations } from "@/types/meeting"

export interface JourneyStep {
  label: string
  status: "completed" | "processing" | "failed" | "pending"
  description: string
}

interface MeetingHeaderProps {
  meeting: MeetingWithRelations | null
  journeySteps: JourneyStep[]
  onRefresh?: () => void
}

export function MeetingHeader({ meeting, journeySteps, onRefresh }: MeetingHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
        <Link href="/dashboard" className="hover:text-brand-via transition-colors">smartmeet</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/dashboard/recordings" className="hover:text-brand-via transition-colors">recordings</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">Analysis</span>
      </div>

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mt-2">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            {meeting?.title || "Untitled Meeting"}
          </h1>
          
          <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>{meeting?.duration || "--m"}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              <span>{meeting?.participants || "--"} Participants</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span>{meeting ? new Date(meeting.createdAt).toLocaleDateString() : "--"}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Journey Steps */}
          <div className="flex items-center gap-3 px-4 py-2 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
            {journeySteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 group relative">
                <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                  step.status === 'completed' 
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                    : step.status === 'processing'
                      ? 'bg-brand-via animate-pulse shadow-[0_0_8px_rgba(var(--brand-via-rgb),0.5)]'
                      : step.status === 'failed'
                        ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                        : 'bg-zinc-300 dark:bg-zinc-700'
                }`} />
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 py-2 px-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 pointer-events-none shadow-2xl border border-white/10 dark:border-black/5 translate-y-1 group-hover:translate-y-0">
                  <p className="mb-0.5 uppercase tracking-widest text-[9px] opacity-70">{step.label}</p>
                  <p className="tracking-tight">{step.description}</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-100" />
                </div>
              </div>
            ))}
            <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {journeySteps.find(s => s.status === 'processing')?.label || 'Status'}
            </span>
          </div>

          {onRefresh && (
            <button 
              onClick={onRefresh}
              aria-label="Refresh status"
              className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                <path d="M16 21h5v-5"/>
              </svg>
            </button>
          )}

          <button 
            aria-label="Share recording"
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-black/10"
          >
            <Share2 className="w-3 h-3" />
            <span>Share</span>
          </button>
        </div>
      </header>
    </div>
  )
}
