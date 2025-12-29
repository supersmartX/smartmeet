"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import Sidebar from "@/components/dashboard/Sidebar"
import { ModeToggle } from "@/components/ModeToggle"
import { useSession, signOut } from "next-auth/react"
import {
  Menu, Layout, FileVideo, Settings, Search, HelpCircle, LogOut, ChevronDown,
  Bell, Command, X
} from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [isResizing, setIsResizing] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user
  const logout = () => signOut({ callbackUrl: "/" })
  
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    <div className={`flex flex-col h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Editor-style Activity Bar (Narrow Left Strip) */}
          <aside className="hidden lg:flex w-16 flex-col items-center py-4 bg-zinc-100 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 shrink-0 z-50">
            <div className="w-10 h-10 mb-8 relative">
              <Image src="/logoX.png" alt="Logo" width={40} height={40} className="object-contain" />
            </div>
            <div className="flex flex-col gap-4 flex-1">
              <Link href="/dashboard" className={`p-3 rounded-xl transition-all ${pathname === "/dashboard" ? "text-brand-via bg-brand-via/5" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-900"}`}>
                <Layout className="w-6 h-6" />
              </Link>
              <Link href="/dashboard/recordings" className={`p-3 rounded-xl transition-all ${pathname.startsWith("/dashboard/recordings") ? "text-brand-via bg-brand-via/5" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-900"}`}>
                <FileVideo className="w-6 h-6" />
              </Link>
              <Link href="/dashboard/settings" className={`p-3 rounded-xl transition-all ${pathname === "/dashboard/settings" ? "text-brand-via bg-brand-via/5" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-900"}`}>
                <Settings className="w-6 h-6" />
              </Link>
            </div>
            <div className="flex flex-col gap-4 mb-4">
              <Link href="/dashboard/help" className={`p-3 rounded-xl transition-all ${pathname === "/dashboard/help" ? "text-brand-via bg-brand-via/5" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-900"}`}>
                <HelpCircle className="w-6 h-6" />
              </Link>
            </div>
          </aside>

          {/* Mobile Sidebar Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar (Workspace) */}
          <div 
            className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 lg:z-20 flex`}
            style={{ width: isMounted && typeof window !== 'undefined' && window.innerWidth >= 1024 ? sidebarWidth : undefined }}
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
                <div className={`${isSearchOpen ? 'hidden' : 'hidden sm:flex'} items-center gap-1.5 text-[10px] font-bold tracking-tight h-full`}>
                  <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer transition-colors flex items-center gap-1.5 uppercase">
                    <Layout className="w-3 h-3" />
                    supersmartX
                  </Link>
                  <span className="text-zinc-300 dark:text-zinc-700 font-light text-xs">/</span>
                  <div className="flex items-center gap-1 group/ws cursor-pointer">
                    <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors uppercase tracking-wider">smartmeet</Link>
                    <ChevronDown className="w-2.5 h-2.5 text-zinc-300 group-hover/ws:text-zinc-600 transition-colors" />
                  </div>
                  <span className="text-zinc-300 dark:text-zinc-700 font-light text-xs">/</span>
                  <span className="text-brand-via font-black uppercase tracking-tighter bg-brand-via/5 px-2 py-0.5 rounded">
                    {pathname === '/dashboard' 
                      ? 'Overview' 
                      : pathname === '/dashboard/settings'
                        ? 'API Settings'
                        : pathname.includes('/recordings/') 
                          ? 'Meeting Analysis' 
                          : pathname.split('/').pop()?.replace(/-/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Center: Global Search Bar */}
              <div className={`${isSearchOpen ? 'flex absolute inset-x-0 mx-4' : 'hidden'} md:flex md:relative flex-1 max-w-md md:mx-8 group z-50`}>
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search className="w-3.5 h-3.5 text-zinc-400 group-focus-within:text-brand-via transition-colors" />
                </div>
                <input 
                  type="text"
                  placeholder="Search recordings, logic, or help..."
                  autoFocus={isSearchOpen}
                  className="w-full pl-9 pr-12 h-7 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[11px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-via/20 focus:border-brand-via transition-all"
                />
                <div className="absolute inset-y-0 right-3 flex items-center gap-2">
                  <div className="hidden md:flex items-center gap-1 opacity-50 pointer-events-none">
                    <Command className="w-2.5 h-2.5" />
                    <span className="text-[9px] font-black">K</span>
                  </div>
                  {isSearchOpen && (
                    <button 
                      onClick={() => setIsSearchOpen(false)}
                      className="md:hidden p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"
                    >
                      <X className="w-3 h-3 text-zinc-500" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className={`${isSearchOpen ? 'hidden' : 'flex'} items-center gap-3 h-full`}>
                <div className="flex items-center gap-3 h-full">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setIsSearchOpen(true)}
                      className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all relative group">
                      <Bell className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand-via rounded-full border border-white dark:border-zinc-950" />
                    </button>
                    <ModeToggle />
                  </div>
                  <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1" />
                  <div className="relative h-full flex items-center" ref={profileRef}>
                    <button 
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-2 pl-1 group cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 h-8 px-2 rounded-lg transition-colors"
                    >
                      <div className="w-6 h-6 rounded bg-brand-gradient shadow-glow flex items-center justify-center text-[8px] text-white font-bold border border-white dark:border-zinc-800 shrink-0 group-hover:scale-105 transition-transform">
                        {user?.name?.substring(0, 2).toUpperCase() || 'US'}
                      </div>
                      <div className="hidden md:flex flex-col items-start leading-none">
                        <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">
                          {user?.name || 'User'}
                        </span>
                        <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-wider">Online</span>
                      </div>
                      <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProfileOpen && (
                      <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-black/10 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                          <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Account</p>
                          <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">{user?.email}</p>
                        </div>
                        <Link 
                          href="/dashboard/settings"
                          className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          Profile Settings
                        </Link>
                        <button 
                          onClick={() => {
                            logout()
                            setIsProfileOpen(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-zinc-50 dark:bg-black">
              {children}
            </main>
          </div>
        </div>

        {/* Editor-style Status Bar */}
        <footer className="h-6 bg-brand-via dark:bg-zinc-900 border-t border-brand-via/20 dark:border-zinc-800 flex items-center justify-between px-3 text-[10px] text-white/90 dark:text-zinc-400 font-medium z-50 overflow-hidden">
          <div className="flex items-center gap-4 h-full">
            <div className="flex items-center gap-1.5 hover:bg-white/10 dark:hover:bg-zinc-800 px-2 h-full transition-colors cursor-pointer shrink-0">
              <span>supersmartX.ai</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 hover:bg-white/10 dark:hover:bg-zinc-800 px-2 h-full transition-colors cursor-pointer text-emerald-300 shrink-0">
              <span>Pipeline: Stable</span>
            </div>
          </div>
          <div className="flex items-center gap-4 h-full">
            <div className="hidden md:flex items-center gap-1.5 hover:bg-white/10 dark:hover:bg-zinc-800 px-2 h-full transition-colors cursor-pointer shrink-0">
              <span>AI Engine: 4.0-Turbo</span>
            </div>
            <div className="flex items-center gap-1.5 hover:bg-white/10 dark:hover:bg-zinc-800 px-2 h-full transition-colors cursor-pointer shrink-0">
              <span>Latency: 24ms</span>
            </div>
          </div>
        </footer>
      </div>
  )
}
