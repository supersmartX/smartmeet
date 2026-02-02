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
    <div className="flex bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar shrink-0">
      {tabs.filter(t => !t.hidden).map((tab) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-[11px] border-r border-zinc-200 dark:border-zinc-800 transition-all min-w-[120px] relative group ${
              isActive 
                ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" 
                : "text-zinc-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-900/50"
            }`}
          >
            {isActive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-via" />}
            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-brand-via" : "text-zinc-400"}`} />
            <span className="truncate font-medium">{tab.label}{tab.ext}</span>
          </button>
        )
      })}
    </div>
  )
}
