"use client"
import Link from "next/link"
import Image from "next/image"
import Button from "@/components/Button"
import { useState } from "react"

export default function Navbar() {
  const [error, setError] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  return (
    <header className="container py-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {error ? (
            <div className="h-9 w-9 rounded-full bg-brand-gradient shadow-glow" />
          ) : (
            <Image
              src="/logo.png"
              width={36}
              height={36}
              alt="SupersmartX logo"
              className="shadow-glow rounded-full"
              onError={() => setError(true)}
            />
          )}
          <span className="text-lg font-semibold" aria-label="Supersmarx home">SupersmartX</span>
        </Link>
        
        {/* Desktop Menu */}
        <div className="hidden sm:flex items-center gap-3">
          <Link href="#features" className="text-sm text-black/80 dark:text-white/80">Features</Link>
          <Link href="#download" className="text-sm text-black/80 dark:text-white/80">Download</Link>
          <Button href="#download" variant="primary">Add Extension</Button>
        </div>
        
        {/* Mobile Menu Button */}
        <button
          className="sm:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="sm:hidden mt-4 pb-4 border-t border-black/10 dark:border-white/10">
          <div className="flex flex-col gap-3 pt-4">
            <Link 
              href="#features" 
              className="text-sm text-black/80 dark:text-white/80 py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <Link 
              href="#download" 
              className="text-sm text-black/80 dark:text-white/80 py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Download
            </Link>
            <Button href="#download" variant="primary" onClick={() => setIsMenuOpen(false)}>
              Add Extension
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
