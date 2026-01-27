"use client"

import { useReducer } from "react"
import {
  Key,
  Cpu,
  Zap,
  Server,
  ChevronRight,
  ExternalLink,
  EyeOff,
  Eye,
  Check,
  Copy,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2
} from "lucide-react"
import { updateUserApiKey, validateApiKey } from "@/actions/meeting"
import { UserSettings } from "@/types/meeting"
import { useToast } from "@/hooks/useToast"
import { Toast } from "@/components/Toast"

type APISettingsState = {
  apiKeys: Record<string, string>
  showKey: boolean
  copied: boolean
  isSaving: boolean
  provider: string
  model: string
  allowedIps: string
  isTesting: boolean
  testResult: string | null
  testSuccess: boolean | null
}

type APISettingsAction =
  | { type: 'SET_API_KEY'; provider: string; key: string }
  | { type: 'SET_SHOW_KEY'; payload: boolean }
  | { type: 'SET_COPIED'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_PROVIDER'; payload: string }
  | { type: 'SET_MODEL'; payload: string }
  | { type: 'SET_ALLOWED_IPS'; payload: string }
  | { type: 'SET_TESTING'; payload: boolean }
  | { type: 'SET_TEST_RESULT'; payload: string | null }
  | { type: 'SET_TEST_SUCCESS'; payload: boolean | null }

function apiSettingsReducer(state: APISettingsState, action: APISettingsAction): APISettingsState {
  switch (action.type) {
    case 'SET_API_KEY': return { ...state, apiKeys: { ...state.apiKeys, [action.provider]: action.key } }
    case 'SET_SHOW_KEY': return { ...state, showKey: action.payload }
    case 'SET_COPIED': return { ...state, copied: action.payload }
    case 'SET_SAVING': return { ...state, isSaving: action.payload }
    case 'SET_PROVIDER': return { ...state, provider: action.payload }
    case 'SET_MODEL': return { ...state, model: action.payload }
    case 'SET_ALLOWED_IPS': return { ...state, allowedIps: action.payload }
    case 'SET_TESTING': return { ...state, isTesting: action.payload }
    case 'SET_TEST_RESULT': return { ...state, testResult: action.payload }
    case 'SET_TEST_SUCCESS': return { ...state, testSuccess: action.payload }
    default: return state
  }
}

interface APISettingsClientProps {
  initialSettings: UserSettings
}

export function APISettingsClient({ initialSettings }: APISettingsClientProps) {
  const { toast, showToast, hideToast } = useToast()

  const [state, dispatch] = useReducer(apiSettingsReducer, {
    apiKeys: initialSettings.apiKeys || {},
    showKey: false,
    copied: false,
    isSaving: false,
    provider: initialSettings.preferredProvider || "openai",
    model: initialSettings.preferredModel || "gpt-4o",
    allowedIps: initialSettings.allowedIps || "",
    isTesting: false,
    testResult: null,
    testSuccess: null
  })

  const {
    apiKeys, showKey, copied, isSaving, provider, model, allowedIps,
    isTesting, testResult, testSuccess
  } = state

  const lastUsedAt = initialSettings.lastUsedAt ? new Date(initialSettings.lastUsedAt).toLocaleString() : null

  const setApiKey = (p: string, key: string) => dispatch({ type: 'SET_API_KEY', provider: p, key })
  const apiKey = apiKeys[provider] || ""

  const providerModels: Record<string, { id: string; name: string; }[]> = {
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o (Recommended)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'o1-preview', name: 'o1 Preview' },
      { id: 'o1-mini', name: 'o1 Mini' },
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
    deepgram: [
      { id: 'nova-2', name: 'Deepgram Nova-2 (Recommended)' },
      { id: 'nova-2-meeting', name: 'Deepgram Nova-2 Meeting' },
      { id: 'base', name: 'Deepgram Base' },
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
      // Ensure we're saving all relevant keys including deepgram
      const updatedKeys = { ...apiKeys };
      
      const result = await updateUserApiKey({
        apiKeys: updatedKeys,
        preferredProvider: provider,
        preferredModel: model,
        allowedIps,
        defaultLanguage: initialSettings.defaultLanguage || "en",
        summaryLength: initialSettings.summaryLength || "medium",
        summaryPersona: initialSettings.summaryPersona || "balanced",
        autoProcess: initialSettings.autoProcess ?? true
      })

      if (result.success) {
        showToast("API settings saved successfully!")
      } else {
        showToast(result.error || "Failed to save API settings.", "error")
      }
    } catch (error) {
      console.error("Failed to save API key:", error)
      showToast("An unexpected error occurred while saving API settings.", "error")
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false })
    }
  }

  const handleTestConnection = async () => {
    if (!apiKey) {
      showToast("Please enter an API key first.", "error")
      return
    }

    dispatch({ type: 'SET_TESTING', payload: true })
    dispatch({ type: 'SET_TEST_RESULT', payload: null })
    dispatch({ type: 'SET_TEST_SUCCESS', payload: null })

    try {
      const result = await validateApiKey(provider, apiKey);

      if (result.success) {
        dispatch({ type: 'SET_TEST_RESULT', payload: "Connection successful! Your API key is valid and active." })
        dispatch({ type: 'SET_TEST_SUCCESS', payload: true })
        showToast("API connection test passed!", "success")
      } else {
        dispatch({ type: 'SET_TEST_RESULT', payload: result.error || "Invalid API key. Please check your credentials." })
        dispatch({ type: 'SET_TEST_SUCCESS', payload: false })
        showToast(result.error || "API connection test failed.", "error")
      }
    } catch (error) {
      console.error("Connection test error:", error)
      dispatch({ type: 'SET_TEST_RESULT', payload: "Connection test failed. Please check your network and try again." })
      dispatch({ type: 'SET_TEST_SUCCESS', payload: false })
      showToast("Connection test failed.", "error")
    } finally {
      dispatch({ type: 'SET_TESTING', payload: false })
    }
  }

  // Helper to detect provider from key prefix
  const detectProvider = (key: string) => {
    if (key.startsWith("sk-")) return "openai";
    if (key.startsWith("gsk_")) return "groq";
    if (key.startsWith("AIza")) return "google";
    return null;
  };

  const onKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;

    // Auto-detect provider from key prefix
    const detected = detectProvider(newKey);
    const targetProvider = detected || provider;

    // If a different provider was detected, switch to it first
    if (detected && detected !== provider) {
      dispatch({ type: 'SET_PROVIDER', payload: detected });
    }

    // Set the key for the correct provider
    setApiKey(targetProvider, newKey);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Toast {...toast} onClose={hideToast} />
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">API Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">Configure your API keys and provider settings for AI services.</p>
      </div>

      <div className="grid gap-8">
        {initialSettings.decryptionError && (
          <div className="flex flex-col gap-4 p-6 rounded-[32px] bg-red-500/10 border border-red-500/20 animate-pulse">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest">Security Action Required</p>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-tight">API Key Decryption Failed</p>
              </div>
            </div>
            <p className="text-xs font-bold text-red-600/80 dark:text-red-400/80 leading-relaxed pl-1">
              We were unable to decrypt your stored API keys due to a security update or key rotation. 
              To restore AI functionality, please <span className="underline decoration-2 font-black">re-enter and save your keys</span> below. 
              This is a one-time security measure.
            </p>
          </div>
        )}
      {/* LLM Provider Configuration */}
      <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-via/10 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-brand-via" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">LLM Provider Configuration</h2>
              <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">Select your AI provider for summaries and analysis</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Provider Selection */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">AI Provider</div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Active Provider:</span>
                <span className="text-[9px] font-black text-brand-via uppercase tracking-widest">{provider}</span>
              </div>
            </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'openai', name: 'OpenAI', icon: Cpu },
              { id: 'google', name: 'Gemini', icon: Zap },
              { id: 'groq', name: 'Groq', icon: Zap },
            ].map((p) => {
              const hasKey = !!apiKeys[p.id];
              const isActive = provider === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => dispatch({ type: 'SET_PROVIDER', payload: p.id })}
                  className={`p-3 rounded-xl border text-center transition-all group relative overflow-hidden ${
                    isActive
                      ? "border-brand-via bg-brand-via/5 ring-1 ring-brand-via shadow-sm shadow-brand-via/10"
                      : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center transition-colors ${
                    isActive ? "bg-brand-via text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-zinc-500"
                  }`}>
                    <p.icon className="w-4 h-4" />
                  </div>
                  <p className={`text-[10px] font-black uppercase tracking-widest truncate ${isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {p.name}
                  </p>
                  {hasKey && (
                    <div className="absolute top-1 right-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          </div>

          {/* API Key Configuration Panel */}
          <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label htmlFor="api-key-input" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                    {provider.charAt(0).toUpperCase() + provider.slice(1)} API Key
                  </label>
                  {testSuccess === true && (
                    <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                      <Check className="w-2.5 h-2.5" /> Verified
                    </span>
                  )}
                </div>
                <a
                  href={
                    provider === 'openai' ? "https://platform.openai.com/api-keys" :
                    provider === 'google' ? "https://aistudio.google.com/app/apikey" :
                    provider === 'groq' ? "https://console.groq.com/keys" : "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-black text-brand-via uppercase tracking-widest flex items-center gap-1 hover:underline"
                >
                  Get {provider} Key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors">
                  <Key className={`w-4 h-4 ${apiKey ? "text-brand-via" : "text-zinc-300"}`} />
                </div>
                <input
                  id="api-key-input"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={onKeyChange}
                  placeholder={
                    provider === 'openai' ? "sk-..." :
                    provider === 'google' ? "AIza..." :
                    provider === 'groq' ? "gsk_..." : "Enter your key"
                  }
                  className="w-full h-12 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-11 pr-24 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-via/20 transition-all shadow-sm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    onClick={() => dispatch({ type: 'SET_SHOW_KEY', payload: !showKey })}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    title={showKey ? "Hide key" : "Show key"}
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleCopy}
                    disabled={!apiKey}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    title="Copy key"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {!apiKey && (
                  <p className="text-[9px] font-bold text-red-500 uppercase tracking-tight flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/10">
                    <AlertTriangle className="w-3 h-3" /> No API key configured for {provider}. LLM features will not work.
                  </p>
                )}
                {apiKey && !detectProvider(apiKey) && (
                  <p className="text-[9px] font-bold text-amber-500 uppercase tracking-tight flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/20 shadow-sm shadow-amber-500/5">
                    <AlertTriangle className="w-3 h-3" /> Key format doesn&apos;t match {provider} prefix.
                  </p>
                )}
                <p className="text-[10px] text-zinc-400 font-medium italic">
                  {provider === 'openai' && "Your API key will be encrypted and used only for requests on your behalf."}
                  {provider === 'google' && "Google Gemini keys can be generated for free in the AI Studio console."}
                  {provider === 'groq' && "Groq provides lightning-fast inference for open-source models like Llama 3."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Model Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="space-y-3">
            <label htmlFor="model-select" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">Preferred Model</label>
            <div className="relative group">
              <select
                id="model-select"
                value={model}
                onChange={(e) => dispatch({ type: 'SET_MODEL', payload: e.target.value })}
                className="w-full h-11 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-via/20 appearance-none shadow-sm transition-all group-hover:border-zinc-300 dark:group-hover:border-zinc-700"
              >
                {providerModels[provider]?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                )) || <option value={model}>{model}</option>}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <ChevronRight className="w-3.5 h-3.5 rotate-90" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="ip-restrictions" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">IP Restrictions</label>
            <div className="relative group">
              <input
                id="ip-restrictions"
                type="text"
                value={allowedIps}
                onChange={(e) => dispatch({ type: 'SET_ALLOWED_IPS', payload: e.target.value })}
                placeholder="e.g. 192.168.1.1, 10.0.0.1"
                className="w-full h-11 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-via/20 shadow-sm transition-all group-hover:border-zinc-300 dark:group-hover:border-zinc-700"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Shield className="w-4 h-4" />
            </div>
            <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight leading-tight">
              End-to-end encryption enabled.<br/>Keys are stored in a secure vault.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !apiKey}
              className="px-4 py-2 h-10 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 h-10 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center gap-2 shadow-lg shadow-zinc-900/10 dark:shadow-zinc-100/10"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className={`mt-6 p-5 rounded-2xl border animate-in fade-in slide-in-from-top-2 duration-300 ${testSuccess ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/20' : 'bg-red-50/50 border-red-200 dark:bg-red-500/5 dark:border-red-500/20'}`}>
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-xl ${testSuccess ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10' : 'bg-red-100 text-red-600 dark:bg-red-500/10'}`}>
                {testSuccess ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="flex-1 space-y-1">
                <p className={`text-xs font-black uppercase tracking-widest ${testSuccess ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                  {testSuccess ? 'Connection Verified' : 'Connection Failed'}
                </p>
                <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">{testResult}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Deepgram Speech-to-Text API Section */}
    <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-via/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-brand-via" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">🎙️ Deepgram Speech-to-Text API</h2>
            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">Configure high-accuracy transcription service</p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label htmlFor="deepgram-key-input" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                  Deepgram API Key
                </label>
                {!!apiKeys['deepgram'] && (
                  <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                    <Check className="w-2.5 h-2.5" /> Configured
                  </span>
                )}
              </div>
              <a
                href="https://console.deepgram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-black text-brand-via uppercase tracking-widest flex items-center gap-1 hover:underline"
              >
                Get Deepgram Key <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors">
                <Key className={`w-4 h-4 ${apiKeys['deepgram'] ? "text-brand-via" : "text-zinc-300"}`} />
              </div>
              <input
                id="deepgram-key-input"
                type={showKey ? "text" : "password"}
                value={apiKeys['deepgram'] || ""}
                onChange={(e) => setApiKey('deepgram', e.target.value)}
                placeholder="Enter your Deepgram API key"
                className="w-full h-12 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-11 pr-24 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-via/20 transition-all shadow-sm"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block">Transcription Model</label>
              <select
                value={apiKeys['deepgram_model'] || 'nova-2'}
                onChange={(e) => setApiKey('deepgram_model', e.target.value)}
                className="w-full h-12 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-xs font-bold text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-via/20 appearance-none"
              >
                {providerModels['deepgram'].map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <p className="text-[10px] text-zinc-400 font-medium italic">
              Deepgram is used exclusively for converting meeting audio into high-quality text.
            </p>
          </div>
        </div>
      </div>
    </section>

        {/* API Usage Information */}
        <section className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-zinc-500/10 flex items-center justify-center text-zinc-500">
              <Info className="w-4 h-4" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">API Usage Information</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Last Active</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
                {lastUsedAt || 'Never'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Security Level</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Encrypted
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Storage</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
                Secure Vault
              </span>
            </div>
          </div>
        </section>

        {/* Security Best Practices */}
        <section className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Security Best Practices</h3>
          </div>
          <div className="space-y-4 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 rounded-full bg-brand-via/10 text-brand-via flex items-center justify-center mt-0.5 shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <p>Never share your API keys with anyone</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 rounded-full bg-brand-via/10 text-brand-via flex items-center justify-center mt-0.5 shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <p>Use IP restrictions to limit access to your keys</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 rounded-full bg-brand-via/10 text-brand-via flex items-center justify-center mt-0.5 shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <p>Rotate your keys regularly for enhanced security</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 rounded-full bg-brand-via/10 text-brand-via flex items-center justify-center mt-0.5 shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <p>Test connections before saving to ensure proper configuration</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
