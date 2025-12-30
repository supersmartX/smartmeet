import { Search, Plus, Loader2 } from "lucide-react";

interface RecordingHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onUploadClick: () => void;
  isUploading: boolean;
}

export function RecordingHeader({
  searchQuery,
  setSearchQuery,
  onUploadClick,
  isUploading,
}: RecordingHeaderProps) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-1">
          My Recordings
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-medium uppercase tracking-widest">
          Manage and organize your meeting history
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
        <div className="relative flex-1 sm:min-w-[300px] group" role="search">
          <label htmlFor="search-recordings" className="sr-only">
            Search recordings
          </label>
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-brand-via transition-colors"
            aria-hidden="true"
          />
          <input
            id="search-recordings"
            type="text"
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-brand-via/10 focus:border-brand-via transition-all shadow-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onUploadClick}
            disabled={isUploading}
            className="flex-1 sm:flex-none px-6 sm:px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2 disabled:opacity-50"
            aria-label={isUploading ? "Uploading recording" : "Upload new recording"}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{isUploading ? "UPLOADING..." : "NEW RECORDING"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
