import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RecordingPaginationProps {
  totalRecordings: number;
  filteredCount: number;
}

export function RecordingPagination({ filteredCount }: RecordingPaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 py-4">
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center sm:text-left">
        Showing {filteredCount > 0 ? `1-${filteredCount}` : '0'} of {filteredCount} recordings
      </p>
      <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
        <button
          className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 disabled:opacity-50 flex items-center justify-center gap-2"
          disabled
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <button
          className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center justify-center gap-2"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
