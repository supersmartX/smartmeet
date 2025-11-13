import FeatureCard from "@/components/FeatureCard"
import { FEATURES } from "@/config/marketing"

export default function Features() {
  return (
    <section id="features" className="py-12 sm:py-16 lg:py-20">
      <div className="container">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">Features</h2>
          <p className="text-lg text-black/70 dark:text-white/70 max-w-2xl mx-auto">
            Everything you need to make your meetings more productive
          </p>
        </div>
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} title={f.title} description={f.description} />
          ))}
        </div>
      </div>
    </section>
  )
}
