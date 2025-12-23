import { useState, useMemo, useEffect } from "react"
import { detectBrowser, CHROME_WEB_STORE_URL, EDGE_ADDONS_URL, FIREFOX_AMO_URL, BrowserKey } from "@/config/extension"

export function useExtensionDetection() {
  const [browser, setBrowser] = useState<BrowserKey>("other")

  useEffect(() => {
    requestAnimationFrame(() => {
      setBrowser(detectBrowser())
    })
  }, [])

  const extensionUrl = useMemo(() => {
    switch (browser) {
      case "chrome": return CHROME_WEB_STORE_URL
      case "edge": return EDGE_ADDONS_URL
      case "firefox": return FIREFOX_AMO_URL
      default: return null
    }
  }, [browser])

  const browserName = useMemo(() => {
    switch (browser) {
      case "chrome": return "Chrome"
      case "edge": return "Edge"
      case "firefox": return "Firefox"
      default: return ""
    }
  }, [browser])

  return { extensionUrl, browserName, browser }
}
