"use client"

import { useReducer } from "react"
import { 
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
import { PreferenceSection } from "@/components/dashboard/settings/PreferenceSection"
import { BillingSection } from "./BillingSection"

type SettingsState = {
  apiKeys: Record<string, string>
  showKey: boolean
  copied: boolean
  isSaving: boolean
  provider: string
  model: string
  allowedIps: string
  defaultLanguage: string
  summaryLength: string
  summaryPersona: string
  autoProcess: boolean
  mfaEnabled: boolean
  mfaSecret: string
  qrCodeUrl: string
  mfaToken: string
  mfaPassword: string
  isSettingUpMFA: boolean
  isVerifyingMFA: boolean
  isDisablingMFA: boolean
  showDisableConfirm: boolean
}

type SettingsAction =
  | { type: 'SET_API_KEY'; provider: string; key: string }
  | { type: 'SET_SHOW_KEY'; payload: boolean }
  | { type: 'SET_COPIED'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_PROVIDER'; payload: string }
  | { type: 'SET_MODEL'; payload: string }
  | { type: 'SET_ALLOWED_IPS'; payload: string }
  | { type: 'SET_DEFAULT_LANGUAGE'; payload: string }
  | { type: 'SET_SUMMARY_LENGTH'; payload: string }
  | { type: 'SET_SUMMARY_PERSONA'; payload: string }
  | { type: 'SET_AUTO_PROCESS'; payload: boolean }
  | { type: 'SET_MFA_ENABLED'; payload: boolean }
  | { type: 'SET_MFA_SECRET'; payload: string }
  | { type: 'SET_QR_CODE_URL'; payload: string }
  | { type: 'SET_MFA_TOKEN'; payload: string }
  | { type: 'SET_MFA_PASSWORD'; payload: string }
  | { type: 'SET_SETTING_UP_MFA'; payload: boolean }
  | { type: 'SET_VERIFYING_MFA'; payload: boolean }
  | { type: 'SET_DISABLING_MFA'; payload: boolean }
  | { type: 'SET_SHOW_DISABLE_CONFIRM'; payload: boolean }

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_API_KEY': return { ...state, apiKeys: { ...state.apiKeys, [action.provider]: action.key } }
    case 'SET_SHOW_KEY': return { ...state, showKey: action.payload }
    case 'SET_COPIED': return { ...state, copied: action.payload }
    case 'SET_SAVING': return { ...state, isSaving: action.payload }
    case 'SET_PROVIDER': return { ...state, provider: action.payload }
    case 'SET_MODEL': return { ...state, model: action.payload }
    case 'SET_ALLOWED_IPS': return { ...state, allowedIps: action.payload }
    case 'SET_DEFAULT_LANGUAGE': return { ...state, defaultLanguage: action.payload }
    case 'SET_SUMMARY_LENGTH': return { ...state, summaryLength: action.payload }
    case 'SET_SUMMARY_PERSONA': return { ...state, summaryPersona: action.payload }
    case 'SET_AUTO_PROCESS': return { ...state, autoProcess: action.payload }
    case 'SET_MFA_ENABLED': return { ...state, mfaEnabled: action.payload }
    case 'SET_MFA_SECRET': return { ...state, mfaSecret: action.payload }
    case 'SET_QR_CODE_URL': return { ...state, qrCodeUrl: action.payload }
    case 'SET_MFA_TOKEN': return { ...state, mfaToken: action.payload }
    case 'SET_MFA_PASSWORD': return { ...state, mfaPassword: action.payload }
    case 'SET_SETTING_UP_MFA': return { ...state, isSettingUpMFA: action.payload }
    case 'SET_VERIFYING_MFA': return { ...state, isVerifyingMFA: action.payload }
    case 'SET_DISABLING_MFA': return { ...state, isDisablingMFA: action.payload }
    case 'SET_SHOW_DISABLE_CONFIRM': return { ...state, showDisableConfirm: action.payload }
    default: return state
  }
}

interface SettingsClientProps {
  initialSettings: UserSettings
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const { toast, showToast, hideToast } = useToast()
  
