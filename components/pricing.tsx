import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

const tiers = [
  {
    name: "Platform",
    price: "$3,000",
    period: "/month",
    commitment: "Monthly",
    highlight: false,
    includes: [
      "Full platform access",
      "All integrations (Meta, TikTok, Google, Amazon)",
      "Video & image generation tools",
      "Creative testing & scoring",
      "Campaign analytics dashboard",
      "SOC 2, GDPR, CCPA compliant",
    ],
    excludes: [
      "No custom builds included",
      "Self-service only",
    ],
  },
  {
    name: "Starter",
    price: "$6,000",
    period: "/month",
    commitment: "3 months",
    highlight: false,
    includes: [
      "Everything in Platform",
      "1 active custom build",
      "Dedicated FDE engineer",
      "Slack/email support",
      "Weekly sync calls",
      "Custom integrations",
    ],
    excludes: [
      "Single build at a time",
    ],
  },
  {
    name: "Team",
    price: "$10,000",
    period: "/month",
    commitment: "6 months",
    highlight: true,
    includes: [
      "Everything in Starter",
      "2 active custom builds",
      "Parallel development",
      "Priority support",
      "Dedicated FDM manager",
      "Custom ML models",
      "Advanced analytics",
    ],
    excludes: [],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    commitment: "Annual",
    highlight: false,
    includes: [
      "Everything in Team",
      "3+ active custom builds",
      "Dedicated infrastructure",
      "Custom SLAs",
      "On-premise deployment",
      "Custom security & compliance",
      "24/7 priority support",
    ],
    excludes: [],
  },
]

const platformFeatures = [
  {
    category: "Creative Generation",
    features: ["AI video ad generation", "AI image ad generation", "Brand asset management", "Template library"],
  },
  {
    category: "Testing & Optimization",
    features: ["Pre-launch creative scoring", "A/B test automation", "ROAS prediction", "Audience insights"],
  },
  {
    category: "Campaign Management",
    features: ["Cross-platform campaigns", "Budget optimization", "Real-time bidding", "Performance alerts"],
  },
  {
    category: "Analytics & Reporting",
    features: ["Unified dashboard", "Attribution modeling", "Custom reports", "API access"],
  },
]

const services = [
  {
    name: "FDE",
    title: "Full-stack Development Engineer",
    price: "$4,000",
    description: "Dedicated engineer for custom builds, integrations, and technical implementation.",
  },
  {
    name: "FDM",
    title: "Full-stack Delivery Manager",
    price: "$4,000",
    description: "Strategic partner for campaign optimization, performance reviews, and growth planning.",
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 max-w-2xl">
          <div className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Pricing
          </div>
          <h2 className="text-3xl font-light italic tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Scale with <span className="not-italic">your growth</span>
          </h2>
          <p className="mt-8 text-lg leading-relaxed text-muted-foreground">
            All plans include full platform access. Choose based on how much custom development you need.
          </p>
        </div>

        {/* Tier Cards */}
        <div className="grid gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col bg-background p-6 ${
                tier.highlight ? "lg:bg-card" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{tier.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className={`font-light tracking-tight text-foreground ${tier.price === "Custom" ? "text-2xl" : "text-3xl"}`}>{tier.price}</span>
                    <span className="text-sm text-muted-foreground">{tier.period}</span>
                  </div>
                </div>
                {tier.highlight && (
                  <span className="border border-foreground px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-foreground">
                    Popular
                  </span>
                )}
              </div>

              <div className="mt-2 text-xs text-muted-foreground/60">{tier.commitment} commitment</div>

              <div className="mt-6 flex-1">
                <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Includes</div>
                <ul className="space-y-2">
                  {tier.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/50" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className={`mt-8 w-full font-mono text-xs uppercase tracking-wider ${
                  tier.highlight
                    ? ""
                    : "border-border bg-transparent text-foreground hover:bg-secondary"
                }`}
                variant={tier.highlight ? "default" : "outline"}
              >
                {tier.name === "Enterprise" ? "Contact Us" : "Get Started"}
              </Button>
            </div>
          ))}
        </div>

        {/* Platform Features */}
        <div className="mt-24">
          <div className="mb-8">
            <div className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Platform Features
            </div>
            <h3 className="text-2xl font-light italic tracking-tight text-foreground">
              Included in <span className="not-italic">every plan</span>
            </h3>
          </div>
          <div className="grid gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
            {platformFeatures.map((category) => (
              <div key={category.category} className="bg-background p-6">
                <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{category.category}</h4>
                <ul className="mt-4 space-y-2">
                  {category.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/30" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Services Add-ons */}
        <div className="mt-24">
          <div className="mb-8">
            <div className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Add-on Services
            </div>
            <h3 className="text-2xl font-light italic tracking-tight text-foreground">
              Dedicated <span className="not-italic">experts</span>
            </h3>
          </div>
          <div className="grid gap-px border border-border bg-border md:grid-cols-2">
            {services.map((service) => (
              <div key={service.name} className="bg-background p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground/40">{service.name}</span>
                    <h4 className="mt-2 text-lg font-light text-foreground">{service.title}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-light text-foreground">{service.price}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
