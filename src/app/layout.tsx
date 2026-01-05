import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SupersmartX AI | Meeting Intelligence for Engineers",
    template: "%s | SupersmartX AI"
  },
  description: "Transform your meetings into structured intelligence. Automated transcription, AI summaries, and production-ready code generation from your discussions.",
  keywords: ["AI Meeting Assistant", "Meeting Transcription", "Engineering Intelligence", "Automated Summaries", "Meeting to Code"],
  authors: [{ name: "SupersmartX Team" }],
  creator: "SupersmartX",
  publisher: "SupersmartX",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://supersmartx.com"),
   alternates: {
     canonical: "/",
   },
   openGraph: {
     title: "SupersmartX AI | Meeting Intelligence",
     description: "AI-Powered Meeting Intelligence for capturing, transcribing, and summarizing your meetings into actionable engineering assets.",
     url: "https://supersmartx.com",
    siteName: "SupersmartX AI",
    images: [
      {
        url: "/logoX.png", // Using your existing logo as a fallback OG image
        width: 1200,
        height: 630,
        alt: "SupersmartX AI Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SupersmartX AI | Meeting Intelligence",
    description: "Transform meetings into code and documentation with AI.",
    images: ["/logoX.png"],
    creator: "@supersmartx",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/logoX.png", type: "image/png", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/logoX.png",
        color: "#000000",
      },
    ],
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <main id="main-content">
              {children}
            </main>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
