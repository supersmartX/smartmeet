"use client"

import { useState } from "react"
import { 
  Shield, 
  Zap, 
  Check, 
} from "lucide-react"
import { updateUserApiKey } from "@/actions/meeting"
import { UserSettings } from "@/types/meeting"
import { generateMFASecret, verifyAndEnableMFA, disableMFA } from "@/actions/mfa"

import { useToast } from "@/hooks/useToast"
import { Toast } from "@/components/Toast"
import { ProfileSection } from "@/components/dashboard/settings/ProfileSection"
import { AIConfigSection } from "@/components/dashboard/settings/AIConfigSection"
import { MFASection } from "@/components/dashboard/settings/MFASection"

interface SettingsClientProps {
  initialSettings: UserSettings
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const { toast, showToast } = useToast()
  
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(initialSettings.apiKeys || {})
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [provider, setProvider] = useState(initialSettings.preferredProvider || "openai")
  const [model, setModel] = useState(initialSettings.preferredModel || "gpt-4o")
  const [allowedIps, setAllowedIps] = useState(initialSettings.allowedIps || "")
  const [lastUsedAt, setLastUsedAt] = useState<string | null>(
    initialSettings.lastUsedAt ? new Date(initialSettings.lastUsedAt).toLocaleString() : null
  )
  const [userProfile] = useState({ 
    name: initialSettings.name || "", 
    email: initialSettings.email || "", 
    image: initialSettings.image || "" 
  })
  const [mfaEnabled, setMfaEnabled] = useState(initialSettings.mfaEnabled || false)
  const [mfaSecret, setMfaSecret] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [mfaToken, setMfaToken] = useState("")
  const [mfaPassword, setMfaPassword] = useState("")
  const [isSettingUpMFA, setIsSettingUpMFA] = useState(false)
  const [isVerifyingMFA, setIsVerifyingMFA] = useState(false)
  const [isDisablingMFA, setIsDisablingMFA] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)

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
    openrouter: [
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (via OpenRouter)' },
      { id: 'openai/gpt-4o', name: 'GPT-4o (via OpenRouter)' },
      { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B (via OpenRouter)' },
      { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5 (via OpenRouter)' },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V2.5 (via OpenRouter)' },
    ],
    custom: [
      { id: 'custom-model', name: 'Use Provider Default' },
    ]
  }

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
    if (!mfaToken) return
    try {
      setIsDisablingMFA(true)
      await disableMFA(mfaToken, mfaPassword)
      setMfaEnabled(false)
      setShowDisableConfirm(false)
      setMfaToken("")
      setMfaPassword("")
      showToast("MFA disabled.")
    } catch (error) {
      console.error("Disable MFA error:", error)
      const message = error instanceof Error ? error.message : "Failed to disable MFA."
      if (message === "PASSWORD_REQUIRED") {
        showToast("Password required to disable MFA.", "error")
      } else {
        showToast(message, "error")
      }
    } finally {
      setIsDisablingMFA(false)
    }
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
          mfaPassword={mfaPassword}
          setMfaPassword={setMfaPassword}
          isSettingUpMFA={isSettingUpMFA}
          isVerifyingMFA={isVerifyingMFA}
          isDisablingMFA={isDisablingMFA}
          showDisableConfirm={showDisableConfirm}
          setShowDisableConfirm={setShowDisableConfirm}
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
