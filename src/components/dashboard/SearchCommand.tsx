"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { 
  Search, 
  FileVideo, 
  Layout, 
  Settings, 
  HelpCircle,
  Loader2,
  ChevronRight
} from "lucide-react";
import { globalSearch } from "@/actions/search";

interface SearchResult {
  meetings: Array<{ id: string; title: string; type: string; createdAt: Date }>;
  navigation: Array<{ title: string; href: string; type: string }>;
}

export function SearchCommand({ 
  isOpen, 
  setIsOpen 
}: { 
  isOpen: boolean; 
  setIsOpen: (open: boolean) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, setIsOpen]);

  const handleSearch = React.useCallback(async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    const res = await globalSearch(val);
    if (res.success && res.data) {
      setResults(res.data as SearchResult);
    }
    setLoading(false);
  }, []);

  const onSelect = (href: string) => {
    router.push(href);
    setIsOpen(false);
    setQuery("");
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="w-full max-w-xl mx-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="flex flex-col h-full">
          <div className="flex items-center px-4 border-b border-zinc-100 dark:border-zinc-900 h-14">
            <Search className="w-4 h-4 text-zinc-400 mr-3 shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Search everything..."
              value={query}
              onValueChange={handleSearch}
              className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 h-full"
            />
            {loading && <Loader2 className="w-4 h-4 text-zinc-400 animate-spin ml-2" />}
            <div className="flex items-center gap-1 ml-4 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <span className="text-[10px] font-medium text-zinc-400">ESC</span>
            </div>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
            <Command.Empty className="py-12 text-center">
              <div className="flex flex-col items-center gap-2">
                <Search className="w-8 h-8 text-zinc-200 dark:text-zinc-800" />
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">No results found for &quot;{query}&quot;</p>
              </div>
            </Command.Empty>

            {results?.navigation && results.navigation.length > 0 && (
              <Command.Group heading={<span className="px-2 mb-2 block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Navigation</span>}>
                {results.navigation.map((nav) => (
                  <Command.Item
                    key={nav.href}
                    onSelect={() => onSelect(nav.href)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-black border border-transparent group-hover:border-zinc-200 dark:group-hover:border-zinc-800 transition-all">
                      {nav.title === 'Dashboard' && <Layout className="w-4 h-4" />}
                      {nav.title === 'Recordings' && <FileVideo className="w-4 h-4" />}
                      {nav.title === 'Settings' && <Settings className="w-4 h-4" />}
                      {nav.title === 'Help & Support' && <HelpCircle className="w-4 h-4" />}
                    </div>
                    <span>{nav.title}</span>
                    <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results?.meetings && results.meetings.length > 0 && (
              <Command.Group heading={<span className="px-2 my-2 block text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-4">Recordings</span>}>
                {results.meetings.map((meeting) => (
                  <Command.Item
                    key={meeting.id}
                    onSelect={() => onSelect(`/dashboard/recordings/${meeting.id}`)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand-via/5 flex items-center justify-center border border-transparent group-hover:border-brand-via/20 transition-all">
                      <FileVideo className="w-4 h-4 text-brand-via" />
                    </div>
                    <div className="flex flex-col">
                      <span>{meeting.title}</span>
                      <span className="text-[9px] font-medium text-zinc-400 uppercase tracking-tighter">
                        {new Date(meeting.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {!query && (
              <div className="p-4 text-center">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button 
                    onClick={() => onSelect('/dashboard')}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-900 hover:border-brand-via/30 hover:bg-brand-via/5 transition-all group"
                  >
                    <Layout className="w-5 h-5 text-zinc-400 group-hover:text-brand-via" />
                    <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">Dashboard</span>
                  </button>
                  <button 
                    onClick={() => onSelect('/dashboard/recordings')}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-900 hover:border-brand-via/30 hover:bg-brand-via/5 transition-all group"
                  >
                    <FileVideo className="w-5 h-5 text-zinc-400 group-hover:text-brand-via" />
                    <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">Recordings</span>
                  </button>
                </div>
              </div>
            )}
          </Command.List>

          <div className="flex items-center justify-between px-4 h-10 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[8px] font-black text-zinc-500">↵</kbd>
                <span className="text-[9px] font-bold text-zinc-400 uppercase">Select</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[8px] font-black text-zinc-500">↑↓</kbd>
                <span className="text-[9px] font-bold text-zinc-400 uppercase">Navigate</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-zinc-400 uppercase">Search by</span>
              <span className="text-[10px] font-black text-brand-via">SupersmartX AI</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
