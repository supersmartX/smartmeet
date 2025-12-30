"use client"

import { useState, useEffect } from "react"
import { 
  Shield, 
  Zap, 
  Check, 
  Loader2,
} from "lucide-react"
import { getUserSettings, updateUserApiKey } from "@/actions/meeting"
import { UserSettings } from "@/types/meeting"
import { generateMFASecret, verifyAndEnableMFA, disableMFA } from "@/actions/mfa"

import { useToast } from "@/hooks/useToast"
import { Toast } from "@/components/Toast"
import { ProfileSection } from "@/components/dashboard/settings/ProfileSection"
import { AIConfigSection } from "@/components/dashboard/settings/AIConfigSection"
import { MFASection } from "@/components/dashboard/settings/MFASection"

export default function SettingsPage() {
  const { toast, showToast } = useToast()
  
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState("openai")
  const [model, setModel] = useState("gpt-4o")
  const [allowedIps, setAllowedIps] = useState("")
  const [lastUsedAt, setLastUsedAt] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState({ name: "", email: "", image: "" })
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaSecret, setMfaSecret] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [mfaToken, setMfaToken] = useState("")
  const [isSettingUpMFA, setIsSettingUpMFA] = useState(false)
  const [isVerifyingMFA, setIsVerifyingMFA] = useState(false)

  const setApiKey = (p: string, key: string) => {
    setApiKeys(prev => ({ ...prev, [p]: key }))
  }

  const apiKey = apiKeys[provider] || ""

  const providerModels = {
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o (Recommended)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'o1-preview', name: 'o1 Preview' },
      { id: 'o1-mini', name: 'o1 Mini' },
    ],
    anthropic: [
      { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ],
    google: [
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Recommended)' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-pro', name: 'Gemini 1.0 Pro' },
    ],
    groq: [
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B (Groq)' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Groq)' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Groq)' },
    ],
    custom: [
      { id: 'custom-model', name: 'Use Provider Default' },
    ]
  }

  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getUserSettings()
        if (result.success && result.data) {
          const settings = result.data as UserSettings
          setApiKeys(settings.apiKeys || {})
          setProvider(settings.preferredProvider || "openai")
          setModel(settings.preferredModel || "gpt-4o")
          setAllowedIps(settings.allowedIps || "")
          setLastUsedAt(settings.lastUsedAt ? new Date(settings.lastUsedAt).toLocaleString() : null)
          setUserProfile({
            name: settings.name || "",
            email: settings.email || "",
            image: settings.image || "",
          })
          setMfaEnabled(settings.mfaEnabled || false)
        } else if (!result.success) {
          setError(result.error || "Failed to load settings")
        }
      } catch (err) {
        console.error("Failed to load settings:", err)
        setError("Failed to load your settings. Please refresh.")
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleCopy = () => {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateUserApiKey({
        apiKeys,
        preferredProvider: provider,
        preferredModel: model,
        allowedIps
      })
      
      if (result.success) {
        showToast("Settings saved successfully!")
      } else {
        showToast(result.error || "Failed to save settings.", "error")
      }
    } catch (error) {
      console.error("Failed to save API key:", error)
      showToast("An unexpected error occurred while saving settings.", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSetupMFA = async () => {
    try {
      setIsSettingUpMFA(true)
      const { secret, qrCodeUrl } = await generateMFASecret()
      setMfaSecret(secret)
      setQrCodeUrl(qrCodeUrl)
    } catch (error) {
      console.error("MFA Setup error:", error)
      showToast("Failed to initialize MFA setup.", "error")
    } finally {
      setIsSettingUpMFA(false)
    }
  }

  const handleVerifyMFA = async () => {
    if (!mfaToken) return
    try {
      setIsVerifyingMFA(true)
      await verifyAndEnableMFA(mfaToken, mfaSecret)
      setMfaEnabled(true)
      setQrCodeUrl("")
      setMfaSecret("")
      setMfaToken("")
      showToast("MFA enabled successfully!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to verify MFA code."
      showToast(message, "error")
    } finally {
      setIsVerifyingMFA(false)
    }
  }

  const handleDisableMFA = async () => {
    if (!confirm("Are you sure you want to disable MFA? This will make your account less secure.")) return
    try {
      await disableMFA()
      setMfaEnabled(false)
      showToast("MFA disabled.")
    } catch (error) {
      console.error("Disable MFA error:", error)
      showToast("Failed to disable MFA.", "error")
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-6 h-6 text-brand-via animate-spin" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Loading secure settings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px] p-8">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="w-16 h-16 rounded-[24px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight mb-2">Configuration Error</h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-black/10"
          >
            Retry Loading
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Toast {...toast} />
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Account Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">Manage your personal profile and AI provider configurations.</p>
      </div>

      <div className="grid gap-8">
        <ProfileSection 
          name={userProfile.name} 
          email={userProfile.email} 
        />

        <AIConfigSection 
          provider={provider}
          setProvider={setProvider}
          model={model}
          setModel={setModel}
          apiKeys={apiKeys}
          setApiKey={setApiKey}
          showKey={showKey}
          setShowKey={setShowKey}
          handleCopy={handleCopy}
          copied={copied}
          lastUsedAt={lastUsedAt}
          allowedIps={allowedIps}
          setAllowedIps={setAllowedIps}
          handleSave={handleSave}
          isSaving={isSaving}
          providerModels={providerModels}
        />

        <MFASection 
          mfaEnabled={mfaEnabled}
          qrCodeUrl={qrCodeUrl}
          mfaSecret={mfaSecret}
          mfaToken={mfaToken}
          setMfaToken={setMfaToken}
          isSettingUpMFA={isSettingUpMFA}
          isVerifyingMFA={isVerifyingMFA}
          handleSetupMFA={handleSetupMFA}
          handleVerifyMFA={handleVerifyMFA}
          handleDisableMFA={handleDisableMFA}
          setQrCodeUrl={setQrCodeUrl}
          setMfaSecret={setMfaSecret}
        />

        {/* Usage & Limits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Usage Limit</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">$12.45</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Current Month Spending</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-zinc-400">$50.00 Limit</p>
                </div>
              </div>
              <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '25%' }} />
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Check className="w-4 h-4" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">API Health</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Connection</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Optimal
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Latency</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">124ms</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Toast 
        show={toast.show} 
        message={toast.message} 
        type={toast.type} 
      />
    </div>
  )
}