  const [state, dispatch] = useReducer(settingsReducer, {
    apiKeys: initialSettings.apiKeys || {},
    showKey: false,
    copied: false,
    isSaving: false,
    provider: initialSettings.preferredProvider || "openai",
    model: initialSettings.preferredModel || "gpt-4o",
    allowedIps: initialSettings.allowedIps || "",
    defaultLanguage: initialSettings.defaultLanguage || "en",
    summaryLength: initialSettings.summaryLength || "medium",
    summaryPersona: initialSettings.summaryPersona || "balanced",
    autoProcess: initialSettings.autoProcess ?? true,
    mfaEnabled: initialSettings.mfaEnabled || false,
    mfaSecret: "",
    qrCodeUrl: "",
    mfaToken: "",
    mfaPassword: "",
    isSettingUpMFA: false,
    isVerifyingMFA: false,
    isDisablingMFA: false,
    showDisableConfirm: false,
  })

  const {
    apiKeys, showKey, copied, isSaving, provider, model, allowedIps,
    defaultLanguage, summaryLength, summaryPersona, autoProcess,
    mfaEnabled, mfaSecret, qrCodeUrl, mfaToken, mfaPassword,
    isSettingUpMFA, isVerifyingMFA, isDisablingMFA, showDisableConfirm
  } = state

  const lastUsedAt = initialSettings.lastUsedAt ? new Date(initialSettings.lastUsedAt).toLocaleString() : null
  const userProfile = { 
    name: initialSettings.name || "", 
    email: initialSettings.email || "", 
    image: initialSettings.image || "" 
  }

