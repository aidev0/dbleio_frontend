export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Define scope",
      description: "Video production, creative testing, campaign optimization. You define what to automate.",
    },
    {
      number: "02",
      title: "System build",
      description: "We architect and build custom AI systems for your products, brand, and existing tools.",
    },
    {
      number: "03",
      title: "Deploy",
      description: "Seamless integration with your marketing stack. Production-ready in under 48 hours.",
    },
    {
      number: "04",
      title: "Operate",
      description: "Systems run 24/7-generating, testing, optimizing. Zero manual intervention required.",
    },
    {
      number: "05",
      title: "Evolve",
      description: "Continuous learning from performance data. Systems get smarter every day.",
    },
  ]

  return (
    <section id="how-it-works" className="py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              How it works
            </div>
            <h2 className="text-4xl font-light italic tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your AI marketing <span className="not-italic">engineering team</span>
            </h2>
            <p className="mt-6 text-xl leading-relaxed text-muted-foreground">
              Instead of buying tools and hiring people to use them, 
              you get automated systems that do the work.
            </p>
          </div>
          <div className="border border-border">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex gap-6 py-6 pl-8 pr-8"
              >
                <div className="font-mono text-xs text-muted-foreground/40">{step.number}</div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">{step.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
