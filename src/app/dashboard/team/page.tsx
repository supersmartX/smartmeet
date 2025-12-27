"use client"

import { Users, UserPlus, Mail, Shield, MoreHorizontal, Search, Lock } from "lucide-react"
import { useSession } from "next-auth/react"

export default function TeamPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px] p-8">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center animate-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-[32px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-xl shadow-amber-500/5">
            <Lock className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Access Restricted</h3>
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
              Team management is only available for <span className="text-amber-600">Administrator</span> accounts. Please contact your organization owner.
            </p>
          </div>
          <a 
            href="/dashboard"
            className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-black/10"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Team Management</h1>
            <span className="px-2 py-0.5 bg-brand-via/10 text-brand-via text-[10px] font-black uppercase tracking-widest rounded-md">Upcoming</span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            Manage your organization&apos;s members and their access levels.
          </p>
        </div>
        <button className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed flex items-center gap-2 shrink-0">
          <UserPlus className="w-4 h-4" /> INVITE MEMBER
        </button>
      </header>

      {/* Empty State */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-black/5 overflow-hidden min-h-[400px] flex flex-col items-center justify-center p-12 text-center">
        <div className="w-20 h-20 rounded-[32px] bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 mb-6">
          <Users className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
        </div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight mb-2">No Team Members Yet</h2>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-sm font-medium text-sm leading-relaxed mb-8">
          You&apos;re currently working in your personal workspace. Invite colleagues to collaborate on meeting insights and automated documentation.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <Mail className="w-4 h-4 text-zinc-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Email Invitations</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <Shield className="w-4 h-4 text-zinc-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Role-based Access</span>
          </div>
        </div>
      </div>
    </div>
  )
}
