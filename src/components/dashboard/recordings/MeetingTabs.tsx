import React from "react"

export type EditorTab = "transcript" | "summary" | "code" | "tests" | "docs"

export interface TabConfig {
  id: EditorTab
  label: string
  icon: React.ComponentType<{ className?: string }>
  ext: string
  hidden?: boolean
}

interface MeetingTabsProps {
  tabs: TabConfig[]
  activeTab: EditorTab
  onTabChange: (tabId: EditorTab) => void
}

export function MeetingTabs({ tabs, activeTab, onTabChange }: MeetingTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-zinc-100/50 dark:bg-zinc-900/50 p-1.5 rounded-[20px] sm:rounded-[24px] border border-zinc-200/50 dark:border-zinc-800/50 w-fit shrink-0" role="tablist" aria-label="Meeting views">
      {tabs.filter(t => !t.hidden).map((tab) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-[18px] text-sm font-bold transition-all duration-300 ${
              isActive 
                ? "bg-white dark:bg-zinc-800 text-brand-via shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700" 
                : "text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/50"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-brand-via" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"}`} />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
