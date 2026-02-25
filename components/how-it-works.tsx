export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Define scope",
      description: "Set brand goals, ingest assets, map content calendar.",
    },
    {
      number: "02",
      title: "Research & Create",
      description: "AI agents surface trends and generate concepts, scripts, and production-ready video.",
    },
    {
      number: "03",
      title: "Predict & Simulate",
      description: "Custom ML ranks assets against KPIs. Simulation engine tests against AI personas.",
    },
    {
      number: "04",
      title: "Human Review",
      description: "Your dedicated Forward Deployed Marketers (FDMs) review outputs, edit, and enforce strict brand standards before anything goes live.",
    },
    {
      number: "05",
      title: "Distribute & Learn",
      description: "Content deploys automatically. Every human decision and live result powers our reinforcement learning, ensuring your next campaign is always smarter than your last.",
    },
  ]

  return (
    <section id="platform" className="py-8 sm:py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 sm:gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="mb-3 sm:mb-6 font-mono text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">
              Platform
            </div>
            <h2 className="text-2xl font-light italic tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your dedicated <span className="not-italic">AI + creative intelligence team</span>
            </h2>
            <p className="hidden sm:block mt-6 text-xl leading-relaxed text-muted-foreground">
              Embedded Forward Deployed experts and automated systems — not just software.
            </p>
          </div>
          <div className="border border-border">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex items-baseline gap-3 sm:gap-6 py-3 sm:py-4 pl-4 pr-4 sm:pl-8 sm:pr-8"
              >
                <div className="font-mono text-[10px] sm:text-xs text-muted-foreground/40">{step.number}</div>
                <div>
                  <h3 className="text-sm sm:text-lg font-medium text-foreground">{step.title}</h3>
                  <p className="hidden sm:block mt-2 text-base leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
