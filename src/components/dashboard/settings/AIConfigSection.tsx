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
  apiKey: string;
  setApiKey: (key: string) => void;
  showKey: boolean;
  setShowKey: (show: boolean) => void;
  handleCopy: () => void;
  copied: boolean;
  lastUsedAt: string | null;
  allowedIps: string;
  setAllowedIps: (ips: string) => void;
  handleSave: () => void;
  isSaving: boolean;
  providerModels: Record<string, Model[]>;
}

export function AIConfigSection({
  provider,
  setProvider,
  model,
  setModel,
  apiKey,
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
  providerModels
}: AIConfigSectionProps) {
  const [isCustomModel, setIsCustomModel] = React.useState(false);

  return (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { id: 'openai', name: 'OpenAI', desc: 'GPT-4o & o1 models', icon: Cpu },
              { id: 'anthropic', name: 'Anthropic', desc: 'Claude 3.5 Sonnet', icon: Zap },
              { id: 'google', name: 'Google', desc: 'Gemini 1.5 Pro/Flash', icon: Zap },
              { id: 'groq', name: 'Groq', desc: 'Llama 3.1 70B', icon: Zap },
              { id: 'custom', name: 'Custom Proxy', desc: 'Self-hosted or LiteLLM', icon: Server },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setProvider(p.id)
                  if (p.id !== 'custom') {
                    setModel(providerModels[p.id][0].id)
                    setIsCustomModel(false)
                  } else {
                    setIsCustomModel(true)
                  }
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

        {/* API Key Input */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label htmlFor="api-key" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">API Key</label>
              {lastUsedAt && (
                <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md" role="status" aria-label={`API key last used at ${lastUsedAt}`}>
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
              id="api-key"
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
                aria-label={showKey ? "Hide API Key" : "Show API Key"}
              >
                {showKey ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
              </button>
              <button 
                onClick={handleCopy}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                aria-label="Copy API Key to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
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
  );
}
