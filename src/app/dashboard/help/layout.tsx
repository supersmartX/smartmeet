import { Metadata } from "next"
import HelpPage from "./page"

export const metadata: Metadata = {
  title: "Help Center | Support & Documentation",
  description: "Find answers to frequently asked questions about SupersmartX AI. Learn about transcription, security, API integration, and more.",
  keywords: ["SupersmartX Help", "AI Transcription Support", "API Documentation", "Meeting Intelligence FAQ"],
  openGraph: {
    title: "SupersmartX Help Center",
    description: "Support and documentation for your AI Meeting Intelligence pipeline.",
    url: "https://supersmartx.com/dashboard/help",
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
