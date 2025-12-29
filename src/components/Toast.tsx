import React from "react";
import { Check, AlertCircle } from "lucide-react";

interface ToastProps {
  show: boolean;
  message: string;
  type: "success" | "error";
  onClose?: () => void;
}

export function Toast({ show, message, type }: ToastProps) {
  if (!show) return null;

  return (
    <div 
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300" 
      role="status" 
      aria-live="polite"
    >
      <div className={`${
        type === "success" ? "bg-zinc-900 border-white/10" : "bg-red-950 border-red-500/20"
      } backdrop-blur-xl border px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[320px]`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          type === "success" ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
        }`}>
          {type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black text-white uppercase tracking-widest">{type === "success" ? "Success" : "Error"}</p>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight">{message}</p>
        </div>
      </div>
    </div>
  );
}
