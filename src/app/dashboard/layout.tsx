"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Sidebar from "@/components/dashboard/Sidebar"
import { ModeToggle } from "@/components/ModeToggle"
import { ProtectedRoute } from "@/context/AuthContext"
import { 
  Menu, Layout, FileVideo, Settings, Search, Cpu, Globe, 
  CheckCircle2, Wifi, HelpCircle, PanelRight, 
  Split, Share2, MessageSquarePlus 
} from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [isResizing, setIsResizing] = useState(false)
  const pathname = usePathname()
  const sidebarRef = useRef<HTMLDivElement>(null)

  const startResizing = useCallback(() => {
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX - 64 // 64 is the width of the activity bar (w-16)
      if (newWidth > 160 && newWidth < 480) {
        setSidebarWidth(newWidth)
      }
    }
  }, [isResizing])

  useEffect(() => {
    window.addEventListener("mousemove", resize)
    window.addEventListener("mouseup", stopResizing)
    return () => {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
    }
  }, [resize, stopResizing])

  return (
    <ProtectedRoute>
      <div className={`flex flex-col h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Editor-style Activity Bar (Narrow Left Strip) */}
          <aside className="hidden lg:flex w-16 flex-col items-center py-4 bg-zinc-100 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 shrink-0 z-50">
            <div className="w-10 h-10 mb-8 relative">
              <img src="/logoX.png" alt="Logo" className="object-contain" />
            </div>
            <div className="flex flex-col gap-4 flex-1">
              <Link href="/dashboard" className={`p-3 rounded-xl transition-all ${pathname === "/dashboard" ? "text-brand-via bg-brand-via/5" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-900"}`}>
                <Layout className="w-6 h-6" />
              </Link>
              <Link href="/dashboard/recordings" className={`p-3 rounded-xl transition-all ${pathname.startsWith("/dashboard/recordings") ? "text-brand-via bg-brand-via/5" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-900"}`}>
                <FileVideo className="w-6 h-6" />
              </Link>
              <button className="p-3 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-xl transition-all">
                <Search className="w-6 h-6" />
              </button>
            </div>
            <div className="flex flex-col gap-4 mb-4">
              <button className="p-3 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-xl transition-all">
                <HelpCircle className="w-6 h-6" />
              </button>
              <button className="p-3 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-xl transition-all">
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </aside>

          {/* Mobile Sidebar Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar (Explorer) */}
          <div 
            className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 lg:z-20 flex`}
            style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? sidebarWidth : undefined }}
          >
            <Sidebar onClose={() => setIsSidebarOpen(false)} />
            
            {/* Resize Handle */}
            <div 
              onMouseDown={startResizing}
              className={`hidden lg:flex w-1 hover:w-1.5 active:w-1.5 h-full cursor-col-resize bg-transparent hover:bg-brand-via/30 active:bg-brand-via transition-all z-50 shrink-0 items-center justify-center group ${isResizing ? 'bg-brand-via w-1.5' : ''}`}
            >
              <div className={`w-[1px] h-8 bg-zinc-300 dark:bg-zinc-800 group-hover:bg-brand-via/50 ${isResizing ? 'bg-white' : ''}`} />
            </div>
          </div>

          <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
            <header className="h-10 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0 sticky top-0 z-30">
              <div className="flex items-center gap-4 h-full">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1 lg:hidden text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-colors"
                >
                  <Menu className="w-4 h-4" />
                </button>
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium tracking-tight h-full">
                  <span className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer transition-colors flex items-center gap-1.5">
                    <Layout className="w-3 h-3" />
                    supersmartx
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700 font-light">›</span>
                  <span className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer transition-colors">smartmeet</span>
                  <span className="text-zinc-300 dark:text-zinc-700 font-light">›</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-bold uppercase tracking-tighter">
                    {pathname === '/dashboard' 
                      ? 'Overview' 
                      : pathname.includes('/recordings/') 
                        ? 'Meeting Details' 
                        : pathname.split('/').pop()?.replace(/-/g, ' ')}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 h-full">
                <div className="flex items-center gap-1 border-r border-zinc-200 dark:border-zinc-800 pr-3 mr-1">
                  <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-all" title="Share Meeting">
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-all" title="Add Note">
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1 border-r border-zinc-200 dark:border-zinc-800 pr-3 mr-1">
                  <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-all" title="Split View">
                    <Split className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-all" title="Toggle Secondary Sidebar">
                    <PanelRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <ModeToggle />
                  <div className="flex items-center gap-2 pl-1 group cursor-pointer">
                    <div className="w-6 h-6 rounded bg-brand-gradient shadow-glow flex items-center justify-center text-[8px] text-white font-bold border border-white dark:border-zinc-800 shrink-0 group-hover:scale-105 transition-transform">
                      JD
                    </div>
                    <div className="hidden md:flex flex-col leading-none">
                      <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">John Doe</span>
                      <span className="text-[8px] text-emerald-500 font-bold uppercase">Online</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white dark:bg-black">
              {children}
            </main>
          </div>
        </div>

        {/* Editor-style Status Bar */}
        <footer className="h-6 bg-brand-via dark:bg-zinc-900 border-t border-brand-via/20 dark:border-zinc-800 flex items-center justify-between px-3 text-[10px] text-white/90 dark:text-zinc-400 font-medium z-50">
          <div className="flex items-center gap-4 h-full">
            <div className="flex items-center gap-1.5 hover:bg-white/10 dark:hover:bg-zinc-800 px-2 h-full transition-colors cursor-pointer">
              <Globe className="w-3 h-3" />
              <span>supersmartx.ai</span>
            </div>
            <div className="flex items-center gap-1.5 hover:bg-white/10 dark:hover:bg-zinc-800 px-2 h-full transition-colors cursor-pointer text-emerald-300">
              <CheckCircle2 className="w-3 h-3" />
              <span>Pipeline: Stable</span>
            </div>
          </div>
          <div className="flex items-center gap-4 h-full">
            <div className="flex items-center gap-1.5 hover:bg-white/10 dark:hover:bg-zinc-800 px-2 h-full transition-colors cursor-pointer">
              <Cpu className="w-3 h-3" />
              <span>AI Engine: 4.0-Turbo</span>
            </div>
            <div className="flex items-center gap-1.5 hover:bg-white/10 dark:hover:bg-zinc-800 px-2 h-full transition-colors cursor-pointer">
              <Wifi className="w-3 h-3" />
              <span>Latency: 24ms</span>
            </div>
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  )
}
