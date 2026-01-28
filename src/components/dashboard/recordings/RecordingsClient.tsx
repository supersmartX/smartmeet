"use client"

import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { useEffect, useCallback, useReducer } from "react"
import { highlightText } from "@/utils/text"
import { 
  getMeetings, 
  createMeeting, 
  deleteMeeting, 
  updateMeetingTitle, 
  createSignedUploadUrl, 
  togglePinned,
  toggleFavorite
} from "@/actions/meeting"
import { Meeting } from "@/types/meeting"
import logger from "@/lib/logger"
import { useToast } from "@/hooks/useToast"
import { RecordingHeader } from "@/components/dashboard/recordings/RecordingHeader"
import { RecordingTabs } from "@/components/dashboard/recordings/RecordingTabs"
import { RecordingTable } from "@/components/dashboard/recordings/RecordingTable"
import dynamic from "next/dynamic"

const UploadModal = dynamic(() => import("@/components/dashboard/recordings/UploadModal").then(mod => mod.UploadModal), {
  loading: () => null
})

const Toast = dynamic(() => import("@/components/Toast").then(mod => mod.Toast), {
  ssr: false
})
import { supabase } from "@/lib/supabase"

type RecordingsState = {
  recordings: Meeting[]
  filter: string
  searchQuery: string
  isLoading: boolean
  error: string | null
  isUploading: boolean
  isModalOpen: boolean
  uploadStatus: string
  uploadProgress: number
}

