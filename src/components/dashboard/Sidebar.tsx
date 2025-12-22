"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { LayoutDashboard, FileVideo, LogOut, ChevronRight, X } from "lucide-react"

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
]

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="w-72 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full sticky top-0 z-20 transition-colors duration-300">
      <div className="p-8">
        <div className="flex items-center justify-between mb-10">
          <Link href="/dashboard" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="relative w-10 h-10 group-hover:rotate-6 transition-all duration-300">
              <Image
                src="/logoX.png"
                alt="Smartmeet Logo"
                fill
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tight text-zinc-900 dark:text-zinc-100">Smartmeet</span>
              <span className="text-[10px] font-black text-brand-via uppercase tracking-[0.2em] -mt-1">AI Pipeline</span>
            </div>
          </Link>
          <button 
            onClick={onClose}
            className="p-2 lg:hidden text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 group ${
                  isActive
                    ? "bg-zinc-900 text-white shadow-xl shadow-black/20 dark:bg-white dark:text-zinc-900"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <div className="flex items-center gap-4">
                  <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                  {item.name}
                </div>
                {isActive ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-gradient shadow-glow" />
                ) : (
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto p-6">
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] p-6 border border-zinc-100 dark:border-zinc-800/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-gradient opacity-5 blur-3xl -mr-12 -mt-12 group-hover:opacity-10 transition-opacity" />
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-brand-gradient p-[2px] shadow-glow transform group-hover:rotate-3 transition-transform">
              <div className="w-full h-full rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-black text-lg">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-black truncate text-zinc-900 dark:text-zinc-100">{user?.name}</span>
              <span className="text-[10px] text-zinc-400 truncate uppercase tracking-widest font-bold">Pro Account</span>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full py-3 text-xs font-black text-zinc-500 hover:text-white hover:bg-zinc-900 dark:hover:bg-white dark:hover:text-zinc-900 rounded-xl transition-all flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-800 hover:border-transparent group/btn"
          >
            <LogOut className="w-4 h-4 group-hover/btn:-translate-x-1 transition-transform" />
            SIGN OUT
          </button>
        </div>
      </div>
    </aside>
  )
}
