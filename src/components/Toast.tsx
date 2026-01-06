import React, { useEffect, useState } from "react";
import { Check, AlertCircle, X } from "lucide-react";

interface ToastProps {
  show: boolean;
  message: string;
  type: "success" | "error";
  onClose?: () => void;
}

export function Toast({ show, message, type, onClose }: ToastProps) {
  const [isRendered, setIsRendered] = useState(show);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsRendered(true);
      // Small delay to trigger entry animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      // Wait for exit animation to finish before unmounting
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!isRendered) return null;

  return (
    <div 
      className={`
        fixed bottom-8 right-8 z-[100] transition-all duration-300 ease-out transform
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
      role="alert" 
      aria-live={type === "error" ? "assertive" : "polite"}
    >
      <div className={`${
        type === "success" 
          ? "bg-zinc-900 border-emerald-500/20 shadow-emerald-500/5" 
          : "bg-red-950 border-red-500/20 shadow-red-500/5"
      } backdrop-blur-xl border px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[340px] max-w-md group`}>
        
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          type === "success" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
        }`}>
          {type === "success" ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-black uppercase tracking-widest mb-0.5 ${
            type === "success" ? "text-emerald-500" : "text-red-400"
          }`}>
            {type === "success" ? "Success" : "Error Occurred"}
          </p>
          <p className="text-sm font-medium text-zinc-200 leading-tight">
            {message}
          </p>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-zinc-500 hover:text-white"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
