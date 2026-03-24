export function Features() {
  const capabilities = [
    {
      id: "01",
      title: "Research & Competitive Analysis",
      description: "AI agents discover trends, analyze competitor content, track top-performing Instagram reels, and extract brand intelligence to inform every creative decision.",
      specs: ["Trend discovery", "Competitor tracking", "Market research"],
    },
    {
      id: "02",
      title: "Content Generation Pipeline",
      description: "10-stage AI pipeline: from research and strategy through storyboarding, video and image generation, to scheduling. Multi-LLM support across GPT, Claude, and Gemini.",
      specs: ["10 AI agents", "Multi-LLM", "End-to-end"],
    },
    {
      id: "03",
      title: "Persona Simulation & Testing",
      description: "Simulate audience reactions before you spend. AI personas evaluate creatives, rank preferences, and predict performance with confidence scoring.",
      specs: ["A/B simulation", "Persona modeling", "Pre-launch scoring"],
    },
    {
      id: "04",
      title: "Campaign Intelligence",
      description: "Cross-platform campaign management across Meta, TikTok, Instagram, and Amazon. Budget optimization, audience targeting, and real-time performance alerts.",
      specs: ["Cross-platform", "Auto-budgeting", "ROAS prediction"],
    },
    {
      id: "05",
      title: "Video & Creative Production",
      description: "AI-generated video ads, image ads, voiceovers, and storyboards. Syncs directly with Shopify product catalogs. Brand-consistent output every time.",
      specs: ["Video generation", "Shopify sync", "Brand consistency"],
    },
    {
      id: "06",
      title: "Analytics & Integrations",
      description: "Unified dashboard with AI-powered insights chat. Shopify, Instagram, and Meta integrations. Attribution modeling, custom reports, and predictive analytics.",
      specs: ["AI insights chat", "Unified data", "Predictive analytics"],
    },
  ]

  return (
    <section id="platform" className="py-8 sm:py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-5 sm:mb-10 max-w-2xl">
          <div className="mb-3 sm:mb-6 font-mono text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">
            Platform
          </div>
          <h2 className="text-2xl font-light italic tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Composable tools. <span className="not-italic">Tailored to your clients.</span>
          </h2>
          <p className="hidden sm:block mt-6 text-xl leading-relaxed text-muted-foreground">
            Every deployment is customized. We build the stack your agency needs to deliver differentiated services.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap) => (
            <div key={cap.id} className="flex flex-col bg-background p-3 sm:p-8">
              <div className="font-mono text-[10px] sm:text-xs text-muted-foreground/40">{cap.id}</div>
              <h3 className="mt-2 sm:mt-4 text-sm sm:text-2xl font-light text-foreground">{cap.title}</h3>
              <p className="hidden sm:block mt-4 flex-1 text-base leading-relaxed text-muted-foreground">{cap.description}</p>
              <div className="hidden sm:flex mt-6 flex-wrap gap-2">
                {cap.specs.map((spec) => (
                  <span
                    key={spec}
                    className="border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