type RecordingsAction =
  | { type: 'SET_RECORDINGS'; payload: Meeting[] }
  | { type: 'SET_FILTER'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_UPLOAD_STATUS'; payload: string }
  | { type: 'SET_UPLOAD_PROGRESS'; payload: number }
  | { type: 'OPTIMISTIC_DELETE'; payload: string }
  | { type: 'ROLLBACK_DELETE'; payload: Meeting[] }

const initialState: RecordingsState = {
  recordings: [],
  filter: "all meetings",
  searchQuery: "",
  isLoading: true,
  error: null,
  isUploading: false,
  isModalOpen: false,
  uploadStatus: "",
  uploadProgress: 0
}

function recordingsReducer(state: RecordingsState, action: RecordingsAction): RecordingsState {
  switch (action.type) {
    case 'SET_RECORDINGS': return { ...state, recordings: action.payload }
    case 'SET_FILTER': return { ...state, filter: action.payload }
    case 'SET_SEARCH_QUERY': return { ...state, searchQuery: action.payload }
    case 'SET_LOADING': return { ...state, isLoading: action.payload }
    case 'SET_ERROR': return { ...state, error: action.payload }
    case 'SET_UPLOADING': return { ...state, isUploading: action.payload }
    case 'SET_MODAL_OPEN': return { ...state, isModalOpen: action.payload }
    case 'SET_UPLOAD_STATUS': return { ...state, uploadStatus: action.payload }
    case 'SET_UPLOAD_PROGRESS': return { ...state, uploadProgress: action.payload }
    case 'OPTIMISTIC_DELETE': return { ...state, recordings: state.recordings.filter(r => r.id !== action.payload) }
    case 'ROLLBACK_DELETE': return { ...state, recordings: action.payload }
    default: return state
  }
}

export default function RecordingsClient() {
  useSession()
  const searchParams = useSearchParams()
  const [state, dispatch] = useReducer(recordingsReducer, initialState)
  const { recordings, filter, searchQuery, isLoading, error, isUploading, isModalOpen, uploadStatus, uploadProgress } = state
  const { toast, showToast: toastVisible, hideToast } = useToast()

  const fetchMeetings = useCallback(async (silent = false) => {
    try {
      if (!silent) dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })
      const result = await getMeetings()
      if (result.success && result.data) {
        dispatch({ type: 'SET_RECORDINGS', payload: result.data })
      } else if (!silent) {
        dispatch({ type: 'SET_ERROR', payload: result.error || "Failed to load recordings" })
        toastVisible(result.error || "Failed to load recordings", "error")
      }
    } catch (err) {
      logger.error({ err }, "Fetch meetings error")
      if (!silent) {
        dispatch({ type: 'SET_ERROR', payload: "Failed to load recordings. Please try again." })
        toastVisible("Failed to load recordings. Please try again.", "error")
      }
    } finally {
      if (!silent) dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [toastVisible])

  const handleRename = async (id: string, newTitle: string) => {
    try {
      const result = await updateMeetingTitle(id, newTitle)
      if (result.success) {
        await fetchMeetings()
        toastVisible("Recording renamed successfully", "success")
      } else {
        toastVisible(result.error || "Failed to rename recording.", "error")
      }
    } catch (error) {
      logger.error({ error }, "Rename error")
      toastVisible("An unexpected error occurred.", "error")
    }
  }

  const handleDelete = async (id: string) => {
    const previousRecordings = [...recordings];
    dispatch({ type: 'OPTIMISTIC_DELETE', payload: id })

    try {
      const result = await deleteMeeting(id)
      if (result.success) {
        toastVisible("Recording deleted successfully", "success")
        await fetchMeetings(true)
      } else {
        dispatch({ type: 'ROLLBACK_DELETE', payload: previousRecordings })
        toastVisible(result.error || "Failed to delete recording.", "error")
      }
    } catch (error) {
      logger.error({ error }, "Delete error")
      dispatch({ type: 'ROLLBACK_DELETE', payload: previousRecordings })
      toastVisible("An unexpected error occurred.", "error")
    }
  }

  const handleTogglePinned = async (id: string) => {
    try {
      const result = await togglePinned(id)
      if (result.success) {
        await fetchMeetings(true)
      } else {
        toastVisible(result.error || "Failed to pin recording.", "error")
      }
    } catch (error) {
      logger.error({ error }, "Toggle pinned error")
      toastVisible("An unexpected error occurred.", "error")
    }
  }

  const handleToggleFavorite = async (id: string) => {
    try {
      const result = await toggleFavorite(id)
      if (result.success) {
        await fetchMeetings(true)
      } else {
        toastVisible(result.error || "Failed to favorite recording.", "error")
      }
    } catch (error) {
      logger.error({ error }, "Toggle favorite error")
      toastVisible("An unexpected error occurred.", "error")
    }
  }

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  // Subscribe to real-time updates for meeting status changes
  useEffect(() => {
    const channel = supabase
      .channel('meeting_status_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Meeting'
        },
        (payload) => {
          logger.info({ payload }, "Real-time meeting update received")
          fetchMeetings(true)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Meeting'
        },
        () => {
          fetchMeetings(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchMeetings])

  useEffect(() => {
    if (searchParams.get("action") === "upload") {
      dispatch({ type: 'SET_MODAL_OPEN', payload: true })
    }
  }, [searchParams])

  const getFileDuration = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      // Skip duration for document files
      if (file.type.includes('pdf') || 
          file.type.includes('word') || 
          file.type.includes('officedocument') ||
          file.type.includes('text/plain')) {
        resolve("0:00");
        return;
      }

      const element = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
      element.src = URL.createObjectURL(file);
      element.onloadedmetadata = () => {
        const seconds = Math.floor(element.duration);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        resolve(`${mins}:${secs.toString().padStart(2, '0')}`);
        URL.revokeObjectURL(element.src);
      };
      element.onerror = () => {
        resolve("0:00");
        URL.revokeObjectURL(element.src);
      };
    });
  }

  const handleUploadFile = async (file: File) => {
    try {
      dispatch({ type: 'SET_UPLOADING', payload: true })
      dispatch({ type: 'SET_UPLOAD_STATUS', payload: "Getting upload permission..." })

      const duration = await getFileDuration(file);
      dispatch({ type: 'SET_UPLOAD_STATUS', payload: "Uploading recording..." })

      const { success, data, error: uploadUrlError } = await createSignedUploadUrl(file.name)
      if (!success || !data) {
        throw new Error(uploadUrlError || "Failed to get upload URL")
      }

      const { signedUrl: uploadUrl, path: key } = data
      dispatch({ type: 'SET_UPLOAD_STATUS', payload: "Uploading recording..." })
      dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: 0 })

      // Use XMLHttpRequest for real progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        // Ensure we always have a content type, fallback to octet-stream
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.setRequestHeader("x-upsert", "true");

        // Log upload details for debugging
        console.log(`Starting upload for ${file.name} (${file.type}) to ${uploadUrl.split('?')[0]}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: percentComplete });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            // Try to parse error details from Supabase response
            let errorMessage = `Upload failed with status ${xhr.status}`;
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.error || response.message) {
                errorMessage = response.error || response.message;
              }
            } catch {
              // Not a JSON response
            }
            reject(new Error(errorMessage));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      dispatch({ type: 'SET_UPLOAD_STATUS', payload: "Finalizing recording..." })
      dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: 100 })

      const createResult = await createMeeting({
        title: file.name.replace(/\.[^/.]+$/, ""),
        audioUrl: key,
        duration: duration
      })

      if (!createResult.success || !createResult.data) {
        throw new Error(createResult.error || "Failed to create recording record")
      }

      toastVisible("Recording uploaded and processing started!", "success")
      dispatch({ type: 'SET_MODAL_OPEN', payload: false })
      await fetchMeetings(true)

    } catch (err) {
      console.error("Upload error:", err)
      toastVisible(err instanceof Error ? err.message : "Failed to upload recording", "error")
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false })
    }
  }

  const filteredRecordings = recordings.filter(rec => {
    const query = searchQuery.toLowerCase()
    const matchesTitle = rec.title.toLowerCase().includes(query)
    const matchesSummary = rec.summary?.content?.toLowerCase().includes(query)
    const matchesTranscript = rec.transcripts?.some(t => t.text.toLowerCase().includes(query))
    
    const matchesSearch = matchesTitle || matchesSummary || matchesTranscript

    if (filter === "all meetings") return matchesSearch
    if (filter === "recent") {
      // Logic for recent: meetings from the last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recordingDate = new Date(rec.date)
      return matchesSearch && recordingDate >= sevenDaysAgo
    }
    if (filter === "action items") return matchesSearch && (rec._count?.actionItems ?? 0) > 0
    return matchesSearch
  })

  const renderHighlightedText = (text: string, query: string): React.ReactNode => {
    const parts = highlightText(text, query)
    return parts.map((part, i) => 
      typeof part === 'string' ? part : (
        <mark key={i} className="bg-brand-via/20 text-brand-via rounded px-0.5">
          {part.match}
        </mark>
      )
    )
  }

  return (
    <div className="p-4 sm:p-8 pb-32 max-w-7xl mx-auto w-full flex flex-col gap-6 sm:gap-8 bg-zinc-50 dark:bg-black">
      <Toast {...toast} onClose={hideToast} />
      <RecordingHeader
        searchQuery={searchQuery}
        setSearchQuery={(q) => dispatch({ type: 'SET_SEARCH_QUERY', payload: q })}
        onUploadClick={() => dispatch({ type: 'SET_MODAL_OPEN', payload: true })}
        isUploading={isUploading}
      />

      <UploadModal 
        isOpen={isModalOpen}
        onClose={() => dispatch({ type: 'SET_MODAL_OPEN', payload: false })}
        onUpload={handleUploadFile}
        isUploading={isUploading}
        uploadStatus={uploadStatus}
        progress={uploadProgress}
      />

      <RecordingTabs filter={filter} setFilter={(f) => dispatch({ type: 'SET_FILTER', payload: f })} />

      <RecordingTable
        recordings={filteredRecordings}
        isLoading={isLoading}
        error={error}
        searchQuery={searchQuery}
        onRename={handleRename}
        onDelete={handleDelete}
        onTogglePinned={handleTogglePinned}
        onToggleFavorite={handleToggleFavorite}
        setFilter={(f) => dispatch({ type: 'SET_FILTER', payload: f })}
        fetchMeetings={fetchMeetings}
        renderHighlightedText={renderHighlightedText}
      />
    </div>
  )
}