import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Video, Loader2, MoreHorizontal, Pencil, Trash2, Check, X, AlertCircle } from "lucide-react";
import { Meeting } from "@/types/meeting";

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
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(recording.title);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formattedDate, setFormattedDate] = useState<string>("");
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Avoid hydration mismatch by formatting date only on client
  useEffect(() => {
    const date = recording.date instanceof Date ? recording.date : new Date(recording.date);
    setFormattedDate(date.toLocaleDateString());
  }, [recording.date]);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  // Handle escape key to close menu or cancel editing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        if (isEditing) {
          setIsEditing(false);
          setEditTitle(recording.title);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, recording.title]);

  const status = recording.status?.toUpperCase();

  const handleRenameSubmit = useCallback(async () => {
    if (!editTitle.trim() || editTitle === recording.title) {
      setIsEditing(false);
      return;
    }
    setIsRenaming(true);
    try {
      await onRename(recording.id, editTitle);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to rename recording:", error);
    } finally {
      setIsRenaming(false);
    }
  }, [editTitle, recording.id, recording.title, onRename]);

  const handleDeleteClick = useCallback(async () => {
    if (!window.confirm("Are you sure you want to delete this recording?")) return;
    setIsDeleting(true);
    try {
      await onDelete(recording.id);
    } catch (error) {
      console.error("Failed to delete recording:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [recording.id, onDelete]);

  return (
    <tr className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors group relative border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${isMenuOpen ? "z-50" : "z-0"}`}>
      <td className="px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-3 sm:gap-5">
          <Link 
            href={`/dashboard/recordings/${recording.id}`}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm shrink-0"
          >
            {status === "PROCESSING" ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 animate-spin" />
            ) : status === "FAILED" ? (
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            ) : (
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-brand-via" />
            )}
          </Link>
          <div className="flex flex-col min-w-0 flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameSubmit();
                      if (e.key === "Escape") {
                        setIsEditing(false);
                        setEditTitle(recording.title);
                      }
                    }}
                    autoFocus
                    disabled={isRenaming}
                    className="bg-white dark:bg-zinc-900 border border-brand-via rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold w-full focus:outline-none focus:ring-2 focus:ring-brand-via/20 text-zinc-900 dark:text-zinc-100 pr-16"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button 
                      onClick={handleRenameSubmit}
                      disabled={isRenaming}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-emerald-500 transition-colors"
                    >
                      {isRenaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditing(false);
                        setEditTitle(recording.title);
                      }}
                      disabled={isRenaming}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
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
                {formattedDate}
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
          {formattedDate}
        </span>
      </td>
      <td className="px-6 py-6 hidden md:table-cell">
        <span className="text-sm text-zinc-500 font-bold">{recording.duration || "0:00"}</span>
      </td>
      <td className="px-6 py-6 hidden lg:table-cell">
        <span className="text-sm text-zinc-500 font-bold">{recording.participants || 0}</span>
      </td>
      <td className="px-6 py-6 hidden sm:table-cell">
        <div className="flex items-center justify-end">
          <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            status === "COMPLETED" 
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : status === "FAILED"
              ? "bg-red-500/10 text-red-600 border-red-500/20"
              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          }`}>
            {status}
          </div>
        </div>
      </td>
      <td className="px-4 sm:px-8 py-4 sm:py-6 text-right">
        <div className="flex items-center justify-end">
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              aria-label="More options"
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Rename recording
                  </button>
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                  <button
                    onClick={() => {
                      handleDeleteClick();
                      setIsMenuOpen(false);
                    }}
                    disabled={isDeleting}
                    className="w-full px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete recording
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
