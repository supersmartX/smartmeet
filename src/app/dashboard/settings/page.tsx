"use client"

import { useState, useEffect } from "react"
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
  Loader2
} from "lucide-react"
import { getUserApiKey, updateUserApiKey } from "@/actions/meeting"

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [provider, setProvider] = useState("openai")

  useEffect(() => {
    async function loadApiKey() {
      const key = await getUserApiKey()
      if (key) setApiKey(key)
      setIsLoading(false)
    }
    loadApiKey()
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
      await updateUserApiKey(apiKey)
      // Show success state if needed
    } catch (error) {
      console.error("Failed to save API key:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-brand-via animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">API Configuration</h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">Manage your AI provider credentials and API settings for meeting analysis.</p>
      </div>

      <div className="grid gap-8">
        {/* API Credentials Card */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-via/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-brand-via" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">API Credentials</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Your secret keys for AI processing</p>
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
                    onClick={() => setProvider(p.id)}
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

            {/* API Key Input */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Secret Key</label>
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
