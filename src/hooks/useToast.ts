import { useToastContext } from "@/context/ToastContext";

export type { ToastType } from "@/context/ToastContext";

export function useToast() {
  const { showToast, hideToast } = useToastContext();
  
  // Note: We don't return the 'toast' state anymore as it's managed globally
  // and rendered by the ToastProvider. This fixes the issue where toasts 
  // wouldn't show if the local component didn't render the <Toast />.
  
  return {
    showToast,
    hideToast,
    // Provide a dummy toast state for backward compatibility if needed, 
    // but components should stop rendering <Toast /> manually.
    toast: { show: false, message: "", type: "success" as const }
  };
}
