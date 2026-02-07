import React from "react";
import { 
  Key, 
  Cpu, 
  Zap, 
  ChevronRight, 
  ExternalLink, 
  EyeOff, 
  Eye, 
  Check, 
  Copy, 
  Shield, 
  RefreshCcw, 
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Info
} from "lucide-react";

interface Model {
  id: string;
  name: string;
}

interface AIConfigSectionProps {
  provider: string;
  setProvider: (provider: string) => void;
  model: string;
  setModel: (model: string) => void;
  apiKeys: Record<string, string>;
  setApiKey: (provider: string, key: string) => void;
  showKey: boolean;
  setShowKey: (show: boolean) => void;
  handleCopy: (key: string) => void;
  copied: boolean;
  lastUsedAt: string | null;
  allowedIps: string;
  setAllowedIps: (ips: string) => void;
  handleSave: () => void;
  isSaving: boolean;
  providerModels: Record<string, Model[]>;
  decryptionError?: boolean;
  isTesting?: boolean;
  testResult?: string | null;
  testSuccess?: boolean | null;
  handleTestConnection?: () => void;
}

export function AIConfigSection({
  provider,
  setProvider,
  model,
  setModel,
  apiKeys,
  setApiKey,
  showKey,
  setShowKey,
  handleCopy,
  copied,
  lastUsedAt,
  allowedIps,
  setAllowedIps,
  handleSave,
  isSaving,
  providerModels,
  decryptionError,
  isTesting,
  testResult,
  testSuccess,
  handleTestConnection
}: AIConfigSectionProps) {
  const [isCustomModel, setIsCustomModel] = React.useState(false);

  const currentKey = apiKeys[provider] || "";

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
      setProvider(detected);
    }
    
    // Set the key for the correct provider
    setApiKey(targetProvider, newKey);
  };

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-via/10 flex items-center justify-center">
            <Key className="w-6 h-6 text-brand-via" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">AI Configuration</h2>
            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">AI model and provider settings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUsedAt && (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-tight">Last active: {lastUsedAt}</span>
            </div>
          )}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                  onClick={() => {
                    setProvider(p.id)
                    if (p.id !== 'custom') {
                      const firstModel = providerModels[p.id]?.[0]?.id || "";
                      setModel(firstModel)
                      setIsCustomModel(false)
                    } else {
                      setIsCustomModel(true)
                    }
                  }}
                  className={`p-4 rounded-xl border text-center transition-all group relative overflow-hidden ${
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

        {/* API Key Input */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label htmlFor="api-key-input" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
                  {provider === 'custom' ? 'Proxy URL / API Key' : `${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`}
                </label>
                {testSuccess === true && (
                  <span className="flex items-center gap-2 text-[8px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-2 rounded-md border border-emerald-500/20">
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
                className="text-[9px] font-black text-brand-via uppercase tracking-widest flex items-center gap-2 hover:underline"
              >
                Get {provider} Key <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors">
                <Key className={`w-4 h-4 ${currentKey ? "text-brand-via" : "text-zinc-300"}`} />
              </div>
              <input
                id="api-key-input"
                type={showKey ? "text" : "password"}
                value={currentKey}
                onChange={onKeyChange}
                placeholder={
                  provider === 'openai' ? "sk-..." :
                  provider === 'google' ? "AIza..." :
                  provider === 'groq' ? "gsk_..." : "Enter your key"
                }
                className="w-full h-12 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-11 pr-24 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-via/20 transition-all shadow-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  title={showKey ? "Hide key" : "Show key"}
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleCopy(currentKey)}
                  disabled={!currentKey}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  title="Copy key"
                  aria-label="Copy key"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {!currentKey && provider !== 'custom' && (
                <p className="text-[9px] font-bold text-brand-via uppercase tracking-tight flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-via/5 border border-brand-via/10">
                  <Info className="w-3 h-3" /> No personal API key configured. Using system default for {provider}.
                </p>
              )}
              {decryptionError && (
                <div className="flex flex-col gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 animate-pulse">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <Shield className="w-5 h-5" />
                    <p className="text-xs font-black uppercase tracking-widest">Security Action Required</p>
                  </div>
                  <p className="text-[11px] font-bold text-red-600/80 dark:text-red-400/80 leading-relaxed">
                    We were unable to decrypt your stored API keys due to a security update or key rotation. 
                    Please <span className="underline decoration-2">re-enter and save your keys</span> to restore AI functionality.
                  </p>
                </div>
              )}
              {currentKey && !detectProvider(currentKey) && provider !== 'custom' && (
                <p className="text-[9px] font-bold text-amber-500 uppercase tracking-tight flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
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

          {/* Test Connection Section */}
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-via/10 flex items-center justify-center">
                  <RefreshCcw className={`w-4 h-4 text-brand-via ${isTesting ? "animate-spin" : ""}`} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Connection Test</h3>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !currentKey}
                className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {isTesting ? "Testing..." : "Test Connection"}
              </button>
            </div>

            {testResult && (
              <div className={`p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${
                testSuccess 
                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                  : "bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400"
              }`}>
                <div className="flex items-start gap-4">
                  {testSuccess ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">
                      {testSuccess ? "Test Passed" : "Test Failed"}
                    </p>
                    <p className="text-[11px] font-bold leading-relaxed">{testResult}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Model Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-zinc-50 dark:border-zinc-800/50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="model-select" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block">Preferred Model</label>
              <button 
                onClick={() => setIsCustomModel(!isCustomModel)}
                className="text-[9px] font-black text-brand-via uppercase tracking-widest hover:underline"
              >
                {isCustomModel ? "Choose from list" : "Enter custom model ID"}
              </button>
            </div>
            
            <div className="relative">
            {isCustomModel ? (
              <input 
                id="model-select"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full h-12 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 text-xs font-bold text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-via/20"
                placeholder="e.g. gpt-4-32k or your-custom-model"
              />
            ) : (
                <>
                  <select
                    id="model-select"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full h-12 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 text-xs font-bold text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-via/20 appearance-none"
                  >
                    {providerModels[provider]?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    )) || <option value={model}>{model}</option>}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronRight className="w-4 h-4 text-zinc-400 rotate-90" aria-hidden="true" />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label htmlFor="ip-restrictions" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block">IP Restrictions (Security)</label>
            <div className="relative">
              <input 
                id="ip-restrictions"
                type="text"
                value={allowedIps}
                onChange={(e) => setAllowedIps(e.target.value)}
                placeholder="e.g. 192.168.1.1, 10.0.0.1"
                className="w-full h-12 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 text-xs font-bold text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-via/20"
              />
              <p className="mt-2 text-[9px] font-medium text-zinc-400 italic">Comma-separated list of allowed IP addresses for API access.</p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-6 flex items-center justify-between border-t border-zinc-50 dark:border-zinc-800/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Shield className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight leading-tight">
              All keys are encrypted at rest<br/>and never stored in plain text.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="h-12 px-8 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shadow-lg shadow-zinc-200 dark:shadow-none disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCcw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
