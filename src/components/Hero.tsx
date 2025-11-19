"use client"
import Button from "@/components/Button"
import { detectBrowser, CHROME_WEB_STORE_URL, EDGE_ADDONS_URL, FIREFOX_AMO_URL, DIRECT_DOWNLOAD_URL } from "@/config/extension"
import { PRODUCT_NAME, HEADLINE, SUBHEADLINE } from "@/config/marketing"
import { useEffect, useMemo, useState } from "react"
import Image from "next/image"

export default function Hero() {
  const [browser, setBrowser] = useState("other")
  useEffect(() => { setBrowser(detectBrowser()) }, [])
  const primary = useMemo(() => {
    if (browser === "chrome") return { label: "Add to Chrome", href: CHROME_WEB_STORE_URL }
    if (browser === "edge") return { label: "Add to Edge", href: EDGE_ADDONS_URL }
    if (browser === "firefox") return { label: "Add to Firefox", href: FIREFOX_AMO_URL }
    return { label: "Download Extension", href: DIRECT_DOWNLOAD_URL }
  }, [browser])

  const [imgError, setImgError] = useState(false)
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="container grid items-center gap-8 sm:gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="inline-flex items-center rounded-full bg-black/5 dark:bg-white/10 px-3 w-fit py-1 text-xs" role="status" aria-label="Product category">
            <span className="sr-only">Product:</span>
            {PRODUCT_NAME}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">{HEADLINE}</h1>
          <p className="text-base sm:text-lg text-black/70 dark:text-white/70">{SUBHEADLINE}</p>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
            <Button
              href={primary.href}
              variant="primary"
              target={primary.href.startsWith("http") ? "_blank" : undefined}
              rel={primary.href.startsWith("http") ? "noopener noreferrer" : undefined}
              ariaLabel={primary.label}
            >
              {primary.label}
            </Button>
            <Button
              href={DIRECT_DOWNLOAD_URL}
              variant="secondary"
              target={DIRECT_DOWNLOAD_URL.startsWith("http") ? "_blank" : undefined}
              rel={DIRECT_DOWNLOAD_URL.startsWith("http") ? "noopener noreferrer" : undefined}
              ariaLabel="Direct download"
            >
              Download
            </Button>
          </div>
          <ul className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-black/60 dark:text-white/60">
            <li className="flex items-center">
              <svg className="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              No credit card
            </li>
            <li className="flex items-center">
              <svg className="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Instant install
            </li>
            <li className="flex items-center">
              <svg className="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Works with your calendar
            </li>
          </ul>
        </div>
        <div className="relative mt-8 sm:mt-0">
          <div className="absolute -inset-8 sm:-inset-10 lg:-inset-14 rounded-[40px] opacity-30 blur-3xl bg-brand-gradient" />
          <div className="relative mx-auto flex h-[280px] w-[280px] sm:h-[340px] sm:w-[340px] lg:h-[380px] lg:w-[380px] items-center justify-center rounded-[40px] bg-white dark:bg-black shadow-glow">
            <div className="absolute inset-0 rounded-[40px] ring-1 ring-black/5 dark:ring-white/10" />
            {imgError ? (
              <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-2xl bg-brand-gradient" />
            ) : (
              <Image
                src="/logo.png"
                width={120}
                height={120}
                alt="SupersmartX logo"
                className="rounded-2xl sm:h-40 sm:w-40"
                onError={() => setImgError(true)}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
