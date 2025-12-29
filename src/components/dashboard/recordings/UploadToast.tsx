import React from "react";
import { Loader2, Sparkles } from "lucide-react";

interface UploadToastProps {
  showToast: boolean;
  isUploading: boolean;
  uploadStatus: string;
}

export function UploadToast({ showToast, isUploading, uploadStatus }: UploadToastProps) {
  if (!showToast) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-zinc-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
        {isUploading ? (
          <Loader2 className="w-4 h-4 text-brand-via animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 text-brand-via" />
        )}
        <span className="text-[10px] font-black uppercase tracking-widest">
          {uploadStatus}
        </span>
      </div>
    </div>
  );
}
