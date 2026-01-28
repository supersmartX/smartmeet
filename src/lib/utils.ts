import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "anonymous";
  const [local, domain] = email.split("@");
  if (!domain) return local.substring(0, 3) + "***";
  return local.substring(0, 3) + "***@" + domain;
}

/**
 * Normalizes provider casing for different AI services
 */
export function normalizeProvider(provider: string, casing: 'upper' | 'lower'): string {
  const p = provider.toLowerCase();
  if (casing === 'upper') {
    // Some endpoints expect exact uppercase names
    const upperMap: Record<string, string> = {
      'openai': 'OPENAI',
      'claude': 'CLAUDE',
      'gemini': 'GEMINI',
      'groq': 'GROQ',
      'custom': 'CUSTOM'
    };
    return upperMap[p] || p.toUpperCase();
  }
  return p;
}
