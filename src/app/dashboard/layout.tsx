"use client"

import { useState } from "react"
import Sidebar from "@/components/dashboard/Sidebar"
import { ModeToggle } from "@/components/ModeToggle"
import { ProtectedRoute } from "@/context/AuthContext"
import { Menu, X } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 lg:z-20`}>
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </div>

        <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden relative">
          <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 lg:hidden text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="hidden sm:flex items-center gap-2 text-sm font-medium">
                <span className="text-zinc-400">Dashboard</span>
                <span className="text-zinc-300">/</span>
                <span className="text-zinc-900 dark:text-zinc-100">Overview</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">System Live</span>
              </div>
              <div className="hidden sm:block h-6 w-[1px] bg-zinc-200 dark:border-zinc-800 mx-2" />
              <ModeToggle />
              <div className="w-8 h-8 rounded-full bg-brand-gradient shadow-glow flex items-center justify-center text-[10px] text-white font-bold border-2 border-white dark:border-zinc-800 shrink-0">
                JD
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
