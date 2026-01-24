import { getUserSettings } from "@/actions/meeting"
import { APISettingsClient } from "@/components/dashboard/settings/APISettingsClient"
import { Shield } from "lucide-react"
import { Metadata } from "next"

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "API Settings | SupersmartX",
  description: "Configure your API keys and provider settings for AI services.",
  alternates: {
    canonical: "/dashboard/settings/api",
  },
}

export default async function APISettingsPage() {
  try {
    const result = await getUserSettings()

    if (result.success && result.data) {
      return <APISettingsClient initialSettings={result.data} />
    }

    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px] p-8">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="w-16 h-16 rounded-[24px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight mb-2">Configuration Error</h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
              {result.error || "Failed to load API settings"}
            </p>
          </div>
        </div>
      </div>
    )
  } catch (err) {
    console.error("Failed to load API settings:", err)
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px] p-8">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="w-16 h-16 rounded-[24px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight mb-2">System Error</h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
              Failed to load your API settings. Please refresh.
            </p>
          </div>
        </div>
      </div>
    )
  }
}
