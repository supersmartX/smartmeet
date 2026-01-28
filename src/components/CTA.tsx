import Button from "@/components/Button"
import Image from "next/image"

export default function CTA() {
  return (
    <section className="py-24 sm:py-32" id="get-started">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[3rem] p-12 sm:p-20 bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 shadow-2xl">
          {/* Background effects */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-gradient opacity-20 blur-[100px] -z-10" />
          <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-brand-primary/10 blur-[80px] -z-10" />

          <div className="relative flex flex-col items-center text-center gap-8 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-via/10 border border-brand-via/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-brand-via">
              Limited Beta Now Open
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Shape the Future of <span className="text-transparent bg-clip-text bg-brand-gradient">Audio-to-Code</span>
            </h2>

            <p className="text-lg text-zinc-400 font-medium leading-relaxed">
              Join 2,000+ early adopters who are already automating their documentation
              and code generation. Get lifetime beta benefits today.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Button
                href="/login"
                variant="primary"
                className="w-full sm:w-auto h-14 px-10 bg-brand-gradient text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-glow hover:scale-105 transition-all"
              >
                Get Started Now {'\u2014'} It{'s'} Free
              </Button>
              <Button
                href="/#pricing"
                variant="secondary"
                className="w-full sm:w-auto h-14 px-10 bg-white/5 text-white border border-white/10 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
              >
                View Pricing
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden relative">
                    <Image 
                      src={`https://i.pravatar.cc/100?img=${i + 10}`} 
                      alt="User" 
                      fill 
                      sizes="40px"
                      className="rounded-full object-cover" 
                    />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-brand-gradient flex items-center justify-center text-[10px] font-bold text-white">
                  +2k
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-white uppercase tracking-widest">Trusted by Experts</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
