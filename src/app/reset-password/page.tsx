import { Metadata } from "next";
import ResetPasswordClient from "@/components/auth/ResetPasswordClient";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Reset Password | SupersmartX AI",
  description: "Set a new password for your SupersmartX account.",
  alternates: {
    canonical: "/reset-password",
  },
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-via" />
      </div>
    }>
      <ResetPasswordClient />
    </Suspense>
  );
}