export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Embed & Onboard",
      description: "We embed engineers and marketers into your team from day one. Full onboarding of end-users and operators, close collaboration with your team and the brand.",
    },
    {
      number: "02",
      title: "Two-Week Trial",
      description: "The first two weeks serve as a trial period. We work directly with your team and the client, scope the work, and audit existing workflows.",
    },
    {
      number: "03",
      title: "Scope & Build",
      description: "We deliver a full end-to-end solution for the scoped work — customized AI agents, predictive models, and proprietary tools tailored to the brand.",
    },
    {
      number: "04",
      title: "Operate & Optimize",
      description: "We don't hand off a solution and walk away. We stay embedded and take ownership — optimizing workflows, driving results, and building new acquisition pillars.",
    },
    {
      number: "05",
      title: "Scale & Learn",
      description: "Every human decision and live result feeds back into our systems. Your next campaign is always smarter than your last, compounding value over time.",
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
              Embedded from <span className="not-italic">day 1</span>
            </h2>
            <p className="hidden sm:block mt-6 text-xl leading-relaxed text-muted-foreground">
              A customized DTC marketing platform with embedded forward-deployed engineers and marketers working directly with your team — not just software.
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
