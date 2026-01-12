import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import RecordingsClient from "@/components/dashboard/recordings/RecordingsClient"

export default function RecordingsPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-brand-via animate-spin" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Loading recordings...</p>
        </div>
      </div>
    }>
      <RecordingsClient />
    </Suspense>
  )
}
