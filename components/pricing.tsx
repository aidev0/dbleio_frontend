"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { ContactFormModal } from "@/components/contact-form-modal"

const tiers = [
  {
    name: "Platform",
    id: "platform",
    price: "$4,000",
    period: "/mo/brand",
    commitment: "Monthly Subscription",
    highlight: false,
    includes: [
      "Full platform access",
      "Ads Platforms integrations",
      "Video & image generation tools",
      "Creative testing & scoring",
      "Campaign analytics dashboard",
      "$1,000 cloud + LLM usage credits included",
    ],
  },
  {
    name: "SCALE",
    id: "scale",
    price: "$8,000",
    period: "/mo/brand",
    commitment: "Monthly Subscription",
    highlight: true,
    includes: [
      "Full platform access",
      "1 Dedicated FDE",
      "1 Dedicated FDM",
      "Slack/email support",
      "Weekly sync calls",
      "Custom integrations",
      "Custom predictive model",
      "Custom LLM model",
      "$1,000 cloud + LLM usage credits included",
    ],
  },
  {
    name: "Enterprise",
    id: "enterprise",
    price: "Custom",
    period: "multi-brand",
    commitment: "Annual Contract",
    highlight: false,
    includes: [
      "Full platform access",
      "Dedicated FDE team",
      "Dedicated FDM team",
      "Custom integrations",
      "Custom predictive model",
      "Custom LLM model",
      "Dedicated infrastructure",
      "Custom SLAs",
      "On-premise option",
      "Custom security & compliance",
      "24/7 priority support",
    ],
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


export function Pricing() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  const handleContactClick = (planId: string) => {
    setSelectedPlan(planId)
    setIsModalOpen(true)
  }

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
        <div className="grid gap-px border border-border bg-border md:grid-cols-3">
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

              {tier.name === "Enterprise" && (
                <div className="mt-2 text-xs text-muted-foreground/60">{tier.commitment}</div>
              )}

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
                onClick={() => handleContactClick(tier.id)}
                className={`mt-8 w-full font-mono text-xs uppercase tracking-wider transition-all ${
                  hoveredButton === tier.id || (!hoveredButton && tier.highlight)
                    ? "bg-foreground text-background"
                    : "bg-transparent text-foreground border border-foreground"
                }`}
                variant={tier.highlight ? "default" : "outline"}
                onMouseEnter={() => setHoveredButton(tier.id)}
                onMouseLeave={() => setHoveredButton(null)}
              >
                CONTACT US
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

        {/* FDE/FDM Explanation */}
        <div className="mt-24">
          <div className="mb-8">
            <div className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Dedicated Experts
            </div>
            <h3 className="text-2xl font-light italic tracking-tight text-foreground">
              What is <span className="not-italic">FDE & FDM?</span>
            </h3>
          </div>
          <div className="grid gap-px border border-border bg-border md:grid-cols-2">
            <div className="bg-background p-8">
              <span className="font-mono text-xs text-muted-foreground/40">FDE</span>
              <h4 className="mt-2 text-lg font-light text-foreground">Forward Deployed Engineer</h4>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Dedicated engineer for custom builds, integrations, and technical implementation. Builds and maintains your marketing automation systems.
              </p>
            </div>
            <div className="bg-background p-8">
              <span className="font-mono text-xs text-muted-foreground/40">FDM</span>
              <h4 className="mt-2 text-lg font-light text-foreground">Forward Deployed Marketer</h4>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Strategic partner for campaign optimization, performance reviews, and growth planning. Operates systems and drives marketing outcomes.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ContactFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedPlan={selectedPlan}
      />
    </section>
  )
}
