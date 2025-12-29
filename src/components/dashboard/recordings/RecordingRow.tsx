import React from "react";
import Link from "next/link";
import { Video, Loader2, MoreHorizontal } from "lucide-react";

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

interface RecordingRowProps {
  recording: Meeting;
  searchQuery: string;
  onRename: (id: string, newTitle: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  renderHighlightedText: (text: string, query: string) => React.ReactNode;
}

export function RecordingRow({
  recording,
  searchQuery,
  onRename,
  onDelete,
  renderHighlightedText,
}: RecordingRowProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(recording.title);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  
  const status = recording.status?.toUpperCase();

  const handleRenameSubmit = async () => {
    if (!editTitle.trim() || editTitle === recording.title) {
      setIsEditing(false);
      return;
    }
    setIsRenaming(true);
    try {
      await onRename(recording.id, editTitle);
      setIsEditing(false);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!confirm("Are you sure you want to delete this recording?")) return;
    setIsDeleting(true);
    try {
      await onDelete(recording.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors group relative">
      <td className="px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-3 sm:gap-5">
          <Link 
            href={`/dashboard/recordings/${recording.id}`}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shrink-0"
          >
            {status === "PROCESSING" ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 animate-spin" />
            ) : (
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-brand-via" />
            )}
          </Link>
          <div className="flex flex-col min-w-0 flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
                  onBlur={() => !isRenaming && setIsEditing(false)}
                  autoFocus
                  className="bg-white dark:bg-zinc-900 border border-brand-via rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold w-full focus:outline-none focus:ring-2 focus:ring-brand-via/20 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            ) : (
              <Link
                href={`/dashboard/recordings/${recording.id}`}
                className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-brand-via transition-colors text-sm sm:text-base truncate"
              >
                {renderHighlightedText(recording.title, searchQuery)}
              </Link>
            )}
            <div className="flex items-center gap-2 mt-1 sm:hidden">
              <span className="text-[10px] text-zinc-500 font-bold">
                {recording.date instanceof Date
                  ? recording.date.toLocaleDateString()
                  : String(recording.date)}
              </span>
              <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                {status}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-6 hidden sm:table-cell">
        <span className="text-sm text-zinc-500 font-bold">
          {recording.date instanceof Date
            ? recording.date.toLocaleDateString()
            : String(recording.date)}
        </span>
      </td>
      <td className="px-6 py-6 hidden md:table-cell">
        <span className="text-sm text-zinc-500 font-bold">{recording.duration || "0:00"}</span>
      </td>
      <td className="px-4 sm:px-8 py-4 sm:py-6 text-right">
        <div className="flex items-center justify-end gap-2 sm:gap-4">
          <div className={`hidden sm:inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            status === "COMPLETED" 
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          }`}>
            {status}
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {isMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in duration-200">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                  >
                    Rename recording
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteClick();
                      setIsMenuOpen(false);
                    }}
                    disabled={isDeleting}
                    className="w-full px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Delete recording"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
