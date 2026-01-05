import { Metadata } from "next";
import LoginClient from "@/components/auth/LoginClient";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Login | SupersmartX AI",
  description: "Sign in to your SupersmartX account to access your meeting intelligence pipeline.",
  alternates: {
    canonical: "/login",
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginClient />
    </Suspense>
  );
}