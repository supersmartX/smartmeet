"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FileText, 
  Plus, 
  Code, 
  FileCode, 
  FileJson, 
  Video, 
  MoreHorizontal, 
  LogOut,
  Settings,
  Layout
} from "lucide-react"
import { useState } from "react"

const explorerItems = [
  { 
    name: "SUPERSMART", 
    type: "folder",
    children: [
      { name: "Overview", href: "/dashboard", icon: Layout },
      { 
        name: "My Projects", 
        type: "folder",
        children: [
          { name: "Audio-to-Code", href: "/dashboard/recordings/1", icon: Code },
          { name: "Speech-to-Text", href: "/dashboard/recordings/2", icon: Video },
          { name: "Code Summaries", href: "/dashboard/recordings/3", icon: FileText },
          { name: "Generated Docs", href: "/dashboard/recordings/4", icon: FileCode },
        ]
      },
      { name: "Pipeline Stats", href: "/dashboard/stats", icon: FileJson },
      { name: "API Settings", href: "/dashboard/settings", icon: Settings },
    ]
  }
]

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [openFolders, setOpenFolders] = useState<string[]>(["ACTIVE SESSIONS", "SUPERSMART", "My Projects"])

  const toggleFolder = (name: string) => {
    setOpenFolders(prev =>
      prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]
    )
  }

  const renderExplorerItem = (item: { name: string; type?: string; children?: any[]; href?: string; icon?: any }, depth = 0) => {
    const isOpen = openFolders.includes(item.name)
    const isActive = item.href ? pathname === item.href : false
    const Icon = item.icon

    if (item.type === "folder") {
      return (
        <div key={item.name} className="flex flex-col">
          <button
            onClick={() => toggleFolder(item.name)}
            className={`flex items-center gap-1 py-1 px-2 hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors text-[13px] text-zinc-600 dark:text-zinc-400 group`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Folder className={`w-4 h-4 ${isOpen ? "text-brand-via" : "text-zinc-400"}`} />
            <span className="truncate font-medium">{item.name}</span>
          </button>
          {isOpen && item.children?.map((child: any) => renderExplorerItem(child, depth + 1))}
        </div>
      )
    }

    return (
      <Link
        key={item.name}
        href={item.href || "#"}
        onClick={onClose}
        className={`flex items-center gap-2 py-1 px-2 text-[13px] transition-all duration-200 group ${
          isActive
            ? "bg-brand-via/10 text-brand-via border-r-2 border-brand-via"
            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
        style={{ paddingLeft: `${depth * 12 + 24}px` }}
      >
        {Icon && <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-brand-via" : "text-zinc-400"}`} />}
        <span className="truncate">{item.name}</span>
      </Link>
    );
  }

  return (
    <aside className="w-full bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full z-20 transition-colors duration-300">
      {/* Explorer Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">SUPERSMART</span>
        <div className="flex items-center gap-1">
          <button className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
        {/* Active Sessions Section */}
        <div className="mb-2">
          <button
            onClick={() => toggleFolder("ACTIVE SESSIONS")}
            className="w-full px-2 py-1 flex items-center gap-1 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors uppercase tracking-tight"
          >
            {openFolders.includes("ACTIVE SESSIONS") ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            Active Sessions
          </button>
          {openFolders.includes("ACTIVE SESSIONS") && (
            <div className="mt-0.5">
              <Link
                href="/dashboard/recordings/1"
                className={`flex items-center gap-2 px-6 py-1 text-[13px] transition-colors relative group ${
                  pathname === "/dashboard/recordings/1"
                    ? "text-brand-via bg-brand-via/5 border-r-2 border-brand-via"
                    : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-900"
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute left-2 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <FileText className="w-4 h-4" />
                <span className="truncate">Active Transcript</span>
              </Link>
              <Link
                href="/dashboard/recordings/1"
                className={`flex items-center gap-2 px-6 py-1 text-[13px] transition-colors ${
                  pathname === "/dashboard/recordings/1"
                    ? "text-zinc-900 dark:text-zinc-100 bg-zinc-200/50 dark:bg-zinc-800/50"
                    : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-900"
                }`}
              >
                <Video className="w-4 h-4" />
                <span className="truncate">Meeting Recording</span>
              </Link>
            </div>
          )}
        </div>

        {explorerItems.map((item) => renderExplorerItem(item))}
      </div>

      {/* User Section (Like a bottom fixed panel) */}
      <div className="mt-auto border-t border-zinc-200 dark:border-zinc-800 p-4 bg-white/50 dark:bg-zinc-900/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded bg-brand-gradient flex items-center justify-center text-[10px] text-white font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold truncate text-zinc-900 dark:text-zinc-100">{user?.name}</span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-tighter">Pro Plan</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full py-1.5 text-[10px] font-bold text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-800"
        >
          <LogOut className="w-3 h-3" />
          DISCONNECT
        </button>
      </div>
    </aside>
  )
}
