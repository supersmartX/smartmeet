"use client"

import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { highlightText } from "@/utils/text"
import { getMeetings, createMeeting, deleteMeeting, updateMeetingTitle, createSignedUploadUrl, enqueueMeetingAI } from "@/actions/meeting"
import { Meeting } from "@/types/meeting"
import { useToast } from "@/hooks/useToast"
import { Toast } from "@/components/Toast"
import { RecordingHeader } from "@/components/dashboard/recordings/RecordingHeader"
import { RecordingTabs } from "@/components/dashboard/recordings/RecordingTabs"
import { RecordingTable } from "@/components/dashboard/recordings/RecordingTable"
import { UploadModal } from "@/components/dashboard/recordings/UploadModal"

export default function RecordingsClient() {
  useSession()
  const searchParams = useSearchParams()
  const [recordings, setRecordings] = useState<Meeting[]>([])
  const [filter, setFilter] = useState("all meetings")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { toast, showToast: toastVisible, hideToast } = useToast()
  const [uploadStatus, setUploadStatus] = useState("")

  const fetchMeetings = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      setError(null)
      const result = await getMeetings()
      if (result.success && result.data) {
        setRecordings(result.data)
      } else if (!silent) {
        setError(result.error || "Failed to load recordings")
        toastVisible(result.error || "Failed to load recordings", "error")
      }
    } catch (err) {
      console.error("Fetch meetings error:", err)
      if (!silent) {
        setError("Failed to load recordings. Please try again.")
        toastVisible("Failed to load recordings. Please try again.", "error")
      }
    } finally {
      if (!silent) setIsLoading(false)
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
      console.error("Rename error:", error)
      toastVisible("An unexpected error occurred.", "error")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteMeeting(id)
      if (result.success) {
        await fetchMeetings()
        toastVisible("Recording deleted successfully", "success")
      } else {
        toastVisible(result.error || "Failed to delete recording.", "error")
      }
    } catch (error) {
      console.error("Delete error:", error)
      toastVisible("An unexpected error occurred.", "error")
    }
  }

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  // Poll for updates if any meeting is in PROCESSING status
  useEffect(() => {
    const hasProcessing = recordings.some(r => r.status === "PROCESSING")
    if (!hasProcessing) return

    const interval = setInterval(() => {
      fetchMeetings(true)
    }, 5000)

    return () => clearInterval(interval)
  }, [recordings, fetchMeetings])

  useEffect(() => {
    if (searchParams.get("action") === "upload") {
      setIsModalOpen(true)
    }
  }, [searchParams])

  const getFileDuration = (file: File): Promise<string> => {
    return new Promise((resolve) => {
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
      setIsUploading(true)
      setUploadStatus("Getting upload permission...")

      // 0. Detect duration
      const duration = await getFileDuration(file);
      setUploadStatus("Uploading recording...")

      // 1. Get signed URL
      const { success, data, error: uploadUrlError } = await createSignedUploadUrl(file.name)
      if (!success || !data) {
        throw new Error(uploadUrlError || "Failed to get upload URL")
      }

      const { signedUrl: uploadUrl, path: key } = data
      setUploadStatus("Uploading recording...")

      // 2. Upload to storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage")
      }

      setUploadStatus("Finalizing recording...")

      // 3. Create database entry
      const createResult = await createMeeting({
        title: file.name.replace(/\.[^/.]+$/, ""),
        audioUrl: key,
        duration: duration
      })

      if (!createResult.success || !createResult.data) {
        throw new Error(createResult.error || "Failed to create recording record")
      }

      toastVisible("Recording uploaded and processing started!", "success")
      setIsModalOpen(false)
      
      // Re-fetch immediately to show the new "PROCESSING" row
      await fetchMeetings(true)

      const meetingId = createResult.data.id
      const autoProcess = (createResult.data as any).autoProcess !== false;
      
      // 4. Trigger AI processing (enqueued for background worker) if autoProcess is enabled
      if (autoProcess) {
        setTimeout(() => {
          enqueueMeetingAI(meetingId).catch(err => {
            console.error("Background AI processing error:", err)
          })
        }, 500)
      } else {
        toastVisible("Recording uploaded! You can start processing manually from the list.", "success")
      }

    } catch (err) {
      console.error("Upload error:", err)
      toastVisible(err instanceof Error ? err.message : "Failed to upload recording", "error")
    } finally {
      setIsUploading(false)
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
        setSearchQuery={setSearchQuery}
        onUploadClick={() => setIsModalOpen(true)}
        isUploading={isUploading}
      />

      <UploadModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleUploadFile}
        isUploading={isUploading}
        uploadStatus={uploadStatus}
      />

      <RecordingTabs filter={filter} setFilter={setFilter} />

      <RecordingTable
        recordings={filteredRecordings}
        isLoading={isLoading}
        error={error}
        searchQuery={searchQuery}
        onRename={handleRename}
        onDelete={handleDelete}
        setSearchQuery={setSearchQuery}
        setFilter={setFilter}
        fetchMeetings={fetchMeetings}
        renderHighlightedText={renderHighlightedText}
      />
    </div>
  )
}