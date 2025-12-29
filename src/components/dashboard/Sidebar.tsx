"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  Code,
  FileCode,
  Video,
  Settings,
  Layout,
  HelpCircle,
  Shield
} from "lucide-react"
import { useState } from "react"
import { LucideIcon } from "lucide-react"

interface WorkspaceItem {
  name: string;
  type?: string;
  children?: WorkspaceItem[];
  href?: string;
  icon?: LucideIcon;
  upcoming?: boolean;
}

const workspaceItems: WorkspaceItem[] = [
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
      { name: "Security & Logs", href: "/dashboard/security", icon: Shield },
      { name: "API Settings", href: "/dashboard/settings", icon: Settings },
      { name: "Help & Support", href: "/dashboard/help", icon: HelpCircle },
    ]
  }
]

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const [openFolders, setOpenFolders] = useState<string[]>(["SUPERSMART", "ACTIVE SESSIONS", "My Projects"])

  const toggleFolder = (name: string) => {
    setOpenFolders(prev =>
      prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]
    )
  }

  const renderWorkspaceItem = (item: WorkspaceItem, depth = 0) => {
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
          {isOpen && item.children?.map((child) => renderWorkspaceItem(child, depth + 1))}
        </div>
      )
    }

    return (
      <Link
        key={item.name}
        href={item.upcoming ? "#" : (item.href || "#")}
        onClick={item.upcoming ? (e) => e.preventDefault() : onClose}
        className={`flex items-center justify-between py-1 px-2 text-[13px] transition-all duration-200 group ${
          item.upcoming ? "opacity-60 cursor-not-allowed" : 
          isActive
            ? "bg-brand-via/10 text-brand-via border-r-2 border-brand-via"
            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
        style={{ paddingLeft: `${depth * 12 + 24}px` }}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-brand-via" : "text-zinc-400"}`} />}
          <span className="truncate">{item.name}</span>
        </div>
        {item.upcoming && (
          <span className="text-[7px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">
            SOON
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside className="w-full bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full z-20 transition-colors duration-300">
      {/* Workspace Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-white/50 dark:bg-zinc-950/50">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Workspace</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Live</span>
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
            <div className="mt-0.5 px-6 py-2">
              <p className="text-[10px] text-zinc-500 font-medium italic">No active sessions</p>
            </div>
          )}
        </div>

        {workspaceItems.map((item) => renderWorkspaceItem(item))}
      </div>

      {/* Pro Badge or Help Section at bottom */}
      <div className="mt-auto border-t border-zinc-200 dark:border-zinc-800 p-4">
        <div className="bg-brand-via/5 border border-brand-via/10 rounded-lg p-3">
          <p className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight mb-1">Free Plan</p>
          <p className="text-[9px] text-zinc-500 mb-2 italic">Using 0/3 projects this month</p>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
            <div className="bg-brand-via w-0 h-full" />
          </div>
        </div>
      </div>
    </aside>
  )
}
