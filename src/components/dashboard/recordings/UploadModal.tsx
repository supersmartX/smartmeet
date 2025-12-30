"use client"

import React, { useState, useRef } from "react"
import { X, Upload, FileAudio, CheckCircle2, Loader2, AlertCircle } from "lucide-react"

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (file: File) => Promise<void>
  isUploading: boolean
  uploadStatus: string
}

export function UploadModal({
  isOpen,
  onClose,
  onUpload,
  isUploading,
  uploadStatus
}: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        setSelectedFile(file)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleStartUpload = async () => {
    if (selectedFile) {
      await onUpload(selectedFile)
      setSelectedFile(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[32px] shadow-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              Upload Recording
            </h2>
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mt-0.5">
              Audio or Video files supported
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {!isUploading ? (
            <div className="space-y-6">
              {!selectedFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-[24px] p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all
                    ${dragActive 
                      ? "border-brand-via bg-brand-via/5 scale-[0.98]" 
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50"}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="audio/*,video/*"
                    onChange={handleFileChange}
                  />
                  <div className="w-16 h-16 rounded-3xl bg-white dark:bg-zinc-800 shadow-xl shadow-black/5 flex items-center justify-center text-zinc-400 group-hover:text-brand-via transition-colors">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      MP3, WAV, MP4, M4A (Max 100MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-[24px] p-6 border border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-via/10 flex items-center justify-center text-brand-via">
                    <FileAudio className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-widest">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                disabled={!selectedFile}
                onClick={handleStartUpload}
                className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.01] transition-all shadow-xl shadow-black/10 disabled:opacity-50 disabled:scale-100"
              >
                Start Upload & AI Processing
              </button>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-zinc-100 dark:border-zinc-800 border-t-brand-via animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-brand-via">
                  <Upload className="w-8 h-8" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {uploadStatus}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                  Please keep this window open until complete
                </p>
              </div>
              
              {/* Progress Simulation (since we use PUT fetch) */}
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden max-w-[280px]">
                <div className="h-full bg-brand-via animate-progress" style={{ width: '60%' }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
          <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            Privacy Protected • End-to-End Encryption
          </p>
        </div>
      </div>
    </div>
  )
}
