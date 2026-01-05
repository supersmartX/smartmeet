import Navbar from "@/components/Navbar"
import Hero from "@/components/Hero"
import Features from "@/components/Features"
import HowItWorks from "@/components/HowItWorks"
import Pricing from "@/components/Pricing"
import CTA from "@/components/CTA"
import Footer from "@/components/Footer"
import StructuredData from "@/components/StructuredData"
import { Metadata } from "next"
import { headers } from "next/headers"

export const metadata: Metadata = {
  title: "SupersmartX AI | Intelligent Meeting Analysis & Automation",
  description: "Transform your meetings into actionable intelligence. Automatic transcription, summarization, and task automation for high-performance teams.",
  alternates: {
    canonical: "/",
  },
}

export default async function Home() {
  const nonce = (await headers()).get("x-nonce") || "";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <StructuredData nonce={nonce} />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
