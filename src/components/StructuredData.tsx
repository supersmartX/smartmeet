export default function StructuredData({ type = "SoftwareApplication", data = {} }: { type?: string, data?: Record<string, unknown> }) {
  const baseJsonLd = type === "SoftwareApplication" ? {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SupersmartX AI",
    "operatingSystem": "Web",
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "AI-Powered Meeting Intelligence for capturing, transcribing, and summarizing meetings into actionable engineering assets.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "120"
    }
  } : {
    "@context": "https://schema.org",
    "@type": type,
    ...data
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(baseJsonLd) }}
    />
  )
}
