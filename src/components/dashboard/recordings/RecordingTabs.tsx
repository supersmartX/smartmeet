import React from "react";

interface RecordingTabsProps {
  filter: string;
  setFilter: (filter: string) => void;
}

export function RecordingTabs({ filter: activeTab, setFilter: onTabChange }: RecordingTabsProps) {
  const tabs = [
    { id: "all", label: "All Meetings" },
    { id: "recent", label: "Recent" },
    { id: "action items", label: "Action Items" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-zinc-100/50 dark:bg-zinc-900/50 p-1.5 rounded-[20px] sm:rounded-[24px] border border-zinc-200/50 dark:border-zinc-800/50 w-fit" role="tablist" aria-label="Recording filters">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id || (activeTab === "all meetings" && tab.id === "all");
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls="recording-table"
            id={`tab-${tab.id.replace(/\s+/g, '-')}`}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-[18px] text-xs font-bold transition-all duration-300 ${
              isActive
                ? "bg-white dark:bg-zinc-800 text-brand-via shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/50"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
