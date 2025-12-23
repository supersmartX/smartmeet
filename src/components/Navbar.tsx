"use client"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { ModeToggle } from "@/components/ModeToggle"
import { Menu, X, Sparkles } from "lucide-react"

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const isAuthenticated = status === "authenticated"
  const user = session?.user
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-black/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 group-hover:scale-110 transition-transform">
            <Image
              src="/logoX.png"
              alt="Supersmart Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Supersmart</span>
              <span className="px-1.5 py-0.5 bg-brand-via/10 text-brand-via text-[8px] font-black uppercase tracking-widest rounded-md border border-brand-via/20">BETA</span>
            </div>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] -mt-1">Meeting Intelligence</span>
          </div>
        </Link>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <nav className="flex items-center gap-6">
            <Link href="/#features" className="text-xs font-black text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 uppercase tracking-widest transition-colors">Features</Link>
            <Link href="/#pricing" className="text-xs font-black text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 uppercase tracking-widest transition-colors">Pricing</Link>
          </nav>
          
          <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />
          
          <div className="flex items-center gap-4">
            <ModeToggle />
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Hi, {user?.name?.split(' ')[0] || 'User'}</span>
                <Link href="/dashboard" className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-black rounded-xl hover:scale-105 transition-all shadow-xl shadow-black/10">
                  DASHBOARD
                </Link>
              </div>
            ) : (
              <Link href="/login" className="px-6 py-2.5 bg-brand-gradient text-white text-xs font-black rounded-xl hover:scale-105 transition-all shadow-glow flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                GET STARTED
              </Link>
            )}
          </div>
        </div>
        
        {/* Mobile Menu Button */}
        <div className="flex items-center gap-3 md:hidden">
          <ModeToggle />
          <button
            className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-black px-4 py-6 space-y-6 animate-in fade-in slide-in-from-top-4">
          <nav className="flex flex-col gap-4">
            <Link 
              href="/#features" 
              className="text-sm font-black text-zinc-900 dark:text-zinc-100 py-2 uppercase tracking-widest"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <Link 
              href="/#pricing" 
              className="text-sm font-black text-zinc-900 dark:text-zinc-100 py-2 uppercase tracking-widest"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
          </nav>
          
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            {isAuthenticated ? (
              <div className="flex flex-col gap-4">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  SIGNED IN AS {user?.email}
                </div>
                <Link 
                  href="/dashboard"
                  className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-black rounded-xl text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  GO TO DASHBOARD
                </Link>
                <button 
                  onClick={() => {
                    signOut()
                    setIsMenuOpen(false)
                  }}
                  className="text-xs font-black text-red-600 py-2 text-left uppercase tracking-widest"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link 
                href="/login"
                className="w-full py-4 bg-brand-gradient text-white text-xs font-black rounded-xl text-center flex items-center justify-center gap-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <Sparkles className="w-4 h-4" />
                GET STARTED
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