  const setApiKey = (p: string, key: string) => dispatch({ type: 'SET_API_KEY', provider: p, key })
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
    dispatch({ type: 'SET_COPIED', payload: true })
    setTimeout(() => dispatch({ type: 'SET_COPIED', payload: false }), 2000)
  }

  const handleSave = async () => {
    dispatch({ type: 'SET_SAVING', payload: true })
    try {
      const result = await updateUserApiKey({ 
        apiKeys, 
        preferredProvider: provider, 
        preferredModel: model,
        allowedIps,
        defaultLanguage,
        summaryLength,
        summaryPersona,
        autoProcess
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
      dispatch({ type: 'SET_SAVING', payload: false })
    }
  }

  const handleSetupMFA = async () => {
    try {
      dispatch({ type: 'SET_SETTING_UP_MFA', payload: true })
      const result = await generateMFASecret()
      if (result.success && result.data) {
        dispatch({ type: 'SET_MFA_SECRET', payload: result.data.secret })
        dispatch({ type: 'SET_QR_CODE_URL', payload: result.data.qrCodeUrl })
      } else {
        showToast(result.error || "Failed to initialize MFA setup.", "error")
      }
    } catch (error) {
      console.error("MFA Setup error:", error)
      showToast("An unexpected error occurred during MFA setup.", "error")
    } finally {
      dispatch({ type: 'SET_SETTING_UP_MFA', payload: false })
    }
  }

  const handleVerifyMFA = async () => {
    if (!mfaToken) return
    try {
      dispatch({ type: 'SET_VERIFYING_MFA', payload: true })
      const result = await verifyAndEnableMFA(mfaToken, mfaSecret)
      if (result.success) {
        dispatch({ type: 'SET_MFA_ENABLED', payload: true })
        dispatch({ type: 'SET_QR_CODE_URL', payload: "" })
        dispatch({ type: 'SET_MFA_SECRET', payload: "" })
        dispatch({ type: 'SET_MFA_TOKEN', payload: "" })
        showToast("MFA enabled successfully!")
      } else {
        showToast(result.error || "Failed to verify MFA code.", "error")
      }
    } catch (error) {
      console.error("MFA verification error:", error)
      showToast("An unexpected error occurred during verification.", "error")
    } finally {
      dispatch({ type: 'SET_VERIFYING_MFA', payload: false })
    }
  }

  const handleDisableMFA = async () => {
    if (!mfaToken) return
    try {
      dispatch({ type: 'SET_DISABLING_MFA', payload: true })
      const result = await disableMFA(mfaToken, mfaPassword)
      if (result.success) {
        dispatch({ type: 'SET_MFA_ENABLED', payload: false })
        dispatch({ type: 'SET_SHOW_DISABLE_CONFIRM', payload: false })
        dispatch({ type: 'SET_MFA_TOKEN', payload: "" })
        dispatch({ type: 'SET_MFA_PASSWORD', payload: "" })
        showToast("MFA disabled.")
      } else {
        const message = result.error || "Failed to disable MFA."
        if (message === "PASSWORD_REQUIRED") {
          showToast("Password required to disable MFA.", "error")
        } else {
          showToast(message, "error")
        }
      }
    } catch (error) {
      console.error("Disable MFA error:", error)
      showToast("An unexpected error occurred while disabling MFA.", "error")
    } finally {
      dispatch({ type: 'SET_DISABLING_MFA', payload: false })
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Toast {...toast} onClose={hideToast} />
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
          setProvider={(p) => dispatch({ type: 'SET_PROVIDER', payload: p })}
          model={model}
          setModel={(m) => dispatch({ type: 'SET_MODEL', payload: m })}
          apiKeys={apiKeys}
          setApiKey={setApiKey}
          showKey={showKey}
          setShowKey={(s) => dispatch({ type: 'SET_SHOW_KEY', payload: s })}
          handleCopy={handleCopy}
          copied={copied}
          lastUsedAt={lastUsedAt}
          allowedIps={allowedIps}
          setAllowedIps={(ips) => dispatch({ type: 'SET_ALLOWED_IPS', payload: ips })}
          handleSave={handleSave}
          isSaving={isSaving}
          providerModels={providerModels}
          decryptionError={initialSettings.decryptionError}
        />

        <PreferenceSection 
          defaultLanguage={defaultLanguage}
          setDefaultLanguage={(l) => dispatch({ type: 'SET_DEFAULT_LANGUAGE', payload: l })}
          summaryLength={summaryLength}
          setSummaryLength={(sl) => dispatch({ type: 'SET_SUMMARY_LENGTH', payload: sl })}
          summaryPersona={summaryPersona}
          setSummaryPersona={(sp) => dispatch({ type: 'SET_SUMMARY_PERSONA', payload: sp })}
          autoProcess={autoProcess}
          setAutoProcess={(ap) => dispatch({ type: 'SET_AUTO_PROCESS', payload: ap })}
        />

        <MFASection 
          mfaEnabled={mfaEnabled}
          qrCodeUrl={qrCodeUrl}
          mfaSecret={mfaSecret}
          mfaToken={mfaToken}
          setMfaToken={(t) => dispatch({ type: 'SET_MFA_TOKEN', payload: t })}
          mfaPassword={mfaPassword}
          setMfaPassword={(p) => dispatch({ type: 'SET_MFA_PASSWORD', payload: p })}
          isSettingUpMFA={isSettingUpMFA}
          isVerifyingMFA={isVerifyingMFA}
          isDisablingMFA={isDisablingMFA}
          showDisableConfirm={showDisableConfirm}
          setShowDisableConfirm={(s) => dispatch({ type: 'SET_SHOW_DISABLE_CONFIRM', payload: s })}
          handleSetupMFA={handleSetupMFA}
          handleVerifyMFA={handleVerifyMFA}
          handleDisableMFA={handleDisableMFA}
          setQrCodeUrl={(url) => dispatch({ type: 'SET_QR_CODE_URL', payload: url })}
          setMfaSecret={(s) => dispatch({ type: 'SET_MFA_SECRET', payload: s })}
        />

        <BillingSection 
          plan={initialSettings.plan}
          meetingQuota={initialSettings.meetingQuota}
          meetingsUsed={initialSettings.meetingsUsed}
          stripeSubscriptionId={initialSettings.stripeSubscriptionId}
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
    </div>
  )
}
