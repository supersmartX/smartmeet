import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Video, Loader2, MoreHorizontal, Pencil, Trash2, Check, AlertCircle, RefreshCw, Pin, PinOff, Star } from "lucide-react";
import { Meeting } from "@/types/meeting";
import { enqueueMeetingAI } from "@/actions/meeting";
import { useToast } from "@/hooks/useToast";

interface RecordingRowProps {
  recording: Meeting;
  searchQuery: string;
  onRename: (id: string, newTitle: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTogglePinned: (id: string) => Promise<void>;
  onToggleFavorite: (id: string) => Promise<void>;
  renderHighlightedText: (text: string, query: string) => React.ReactNode;
  fetchMeetings?: () => void;
}

export function RecordingRow({
  recording,
  searchQuery,
  onRename,
  onDelete,
  onTogglePinned,
  onToggleFavorite,
  renderHighlightedText,
  fetchMeetings,
}: RecordingRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(recording.title);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isTogglingPinned, setIsTogglingPinned] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formattedDate, setFormattedDate] = useState<string>("");
  
  const { showToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  const status = recording.status?.toUpperCase();

  // Polling for status updates if processing
  useEffect(() => {
    if (status !== "PROCESSING") return;

    const interval = setInterval(() => {
      if (fetchMeetings) fetchMeetings();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [status, fetchMeetings]);

  const getProgressLabel = (step: string) => {
    switch (step) {
      case "TRANSCRIPTION": return "Transcribing Audio...";
      case "SUMMARIZATION": return "Summarizing Meeting...";
      case "CODE_GENERATION": return "Generating Logic...";
      case "TESTING": return "Verifying Code...";
      case "COMPLETED": return "Completed";
      case "FAILED": return "Failed";
      default: return "Processing...";
    }
  };
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

  const handleTogglePinned = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTogglingPinned(true);
    try {
      await onTogglePinned(recording.id);
    } catch (error) {
      console.error("Failed to toggle pinned:", error);
    } finally {
      setIsTogglingPinned(false);
    }
  }, [recording.id, onTogglePinned]);

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTogglingFavorite(true);
    try {
      await onToggleFavorite(recording.id);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [recording.id, onToggleFavorite]);

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

  const handleRetry = useCallback(async () => {
     setIsRetrying(true);
     try {
       const result = await enqueueMeetingAI(recording.id);
       if (result.success) {
         showToast("Recording re-enqueued for processing", "success");
         if (fetchMeetings) fetchMeetings();
       } else {
         showToast(result.error || "Failed to retry processing", "error");
       }
     } catch (error) {
       console.error("Retry error:", error);
       showToast("An unexpected error occurred", "error");
     } finally {
       setIsRetrying(false);
       setIsMenuOpen(false);
     }
   }, [recording.id, showToast, fetchMeetings]);

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

  const matchesSummary = searchQuery && recording.summary?.content?.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesTranscript = searchQuery && recording.transcripts?.some(t => t.text.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col border-b border-zinc-50 dark:border-zinc-800 last:border-0">
      <div className="flex items-center justify-between p-4 sm:p-6 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
        <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
            <Video className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    autoFocus
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
                    className="bg-transparent border-b-2 border-zinc-900 dark:border-white focus:outline-none text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 w-full"
                  />
                  <button
                    disabled={isRenaming}
                    onClick={handleRenameSubmit}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                  >
                    {isRenaming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Link
                    href={`/dashboard/recordings/${recording.id}`}
                    className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
                  >
                    {renderHighlightedText(recording.title, searchQuery)}
                  </Link>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={handleTogglePinned}
                      disabled={isTogglingPinned}
                      className={`p-1 rounded-md transition-colors ${
                        recording.isPinned 
                          ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" 
                          : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                      title={recording.isPinned ? "Unpin recording" : "Pin recording"}
                    >
                      {isTogglingPinned ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : recording.isPinned ? (
                        <PinOff className="w-3.5 h-3.5" />
                      ) : (
                        <Pin className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={handleToggleFavorite}
                      disabled={isTogglingFavorite}
                      className={`p-1 rounded-md transition-colors ${
                        recording.isFavorite 
                          ? "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" 
                          : "text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                      title={recording.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      {isTogglingFavorite ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Star className={`w-3.5 h-3.5 ${recording.isFavorite ? "fill-current" : ""}`} />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] sm:text-xs text-zinc-400 font-medium">
                {formattedDate}
              </span>
              <span className="text-[10px] sm:text-xs text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-[10px] sm:text-xs text-zinc-400 font-medium">
                {recording.duration || "0:00"}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-8 mx-6">
          <div className="w-32 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 dark:text-zinc-600 mb-1">Status</span>
            <div className="flex items-center gap-2">
              {status === "PROCESSING" ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-blue-500 font-black text-[10px] uppercase tracking-wider">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Processing</span>
                  </div>
                  <span className="text-[8px] text-zinc-400 font-bold uppercase mt-0.5">
                    {getProgressLabel(recording.processingStep)}
                  </span>
                </div>
              ) : status === "FAILED" ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-red-500 font-black text-[10px] uppercase tracking-wider">
                    <AlertCircle className="w-3 h-3" />
                    <span>Failed</span>
                  </div>
                  <button 
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="flex items-center gap-1 text-[8px] text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-bold uppercase mt-0.5 transition-colors"
                  >
                    <RefreshCw className={`w-2 h-2 ${isRetrying ? 'animate-spin' : ''}`} />
                    Retry
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-green-500 font-black text-[10px] uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span>Completed</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-20 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 dark:text-zinc-600 mb-1">Type</span>
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">
              Meeting
            </span>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => {
                  setIsEditing(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Rename
              </button>
              <button
                disabled={isDeleting}
                onClick={() => {
                  if (confirm("Are you sure you want to delete this recording?")) {
                    handleDeleteClick();
                  }
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      
      {(matchesSummary || matchesTranscript) && (
        <div className="px-4 pb-4 sm:px-6 sm:pb-6 -mt-2">
          <div className="pl-13 sm:pl-17 bg-zinc-50/50 dark:bg-zinc-800/20 rounded-2xl p-3 sm:p-4 border border-zinc-100 dark:border-zinc-800/50">
            {matchesSummary && (
              <div className="mb-2 last:mb-0">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block mb-1">Matched in Summary</span>
                <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic line-clamp-2">
                  {renderHighlightedText(recording.summary!.content, searchQuery)}
                </p>
              </div>
            )}
            {matchesTranscript && (
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 block mb-1">Matched in Transcript</span>
                <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic line-clamp-2">
                  {renderHighlightedText(
                    recording.transcripts!.find(t => t.text.toLowerCase().includes(searchQuery.toLowerCase()))!.text,
                    searchQuery
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
