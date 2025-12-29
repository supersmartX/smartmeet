"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { 
  Key, 
  Shield, 
  Zap, 
  ExternalLink, 
  Copy, 
  Check, 
  Eye, 
  EyeOff,
  Save,
  Server,
  Cpu,
  RefreshCcw,
  Loader2,
  User as UserIcon,
  Mail,
  ChevronRight,
  QrCode,
  ShieldCheck,
  Smartphone,
  AlertCircle
} from "lucide-react"
import { getUserSettings, updateUserApiKey } from "@/actions/meeting"
import { generateMFASecret, verifyAndEnableMFA, disableMFA } from "@/actions/mfa"

interface UserSettings {
  apiKey: string | null;
  preferredProvider: string | null;
  preferredModel: string | null;
  allowedIps: string;
  lastUsedAt: Date | null;
  name: string | null;
  email: string | null;
  image: string | null;
  mfaEnabled: boolean;
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("")
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
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastType, setToastType] = useState<"success" | "error">("success")

  const providerModels: Record<string, { id: string, name: string }[]> = {
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o (Recommended)' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'o1-preview', name: 'o1 Preview' },
      { id: 'o1-mini', name: 'o1 Mini' },
    ],
    anthropic: [
      { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
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
        const settings = (await getUserSettings()) as UserSettings | null
        if (settings) {
          setApiKey(settings.apiKey || "")
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

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateUserApiKey(apiKey, provider, model, allowedIps)
      showNotification("Settings saved successfully!")
    } catch (error) {
      console.error("Failed to save API key:", error)
      showNotification("Failed to save settings.", "error")
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
      showNotification("Failed to initialize MFA setup.", "error")
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
      showNotification("MFA enabled successfully!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to verify MFA code."
      showNotification(message, "error")
    } finally {
      setIsVerifyingMFA(false)
    }
  }

  const handleDisableMFA = async () => {
    if (!confirm("Are you sure you want to disable MFA? This will make your account less secure.")) return
    try {
      await disableMFA()
      setMfaEnabled(false)
      showNotification("MFA disabled.")
    } catch (error) {
      console.error("Disable MFA error:", error)
      showNotification("Failed to disable MFA.", "error")
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
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Account Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">Manage your personal profile and AI provider configurations.</p>
      </div>

      <div className="grid gap-8">
        {/* User Profile Card */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-via/10 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-brand-via" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Personal Profile</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Your account information</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text"
                    value={userProfile.name}
                    readOnly
                    className="w-full h-12 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-xl pl-12 pr-4 text-sm font-bold text-zinc-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="email"
                    value={userProfile.email}
                    readOnly
                    className="w-full h-12 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-xl pl-12 pr-4 text-sm font-bold text-zinc-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <p className="text-[10px] font-bold text-zinc-400 italic">
              * Profile editing is managed via your identity provider.
            </p>
          </div>
        </section>

        {/* API Credentials Card */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-via/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-brand-via" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">AI Configuration</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">AI model and provider settings</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Provider Selection */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block">AI Provider</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'openai', name: 'OpenAI', desc: 'GPT-4o & o1 models', icon: Cpu },
                  { id: 'anthropic', name: 'Anthropic', desc: 'Claude 3.5 Sonnet', icon: Zap },
                  { id: 'custom', name: 'Custom Proxy', desc: 'Self-hosted or LiteLLM', icon: Server },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProvider(p.id)
                      setModel(providerModels[p.id][0].id)
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all group ${
                      provider === p.id 
                        ? "border-brand-via bg-brand-via/5 ring-1 ring-brand-via" 
                        : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p.icon className={`w-5 h-5 ${provider === p.id ? "text-brand-via" : "text-zinc-400"}`} />
                      {provider === p.id && <div className="w-2 h-2 rounded-full bg-brand-via" />}
                    </div>
                    <p className={`text-xs font-black uppercase tracking-widest mb-1 ${provider === p.id ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}>
                      {p.name}
                    </p>
                    <p className="text-[10px] font-medium text-zinc-400 leading-tight">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block">Preferred Model</label>
              <div className="relative">
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full h-12 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 text-xs font-bold text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-via/20 appearance-none"
                >
                  {providerModels[provider].map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-zinc-400 rotate-90" />
                </div>
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">API Key</label>
                  {lastUsedAt && (
                    <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      Last used: {lastUsedAt}
                    </span>
                  )}
                </div>
                <button className="text-[10px] font-black text-brand-via hover:underline uppercase tracking-widest flex items-center gap-1">
                  How to get a key? <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div className="relative group">
                <input 
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full h-14 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-via/20 focus:border-brand-via transition-all"
                  placeholder="sk-..."
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button 
                    onClick={() => setShowKey(!showKey)}
                    className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={handleCopy}
                    className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-[10px] font-bold text-zinc-400 italic">
                * Your API key is encrypted and stored securely. We never share it with third parties.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">IP Restriction</h4>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Limit key usage to specific IP addresses</p>
                </div>
              </div>
              <div className="relative group">
                <Shield className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-via" />
                <input 
                  type="text"
                  value={allowedIps}
                  onChange={(e) => setAllowedIps(e.target.value)}
                  className="w-full h-14 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-12 text-sm focus:outline-none focus:ring-2 focus:ring-brand-via/20 focus:border-brand-via transition-all"
                  placeholder="e.g. 192.168.1.1, 10.0.0.1 (Optional)"
                />
              </div>
              <p className="text-[10px] font-bold text-zinc-400 italic">
                * Leave blank to allow all IPs. Use commas to separate multiple addresses.
              </p>
            </div>
          </div>

          <div className="px-8 py-4 bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Secure Storage Active</span>
            </div>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {isSaving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </section>

        {/* Security & MFA Card */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-via/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-brand-via" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Security</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Two-factor authentication & account security</p>
              </div>
            </div>
            {mfaEnabled && (
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                MFA Protected
              </span>
            )}
          </div>

          <div className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">Multi-Factor Authentication</h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight leading-relaxed max-w-md">
                  Add an extra layer of security to your account by requiring a code from your authenticator app when you log in.
                </p>
              </div>
              
              {!mfaEnabled && !qrCodeUrl && (
                <button
                  onClick={handleSetupMFA}
                  disabled={isSettingUpMFA}
                  className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-black/5"
                >
                  {isSettingUpMFA ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Smartphone className="w-3 h-3" />}
                  Setup 2FA
                </button>
              )}

              {mfaEnabled && (
                <button
                  onClick={handleDisableMFA}
                  className="px-6 py-3 border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Disable 2FA
                </button>
              )}
            </div>

            {qrCodeUrl && !mfaEnabled && (
              <div className="mt-8 p-6 bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="space-y-4 flex-shrink-0">
                    <div className="w-48 h-48 bg-white p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-6">
                      <Image 
                        src={qrCodeUrl} 
                        alt="MFA QR Code" 
                        width={192} 
                        height={192} 
                        className="w-full h-full"
                        unoptimized
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Backup Code</p>
                      <code className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 block bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                        {mfaSecret}
                      </code>
                    </div>
                  </div>

                  <div className="flex-1 space-y-6">
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Verify Setup</h4>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight leading-relaxed">
                        Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code below to confirm.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="relative">
                        <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="000 000"
                          value={mfaToken}
                          onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ""))}
                          className="w-full h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 text-sm font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-brand-via/20"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleVerifyMFA}
                          disabled={isVerifyingMFA || mfaToken.length !== 6}
                          className="flex-1 h-12 bg-brand-via text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isVerifyingMFA ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                          Verify & Activate
                        </button>
                        <button
                          onClick={() => {
                            setQrCodeUrl("")
                            setMfaSecret("")
                            setMfaToken("")
                          }}
                          className="px-6 h-12 border border-zinc-200 dark:border-zinc-800 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

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

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className={`${
            toastType === "success" ? "bg-zinc-900 border-white/10" : "bg-red-950 border-red-500/20"
          } text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border`}>
            {toastType === "success" ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {toastMessage}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
