import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

interface UploadToastProps {
  showToast: boolean;
  isUploading: boolean;
  uploadStatus: string;
}

export function UploadToast({ showToast, isUploading, uploadStatus }: UploadToastProps) {
  const [isRendered, setIsRendered] = useState(showToast);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (showToast) {
      setIsRendered(true);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  if (!isRendered) return null;

  return (
    <div className={`
      fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-out transform
      ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
    `}>
      <div className={`
        flex items-center gap-4 px-6 py-4 rounded-[20px] shadow-2xl backdrop-blur-md border min-w-[320px]
        ${isUploading 
          ? "bg-zinc-900/90 dark:bg-zinc-900/90 border-white/10 text-white" 
          : "bg-emerald-50/90 dark:bg-emerald-950/90 border-emerald-200/50 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-100"}
      `}>
        <div className="relative flex items-center justify-center">
          {isUploading ? (
            <div className="relative">
              <div className="absolute inset-0 bg-brand-via/20 rounded-full animate-ping" />
              <Loader2 className="w-5 h-5 text-brand-via animate-spin relative z-10" />
            </div>
          ) : (
            <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          )}
        </div>
        
        <div className="flex flex-col flex-1">
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-0.5 ${isUploading ? "text-zinc-500" : "text-emerald-500/70"}`}>
            {isUploading ? "AI Pipeline Active" : "Process Complete"}
          </p>
          <p className="text-xs font-bold tracking-tight">
            {uploadStatus}
          </p>
        </div>

        {isUploading && (
          <div className="flex gap-1.5 px-2">
            <span className="w-1 h-1 bg-brand-via rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-1 bg-brand-via rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-1 bg-brand-via rounded-full animate-bounce" />
          </div>
        )}
      </div>
    </div>
  );
}
