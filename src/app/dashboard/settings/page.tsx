import { getUserSettings } from "@/actions/meeting"
import { SettingsClient } from "@/components/dashboard/settings/SettingsClient"
import { Shield } from "lucide-react"
import { Metadata } from "next"

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account Settings | SupersmartX",
  description: "Manage your personal profile and AI provider configurations.",
  alternates: {
    canonical: "/dashboard/settings",
  },
}

export default async function SettingsPage() {
  try {
    const result = await getUserSettings()
    
    if (result.success && result.data) {
      return <SettingsClient initialSettings={result.data} />
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
              {result.error || "Failed to load settings"}
            </p>
          </div>
        </div>
      </div>
    )
  } catch (err) {
    console.error("Failed to load settings:", err)
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px] p-8">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="w-16 h-16 rounded-[24px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight mb-2">System Error</h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
              Failed to load your settings. Please refresh.
            </p>
          </div>
        </div>
      </div>
    )
  }
}
