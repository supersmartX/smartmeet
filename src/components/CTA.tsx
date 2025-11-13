import Button from "@/components/Button"

export default function CTA() {
  return (
    <section className="py-12 sm:py-16 lg:py-20" id="download">
      <div className="container">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-brand-gradient opacity-30" />
          <div className="relative flex flex-col items-center gap-4 sm:gap-6">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-center">Meet smarter with Supersmarx</h2>
            <Button href="#download" variant="primary" className="min-w-[160px]">Add Extension</Button>
          </div>
        </div>
      </div>
    </section>
  )
}
