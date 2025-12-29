"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { useState, useMemo, useEffect } from "react"
import { highlightText } from "@/utils/text"
import { Search, Plus, Video, ArrowRight, Sparkles, Zap, ShieldCheck, Calendar, HardDrive, Users } from "lucide-react"
import { getMeetings, getDashboardStats } from "@/actions/meeting"

import { useRouter } from "next/navigation"

interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration?: string;
  participants?: number;
  status: string;
  userId: string;
}

interface DashboardStat {
  label: string;
  value: string;
  icon: string;
  color: string;
  bg: string;
  trend: string;
  href: string;
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user
  const [recordings, setRecordings] = useState<Meeting[]>([])
  const [stats, setStats] = useState<DashboardStat[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setShowToast(true)
        const [meetingsData, statsData] = await Promise.all([
          getMeetings(),
          getDashboardStats()
        ])
        setRecordings(meetingsData)
        if (statsData) setStats(statsData)
        
        // Hide toast after 3 seconds
        setTimeout(() => setShowToast(false), 3000)
      } catch (err) {
        console.error("Dashboard fetch error:", err)
        setError("Failed to load dashboard data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8 animate-in fade-in duration-700">
      {/* Welcome Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Workspace Overview</h1>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            Welcome back, {user?.name}. Your AI pipeline analyzed <span className="text-zinc-900 dark:text-zinc-100 font-bold">{recordings.length} meetings</span> today.
          </p>
        </div>
        <div className="flex items-center gap-3">
            <div className="relative group">
              <input
                type="text"
                placeholder="Quick search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-brand-via/5 focus:border-brand-via transition-all shadow-sm"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
            </div>
            <button 
              onClick={handleNewMeeting}
              className="bg-brand-gradient text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center gap-2 shadow-glow shrink-0"
            >
                <Plus className="w-4 h-4" /> NEW MEETING
            </button>
        </div>
      </header>

      {error ? (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-900 dark:text-red-100">Loading Error</h3>
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
                <div className="w-12 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="w-16 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
                <div className="w-24 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mappedStats.map((stat, i) => (
          <Link key={i} href={stat.href} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-brand-via/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${
                stat.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'
              }`}>
                {stat.trend}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{stat.value}</span>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight mt-1">{stat.label}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity / Meetings */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-[0.2em]">Recent Meetings</h2>
            <Link href="/dashboard/recordings" className="text-[10px] font-black text-brand-via hover:underline uppercase tracking-widest flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-black/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                    <th className="px-4 sm:px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Name</th>
                    <th className="hidden sm:table-cell px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Date</th>
                    <th className="hidden md:table-cell px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Participants</th>
                    <th className="hidden sm:table-cell px-6 py-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-4 sm:px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {filteredRecordings.length > 0 ? (
                    filteredRecordings.slice(0, 4).map((recording) => (
                      <tr key={recording.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors group">
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3 sm:gap-4">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                  <Video className="w-4 h-4 sm:w-5 sm:h-5 text-brand-via" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <Link href={`/dashboard/recordings/${recording.id}`} className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-brand-via transition-colors text-sm truncate max-w-[150px] sm:max-w-[200px]">
                                    {renderHighlightedText(recording.title, searchQuery)}
                                </Link>
                                <div className="flex items-center gap-2 sm:hidden mt-0.5">
                                  <span className="text-[10px] text-zinc-500 font-bold">
                                    {recording.date instanceof Date ? recording.date.toLocaleDateString() : String(recording.date)}
                                  </span>
                                </div>
                              </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                          {renderHighlightedText(recording.date instanceof Date ? recording.date.toLocaleDateString() : String(recording.date), searchQuery)}
                        </td>
                        <td className="hidden md:table-cell px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                              <span className="text-[10px] font-black text-zinc-500">{recording.participants}</span>
                            </div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Members</span>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                              recording.status?.toUpperCase() === "PROCESSING" 
                              ? "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50" 
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
                          }`}>
                            {recording.status}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <Link 
                              href={`/dashboard/recordings/${recording.id}`}
                              className="p-2 text-zinc-400 hover:text-brand-via transition-colors inline-block"
                          >
                              <ArrowRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="w-16 h-16 rounded-[24px] bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                            <Search className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
                          </div>
                          <div className="max-w-[200px]">
                            <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-1">No meetings found</h3>
                            <p className="text-[10px] text-zinc-500 font-medium">Try adjusting your search query to find your meeting.</p>
                          </div>
                          <button 
                            onClick={() => setSearchQuery("")}
                            className="mt-2 text-[10px] font-black text-brand-via uppercase tracking-widest hover:underline"
                          >
                            Clear search
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Sections */}
        <div className="flex flex-col gap-8">
          {/* Upcoming Meetings */}
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-[0.2em]">Upcoming</h2>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center text-center py-10">
              <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
              </div>
              <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-1">No scheduled meetings</p>
              <p className="text-[10px] text-zinc-500 font-medium max-w-[140px]">Connect your calendar to sync upcoming sessions.</p>
              <Link href="/dashboard/integrations" className="mt-4 text-[9px] font-black text-brand-via uppercase tracking-widest hover:underline">Connect Calendar</Link>
            </div>
          </section>

          {/* Storage / Usage */}
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-[0.2em]">Workspace</h2>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <HardDrive className="w-4 h-4 text-zinc-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">Storage Used</p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">0.0 GB of 5 GB</p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-6">
                <div className="h-full bg-brand-via rounded-full" style={{ width: '2%' }} />
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-zinc-50 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">1 Member</span>
                </div>
                <Link href="/dashboard/team" className="text-[9px] font-black text-brand-via uppercase tracking-widest hover:underline">Manage Team</Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-zinc-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
            <Sparkles className="w-4 h-4 text-brand-via" />
            <span className="text-[10px] font-black uppercase tracking-widest">Recording pipeline is initializing...</span>
          </div>
        </div>
      )}
    </>
  )}
</div>
)
}
