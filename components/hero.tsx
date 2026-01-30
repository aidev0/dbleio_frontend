import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface HeroProps {
  onContactUs?: () => void
}

export function Hero({ onContactUs }: HeroProps) {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px"
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 pt-20">
        <div className="max-w-4xl">
          <div className="mb-8 inline-flex items-center gap-3 font-mono text-xs tracking-widest text-muted-foreground">
            <span className="h-px w-12 bg-foreground/30" />
            <span>MARKETING INTELLIGENCE PLATFORM</span>
          </div>

          <h1 className="text-balance text-5xl font-light italic tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            The Palantir
            <span className="block not-italic font-normal">for DTC <span className="whitespace-nowrap">e-commerce</span> marketing</span>
          </h1>

          <p className="mt-10 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Custom AI systems, automation, and optimization across every ad platform.
            We build it, deploy it, and run it—you focus on scaling your brand.
          </p>

          <div className="mt-14 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button size="lg" className="h-14 px-10 font-mono text-sm uppercase tracking-wider" onClick={onContactUs}>
              Contact Us
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-10 font-mono text-sm uppercase tracking-wider border-foreground text-foreground hover:bg-foreground hover:text-background" asChild>
              <a href="#pricing">View Plans</a>
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-24 grid grid-cols-2 gap-px border border-border bg-border md:mt-32 md:grid-cols-5">
          {[
            { value: "Meta", label: "Facebook & Instagram" },
            { value: "TikTok", label: "Ads & Shop" },
            { value: "Google", label: "Search & Shopping" },
            { value: "Amazon", label: "Sponsored Ads" },
            { value: "Vibe", label: "Streaming TV" },
          ].map((stat) => (
            <div key={stat.label} className="bg-background p-6 md:p-8">
              <div className="font-mono text-2xl tracking-tight text-foreground md:text-3xl">{stat.value}</div>
              <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
