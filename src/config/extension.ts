export const CHROME_WEB_STORE_URL = process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL ?? "#"
export const EDGE_ADDONS_URL = process.env.NEXT_PUBLIC_EDGE_ADDONS_URL ?? "#"
export const FIREFOX_AMO_URL = process.env.NEXT_PUBLIC_FIREFOX_AMO_URL ?? "#"
export const DIRECT_DOWNLOAD_URL = process.env.NEXT_PUBLIC_DIRECT_DOWNLOAD_URL ?? "#"

export type BrowserKey = "chrome" | "edge" | "firefox" | "safari" | "other"

export const detectBrowser = (): BrowserKey => {
  if (typeof navigator === "undefined") return "other"
  const ua = navigator.userAgent.toLowerCase()
  const isChrome = /chrome\//.test(ua) && !/edg\//.test(ua) && !/firefox\//.test(ua)
  const isEdge = /edg\//.test(ua)
  const isFirefox = /firefox\//.test(ua)
  const isSafari = /safari\//.test(ua) && !isChrome && !isEdge
  if (isChrome) return "chrome"
  if (isEdge) return "edge"
  if (isFirefox) return "firefox"
  if (isSafari) return "safari"
  return "other"
}
