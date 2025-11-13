type Props = { title: string; description: string }

export default function FeatureCard({ title, description }: Props) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5 p-6">
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-sm text-black/70 dark:text-white/70">{description}</p>
    </div>
  )
}
