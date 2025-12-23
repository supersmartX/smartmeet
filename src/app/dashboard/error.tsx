'use client'

import { useEffect } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mb-2 uppercase tracking-tight">
        Something went wrong!
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
        We encountered an error while loading your dashboard. This might be a temporary issue.
      </p>
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 rounded-xl font-bold hover:scale-[1.02] transition-all shadow-lg"
      >
        <RotateCcw className="w-4 h-4" />
        Try again
      </button>
    </div>
  )
}
