"use client"

import { useState, useEffect } from "react"
import { 
  Shield,
  Clock, 
  Monitor, 
  Activity,
  Loader2,
  AlertCircle,
  Lock,
  Unlock,
  UserPlus,
  Key,
  LogOut,
  Smartphone,
  Laptop,
  Globe
} from "lucide-react"
import { getAuditLogs, getActiveSessions, revokeSession } from "@/actions/meeting"
import { format } from "date-fns"
import type { AuditLog, Session } from "@/types/meeting"
import { useToast } from "@/hooks/useToast"
import { Toast } from "@/components/Toast"

export default function SecurityClient() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const [logsResult, sessionsResult] = await Promise.all([
          getAuditLogs(),
          getActiveSessions()
        ])
        
        if (logsResult.success && logsResult.data) {
          setLogs(logsResult.data)
        }
        
        if (sessionsResult.success && sessionsResult.data) {
          setSessions(sessionsResult.data)
        }

        if (!logsResult.success || !sessionsResult.success) {
          setError(logsResult.error || sessionsResult.error || "Failed to load security data.")
        }
      } catch (err) {
        console.error("Failed to load security data:", err)
        setError("Could not load security activity.")
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setIsRevoking(sessionId)
      const result = await revokeSession(sessionId)
      if (result.success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
        showToast("Session revoked successfully", "success")
      } else {
        showToast(result.error || "Failed to revoke session. Please try again.", "error")
      }
    } catch (err) {
      console.error("Failed to revoke session:", err)
      showToast("An unexpected error occurred. Please try again.", "error")
    } finally {
      setIsRevoking(null)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login_success': return <Unlock className="w-4 h-4 text-emerald-500" />
      case 'login_failed': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'account_locked': return <Lock className="w-4 h-4 text-amber-500" />
      case 'signup_success': return <UserPlus className="w-4 h-4 text-blue-500" />
      case 'api_key_updated': return <Key className="w-4 h-4 text-purple-500" />
      default: return <Activity className="w-4 h-4 text-zinc-400" />
    }
  }

  const formatActionName = (action: string) => {
    return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]" role="status" aria-busy="true">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-6 h-6 text-brand-via animate-spin" aria-hidden="true" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Scanning security logs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Toast {...toast} onClose={hideToast} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Security Activity</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Monitor account access and security-related events in real-time.</p>
        </div>
        <div className="flex items-center gap-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl" role="status" aria-label="Account status protected">
          <Shield className="w-5 h-5 text-emerald-500" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Account Status</p>
            <p className="text-xs font-bold text-emerald-700">Protected & Active</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500" role="alert">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
          </div>
        )}
        {/* Active Sessions */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-via flex items-center justify-center">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Active Sessions</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Devices currently logged into your account</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
            {sessions.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">No active sessions found</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="p-6 flex items-center justify-between group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      {session.userAgent?.toLowerCase().includes('mobile') ? (
                        <Smartphone className="w-5 h-5 text-zinc-500" />
                      ) : (
                        <Laptop className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                          {session.userAgent?.split('(')[0] || 'Unknown Browser'}
                        </p>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full">
                          Active
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-zinc-400" />
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            {session.ipAddress || 'Unknown IP'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span className="text-[10px] font-medium text-zinc-400">
                            Expires {session.expires ? format(new Date(session.expires), 'MMM d, yyyy') : 'Never'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => session.id && handleRevokeSession(session.id)}
                    disabled={isRevoking === session.id}
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-50"
                    aria-label={`Revoke session from ${session.userAgent?.split('(')[0] || 'Unknown Browser'}`}
                  >
                    {isRevoking === session.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                    ) : (
                      <LogOut className="w-3 h-3" aria-hidden="true" />
                    )}
                    Sign Out
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Activity Timeline */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center">
                <Activity className="w-5 h-5 text-white dark:text-zinc-900" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Recent Events</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Last 50 security actions</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Event</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Location / IP</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Device</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Time</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Activity className="w-8 h-8 text-zinc-200 dark:text-zinc-800" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">No security events found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            {getActionIcon(log.action)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{formatActionName(log.action)}</p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{log.details || 'System Action'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-tight">{log.location || 'Unknown'}</span>
                          <span className="text-[10px] font-medium text-zinc-400">{log.ipAddress}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{log.userAgent?.split('(')[0] || 'System'}</span>
                      </td>
                      <td className="px-6 py-4 text-[10px] font-medium text-zinc-400">
                        {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
