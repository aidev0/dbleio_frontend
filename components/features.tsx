export function Features() {
  const capabilities = [
    {
      id: "01",
      title: "Video Generation",
      description: "Automatically transforms your product catalog into video ads. Brand-consistent styling, messaging, and voiceover. Direct Shopify integration.",
      specs: ["Auto-generation", "Brand consistency", "Platform optimization"],
    },
    {
      id: "02",
      title: "Image Generation",
      description: "Creates static ads from product images with dynamic text overlays using your brand fonts and colors. A/B variations generated automatically.",
      specs: ["Dynamic overlays", "Brand fonts", "Auto-variations"],
    },
    {
      id: "03",
      title: "Creative Testing",
      description: "AI predicts which ads will perform before you spend. Ranks all ads by predicted CTR, conversion rate, and ROAS.",
      specs: ["Pre-launch prediction", "CTR ranking", "ROAS forecasting"],
    },
    {
      id: "04",
      title: "Campaign Optimization",
      description: "Monitors all campaigns 24/7 across every platform. Automatically shifts budget from losers to winners. Pauses underperformers.",
      specs: ["24/7 monitoring", "Auto-budgeting", "Real-time response"],
    },
    {
      id: "05",
      title: "Reinforcement Learning",
      description: "Gets smarter over time by learning from your results. Identifies patterns in what works for your specific products and audience.",
      specs: ["Continuous learning", "Pattern detection", "Custom optimization"],
    },
    {
      id: "06",
      title: "Integration Suite",
      description: "Shopify, Meta, TikTok, Google, Amazon, and all major analytics platforms. Everything connected seamlessly in one system.",
      specs: ["All platforms", "Unified data", "Seamless sync"],
    },
  ]

  return (
    <section id="platform" className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 max-w-2xl">
          <div className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Platform
          </div>
          <h2 className="text-3xl font-light italic tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Full platform access. <span className="not-italic">No locked features.</span>
          </h2>
          <p className="mt-8 text-lg leading-relaxed text-muted-foreground">
            The only difference between plans is how many systems run simultaneously.
          </p>
        </div>
        
        <div className="grid gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap) => (
            <div key={cap.id} className="flex flex-col bg-background p-8">
              <div className="font-mono text-xs text-muted-foreground/40">{cap.id}</div>
              <h3 className="mt-4 text-xl font-light text-foreground">{cap.title}</h3>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{cap.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
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
