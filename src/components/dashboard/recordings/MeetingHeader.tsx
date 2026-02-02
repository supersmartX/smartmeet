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
}

export function MeetingHeader({ meeting, journeySteps }: MeetingHeaderProps) {
  return (
    <div className="h-auto min-h-10 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between px-4 py-2 sm:py-0 shrink-0 gap-3">
      <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest overflow-hidden shrink-0">
          <Link href="/dashboard" className="hover:text-brand-via transition-colors shrink-0 hidden xs:inline">smartmeet</Link>
          <ChevronRight className="w-3 h-3 shrink-0 hidden xs:inline" />
          <Link href="/dashboard/recordings" className="hover:text-brand-via transition-colors shrink-0">recordings</Link>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-zinc-900 dark:text-zinc-100 truncate max-w-[100px] xs:max-w-none">{meeting?.title || "Analysis"}</span>
        </div>
        
        <div className="hidden xl:flex items-center gap-6 ml-6 pl-6 border-l border-zinc-200 dark:border-zinc-800">
          {journeySteps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 group relative">
              <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
                step.status === 'completed' 
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                  : step.status === 'processing'
                    ? 'bg-brand-via animate-pulse shadow-[0_0_8px_rgba(var(--brand-via-rgb),0.5)]'
                    : step.status === 'failed'
                      ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                      : 'bg-zinc-300 dark:bg-zinc-700'
              }`} />
              <div className="flex flex-col">
                <span className={`text-[10px] font-black uppercase tracking-tighter leading-none ${
                  step.status === 'completed' ? 'text-zinc-900 dark:text-zinc-100' : step.status === 'processing' ? 'text-brand-via' : step.status === 'failed' ? 'text-red-500' : 'text-zinc-400'
                }`}>
                  {step.label}
                </span>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">
                  {step.status === 'completed' ? 'Verified' : step.status === 'processing' ? 'Processing...' : step.status === 'failed' ? 'Failed' : 'Pending'}
                </span>
              </div>
              {i < journeySteps.length - 1 && <div className="w-6 h-[1px] bg-zinc-200 dark:bg-zinc-800 ml-2" />}
              
              {/* Hover Tooltip */}
              <div className="absolute top-full left-0 mt-2 py-2 px-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 pointer-events-none shadow-2xl border border-white/10 dark:border-black/5 -translate-y-1 group-hover:translate-y-0">
                <p className="mb-1 uppercase tracking-widest text-[9px] opacity-50">{step.label}</p>
                <p className="tracking-tight">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
          <Clock className="w-3 h-3" /> {meeting?.duration || "--m"}
          <Users className="w-3 h-3 ml-2" /> {meeting?.participants || "--"}
        </div>
        <div className="h-4 w-[1px] bg-zinc-200 dark:border-zinc-800" />
        <button 
          aria-label="Share recording"
          className="text-xs font-bold text-brand-via hover:underline uppercase tracking-widest flex items-center gap-1.5"
        >
          <Share2 className="w-3 h-3" /> Share
        </button>
      </div>
    </div>
  )
}
