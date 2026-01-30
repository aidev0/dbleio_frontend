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
    <section id="how-it-works" className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          <div>
            <div className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              How it works
            </div>
            <h2 className="text-3xl font-light italic tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Your AI marketing <span className="not-italic">engineering team</span>
            </h2>
            <p className="mt-8 text-lg leading-relaxed text-muted-foreground">
              Instead of buying tools and hiring people to use them, 
              you get automated systems that do the work.
            </p>
          </div>
          <div className="space-y-0">
            {steps.map((step, index) => (
              <div 
                key={step.number} 
                className={`flex gap-6 border-l border-border py-6 pl-8 ${
                  index === 0 ? "border-t" : ""
                } ${index === steps.length - 1 ? "border-b" : ""}`}
              >
                <div className="font-mono text-xs text-muted-foreground/40">{step.number}</div>
                <div>
                  <h3 className="font-medium text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
