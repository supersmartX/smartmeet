import React from "react";
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
  RefreshCcw, 
  Save 
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
  decryptionError
}: AIConfigSectionProps) {
  const [isCustomModel, setIsCustomModel] = React.useState(false);

  const currentKey = apiKeys[provider] || "";

  // Helper to detect provider from key prefix
  const detectProvider = (key: string) => {
    if (key.startsWith("sk-ant-")) return "anthropic";
    if (key.startsWith("sk-or-v1-")) return "openrouter";
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-via/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-brand-via" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">AI Configuration</h2>
            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">AI model and provider settings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUsedAt && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-tight">Last active: {lastUsedAt}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Provider Selection */}
        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">AI Provider</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { id: 'openai', name: 'OpenAI', desc: 'GPT-4o & o1 models', icon: Cpu },
              { id: 'anthropic', name: 'Anthropic', desc: 'Claude 3.5 Sonnet', icon: Zap },
              { id: 'google', name: 'Google', desc: 'Gemini 1.5 Pro/Flash', icon: Zap },
              { id: 'groq', name: 'Groq', desc: 'Llama 3.1 70B', icon: Zap },
              { id: 'openrouter', name: 'OpenRouter', desc: 'Any model gateway', icon: ExternalLink },
              { id: 'custom', name: 'Custom Proxy', desc: 'Self-hosted or LiteLLM', icon: Server },
            ].map((p) => {
              const hasKey = !!apiKeys[p.id];
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
                  className={`p-4 rounded-2xl border text-left transition-all group relative ${
                    provider === p.id 
                      ? "border-brand-via bg-brand-via/5 ring-1 ring-brand-via" 
                      : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p.icon className={`w-5 h-5 ${provider === p.id ? "text-brand-via" : "text-zinc-400"}`} />
                    {hasKey && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                        <Check className="w-2.5 h-2.5 text-emerald-500" />
                        <span className="text-[8px] font-black text-emerald-500 uppercase">Linked</span>
                      </div>
                    )}
                  </div>
                  <p className={`text-xs font-black uppercase tracking-widest mb-1 ${provider === p.id ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}`}>
                    {p.name}
                  </p>
                  <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="api-key-input" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
              {provider === 'custom' ? 'Proxy URL / API Key' : `${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`}
            </label>
            <a 
              href={
                provider === 'openai' ? "https://platform.openai.com/api-keys" :
                provider === 'anthropic' ? "https://console.anthropic.com/settings/keys" :
                provider === 'google' ? "https://aistudio.google.com/app/apikey" :
                provider === 'groq' ? "https://console.groq.com/keys" :
                provider === 'openrouter' ? "https://openrouter.ai/keys" : "#"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] font-black text-brand-via uppercase tracking-widest flex items-center gap-1 hover:underline"
            >
              Get Key <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Shield className={`w-4 h-4 ${currentKey ? "text-brand-via" : "text-zinc-300"}`} />
            </div>
            <input
              id="api-key-input"
              type={showKey ? "text" : "password"}
              value={currentKey}
              onChange={onKeyChange}
              placeholder={
                provider === 'openai' ? "sk-..." :
                provider === 'anthropic' ? "sk-ant-..." :
                provider === 'google' ? "AIza..." :
                provider === 'groq' ? "gsk_..." :
                provider === 'openrouter' ? "sk-or-v1-..." : "Enter your key"
              }
              className="w-full h-12 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-xl pl-11 pr-24 text-xs font-bold text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-via/20 transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={() => setShowKey(!showKey)}
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors group/btn"
                title={showKey ? "Hide key" : "Show key"}
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5 text-zinc-400" /> : <Eye className="w-3.5 h-3.5 text-zinc-400" />}
              </button>
              <button
                onClick={() => handleCopy(currentKey)}
                disabled={!currentKey}
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                title="Copy key"
                aria-label="Copy key"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              </button>
            </div>
          </div>
          {decryptionError && (
            <p className="text-[9px] font-bold text-red-500 uppercase tracking-tight flex items-center gap-1 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
              <Shield className="w-3 h-3" /> Failed to decrypt stored API key. Please re-enter your key to restore access.
            </p>
          )}
          {currentKey && !detectProvider(currentKey) && provider !== 'custom' && (
            <p className="text-[9px] font-bold text-amber-500 uppercase tracking-tight flex items-center gap-1">
              <RefreshCcw className="w-3 h-3 animate-spin-slow" /> Format doesn&apos;t match {provider} prefix. Please double-check.
            </p>
          )}
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
