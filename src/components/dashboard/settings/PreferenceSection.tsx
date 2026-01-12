"use client"

import { Globe, FileText, Zap, UserCircle } from "lucide-react"

interface PreferenceSectionProps {
  defaultLanguage: string
  setDefaultLanguage: (lang: string) => void
  summaryLength: string
  setSummaryLength: (length: string) => void
  summaryPersona: string
  setSummaryPersona: (persona: string) => void
  autoProcess: boolean
  setAutoProcess: (auto: boolean) => void
}

export function PreferenceSection({
  defaultLanguage,
  setDefaultLanguage,
  summaryLength,
  setSummaryLength,
  summaryPersona,
  setSummaryPersona,
  autoProcess,
  setAutoProcess
}: PreferenceSectionProps) {
  const languages = [
    { id: 'en', name: 'English' },
    { id: 'es', name: 'Spanish' },
    { id: 'fr', name: 'French' },
    { id: 'de', name: 'German' },
    { id: 'hi', name: 'Hindi' },
    { id: 'ja', name: 'Japanese' },
    { id: 'zh', name: 'Chinese' },
  ]

  const lengths = [
    { id: 'short', name: 'Short (Quick Bullets)' },
    { id: 'medium', name: 'Medium (Balanced)' },
    { id: 'long', name: 'Long (Comprehensive)' },
  ]

  const personas = [
    { id: 'balanced', name: 'Balanced (Standard)', desc: 'Concise and informative' },
    { id: 'technical', name: 'Technical Focus', desc: 'Detailed specs and logic' },
    { id: 'executive', name: 'Executive Summary', desc: 'High-level business impact' },
    { id: 'actionable', name: 'Action Oriented', desc: 'Focus on tasks and deadlines' },
  ]

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 overflow-hidden">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-brand-via/10 flex items-center justify-center text-brand-via">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">User Preferences</h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Tailor your intelligence pipeline</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Default Language */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block">Default Transcription Language</label>
            <div className="grid grid-cols-2 gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setDefaultLanguage(lang.id)}
                  className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between ${
                    defaultLanguage === lang.id
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg"
                      : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {lang.name}
                  {defaultLanguage === lang.id && <div className="w-1.5 h-1.5 rounded-full bg-brand-via shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            {/* Summary Length */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block flex items-center gap-2">
                <FileText className="w-3 h-3" /> Preferred Summary Length
              </label>
              <div className="flex flex-col gap-2">
                {lengths.map((len) => (
                  <button
                    key={len.id}
                    onClick={() => setSummaryLength(len.id)}
                    className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between ${
                      summaryLength === len.id
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg"
                        : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {len.name}
                    {summaryLength === len.id && <div className="w-1.5 h-1.5 rounded-full bg-brand-via shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Summary Persona */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block flex items-center gap-2">
                <UserCircle className="w-3 h-3" /> AI Summary Persona
              </label>
              <div className="grid grid-cols-1 gap-2">
                {personas.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => setSummaryPersona(persona.id)}
                    className={`px-4 py-3 rounded-2xl transition-all text-left flex flex-col gap-1 ${
                      summaryPersona === persona.id
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg"
                        : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-black uppercase tracking-widest">{persona.name}</span>
                      {summaryPersona === persona.id && <div className="w-1.5 h-1.5 rounded-full bg-brand-via shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
                    </div>
                    <span className={`text-[8px] font-bold uppercase tracking-wider ${summaryPersona === persona.id ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {persona.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Process Toggle */}
            <div className="space-y-4 p-6 bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl border border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${autoProcess ? 'bg-brand-via/20 text-brand-via' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">Auto-Process Uploads</h4>
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Start AI pipeline immediately</p>
                  </div>
                </div>
                <button
                  onClick={() => setAutoProcess(!autoProcess)}
                  className={`w-12 h-6 rounded-full transition-all relative ${autoProcess ? 'bg-brand-via' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoProcess ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
