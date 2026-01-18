import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <h2 className="text-3xl font-light italic tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Ready to deploy <span className="not-italic">AI marketing at scale?</span>
            </h2>
            <p className="mt-8 text-lg leading-relaxed text-muted-foreground">
              Stop managing ads manually. Let dble operate your marketing while 
              your team focuses on strategy.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
            <Button size="lg" className="h-14 px-10 font-mono text-xs uppercase tracking-wider">
              Request Access
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-14 border-border bg-transparent px-10 font-mono text-xs uppercase tracking-wider text-foreground hover:bg-secondary">
              Schedule Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
