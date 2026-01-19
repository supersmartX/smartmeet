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
