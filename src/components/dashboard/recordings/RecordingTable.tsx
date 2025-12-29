import React from "react";
import { Video, Search } from "lucide-react";
import { RecordingRow } from "./RecordingRow";

interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration?: string;
  participants?: number;
  status: string;
  userId: string;
  audioUrl?: string;
}

interface RecordingTableProps {
  isLoading: boolean;
  error: string | null;
  recordings: Meeting[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setFilter: (filter: string) => void;
  fetchMeetings: () => void;
  onRename: (id: string, newTitle: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  renderHighlightedText: (text: string, query: string) => React.ReactNode;
}

export function RecordingTable({
  isLoading,
  error,
  recordings,
  searchQuery,
  setSearchQuery,
  setFilter,
  fetchMeetings,
  onRename,
  onDelete,
  renderHighlightedText,
}: RecordingTableProps) {
  if (error) {
    return (
      <div 
        id="recording-table"
        role="region"
        aria-labelledby="recordings-heading"
        className="bg-white dark:bg-zinc-900 rounded-[24px] sm:rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/5 flex-1 flex flex-col min-h-[400px] relative overflow-hidden"
      >
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-600 dark:text-red-400">
            <Video className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Failed to load recordings
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
              {error}
            </p>
          </div>
          <button
            onClick={fetchMeetings}
            className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
        id="recording-table"
        role="region"
        aria-labelledby="recordings-heading"
        className="bg-white dark:bg-zinc-900 rounded-[24px] sm:rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/5 flex-1 flex flex-col min-h-[400px] relative"
      >
        {isLoading ? (
          <div className="flex-1 flex flex-col p-4 sm:p-8 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between animate-pulse border-b border-zinc-50 dark:border-zinc-800 pb-4 sm:pb-6 last:border-0"
              >
                <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl sm:rounded-2xl shrink-0" />
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <div className="w-3/4 sm:w-48 h-4 sm:h-5 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
                    <div className="w-1/4 sm:w-24 h-3 sm:h-4 bg-zinc-100 dark:bg-zinc-800 rounded-md sm:hidden" />
                  </div>
                </div>
                <div className="hidden sm:block w-32 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-md mx-6" />
                <div className="hidden md:block w-20 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-md mx-6" />
                <div className="w-16 sm:w-20 h-6 sm:h-7 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : recordings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-50 dark:bg-zinc-800 rounded-[24px] sm:rounded-[32px] flex items-center justify-center mb-6 shadow-sm border border-zinc-100 dark:border-zinc-700">
              <Video className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-300 dark:text-zinc-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">No recordings found</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[280px] sm:max-w-md mx-auto leading-relaxed">
              {searchQuery 
                ? `We couldn't find any recordings matching "${searchQuery}". Try a different search term.`
                : "You haven't uploaded any recordings yet. Start by uploading your first meeting recording."}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => document.getElementById("recording-upload")?.click()}
                className="mt-8 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10"
              >
                Upload Recording
              </button>
            )}
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilter("all meetings");
                }}
                className="mt-8 text-[10px] font-black text-brand-via uppercase tracking-widest hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar rounded-[24px] sm:rounded-[32px]">
            <table className="w-full text-left border-collapse min-w-full">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 sm:px-8 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] first:rounded-tl-[24px] sm:first:rounded-tl-[32px]">
                    Meeting Name
                  </th>
                  <th className="hidden sm:table-cell px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                    Date
                  </th>
                  <th className="hidden md:table-cell px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                    Duration
                  </th>
                  <th className="hidden lg:table-cell px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                    Participants
                  </th>
                  <th className="hidden sm:table-cell px-6 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                    Status
                  </th>
                  <th className="px-4 sm:px-8 py-6 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] text-right last:rounded-tr-[24px] sm:last:rounded-tr-[32px]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {recordings.map((recording) => (
                  <RecordingRow
                    key={recording.id}
                    recording={recording}
                    searchQuery={searchQuery}
                    onRename={onRename}
                    onDelete={onDelete}
                    renderHighlightedText={renderHighlightedText}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
  );
}
