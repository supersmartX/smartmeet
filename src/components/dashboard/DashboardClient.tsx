"use client";

import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { useState, useMemo, useEffect } from "react"
import { highlightText } from "@/utils/text"
import { Search, Plus, Video, ArrowRight, Sparkles, Zap, ShieldCheck, Calendar, HardDrive, Users } from "lucide-react"
import { getMeetings, getDashboardStats } from "@/actions/meeting"
import { Meeting, DashboardStat } from "@/types/meeting"
import { useToast } from "@/hooks/useToast"
import { Toast } from "@/components/Toast"
import { useRouter } from "next/navigation"

export default function DashboardClient() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user
  const [recordings, setRecordings] = useState<Meeting[]>([])
  const [stats, setStats] = useState<DashboardStat[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const { toast, showToast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        const [meetingsResult, statsResult] = await Promise.all([
          getMeetings(),
          getDashboardStats()
        ])

        if (meetingsResult.success && meetingsResult.data) {
          setRecordings(meetingsResult.data)
        } else if (!meetingsResult.success) {
          showToast(meetingsResult.error || "Failed to load meetings", "error")
        }

        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data)
        } else if (!statsResult.success) {
          showToast(statsResult.error || "Failed to load stats", "error")
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err)
        showToast("Failed to load dashboard data. Please try again.", "error")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [showToast])

  const handleNewMeeting = () => {
    router.push("/dashboard/recordings?action=upload")
  }

  const filteredRecordings = useMemo(() =>
    recordings.filter(rec =>
      rec.title.toLowerCase().includes(searchQuery.toLowerCase())
    ), [recordings, searchQuery]
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

  const mappedStats = useMemo(() => {
    return stats.map(stat => ({
      ...stat,
      icon: stat.icon === "Video" ? Video : 
            stat.icon === "Sparkles" ? Sparkles : 
            stat.icon === "Zap" ? Zap : 
            stat.icon === "ShieldCheck" ? ShieldCheck : Video
    }));
  }, [stats]);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8 animate-in fade-in duration-500">
      <Toast {...toast} />
      {/* Welcome Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-brand-via animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">System Online</span>
          </div>
          <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter uppercase">
            {user?.name?.split(' ')[0] || "User"}&apos;s Command <span className="text-brand-via">Center</span>
          </h1>
          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-3 h-3" /> {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group hidden sm:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH PIPELINE..."
              className="w-64 h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-via/20 transition-all"
            />
          </div>
          <button 
            onClick={handleNewMeeting}
            className="h-12 px-6 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shadow-xl shadow-black/10"
          >
            <Plus className="w-4 h-4" /> New Session
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-zinc-100 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800 animate-pulse" />
          ))
        ) : mappedStats.map((stat, i) => (
          <div key={i} className="group p-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 hover:border-brand-via/30 transition-all shadow-sm hover:shadow-xl hover:shadow-black/5">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 text-zinc-400 group-hover:text-brand-via transition-colors">
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                stat.trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'
              }`}>
                {stat.trend === 'up' ? '+12.5%' : 'STABLE'}
              </span>
            </div>
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{stat.value}</p>
            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Pipeline Activity
            </h2>
            <Link href="/dashboard/recordings" className="text-[10px] font-black text-brand-via uppercase tracking-widest hover:underline">
              View All Session
            </Link>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800 animate-pulse" />
              ))
            ) : filteredRecordings.length > 0 ? (
              filteredRecordings.slice(0, 5).map((rec) => (
                <Link 
                  key={rec.id}
                  href={`/dashboard/recordings/${rec.id}`}
                  className="group flex items-center gap-6 p-4 bg-white dark:bg-zinc-900 rounded-[28px] border border-zinc-100 dark:border-zinc-800 hover:border-brand-via/30 hover:shadow-lg transition-all"
                >
                  <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-400 group-hover:text-brand-via transition-colors shrink-0 overflow-hidden relative">
                    {rec.image ? (
                      <Image src={rec.image} alt="" fill className="object-cover" />
                    ) : (
                      <Video className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-zinc-900 dark:text-zinc-100 truncate uppercase tracking-tight">
                      {renderHighlightedText(rec.title, searchQuery)}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {new Date(rec.createdAt).toLocaleDateString()}
              </span>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                <Users className="w-3 h-3" /> {rec.participants || 0} Attendees
              </span>
            </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    {rec.summary && (
                      <div className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-500 uppercase">
                        AI Processed
                      </div>
                    )}
                    <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 text-zinc-400 group-hover:bg-brand-via group-hover:text-white transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-12 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] border border-zinc-100 dark:border-zinc-800">
                <div className="w-16 h-16 bg-white dark:bg-zinc-950 rounded-[24px] flex items-center justify-center mx-auto mb-4 text-zinc-300">
                  <Video className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-2">No Active Pipeline Sessions</h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6">Start your first AI intelligence processing</p>
                <button 
                  onClick={handleNewMeeting}
                  className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                >
                  Create Session
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Insights */}
        <div className="space-y-6">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Quick Insights
          </h2>
          <div className="p-8 bg-zinc-900 dark:bg-white rounded-[32px] text-white dark:text-zinc-900 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Zap className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-black/5 flex items-center justify-center mb-6">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">Pipeline Status</h3>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-relaxed mb-6">
                Your AI processing nodes are running at 98.2% efficiency. Storage utilization is within optimal limits.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                  <span>Storage Used</span>
                  <span>1.2 GB / 5 GB</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 dark:bg-black/5 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-via rounded-full" style={{ width: '24%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Upcoming Sessions</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-brand-via/10 flex items-center justify-center text-brand-via font-black text-xs">
                  24
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 truncate">Frontend Architecture Review</p>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Today at 2:00 PM</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 font-black text-xs">
                  25
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 truncate">Sprint Planning Q4</p>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Tomorrow at 10:00 AM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Activity = ({ className }: { className?: string }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);