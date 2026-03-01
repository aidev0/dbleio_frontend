"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { ContactFormModal } from "@/components/contact-form-modal"

const tiers = [
  {
    name: "Brand",
    id: "brand",
    price: "$8,000",
    period: "/mo/brand",
    commitment: "Monthly Subscription",
    highlight: true,
    mobileDesc: "Dedicated engineer + marketer",
    includes: [
      "Full platform access",
      "1 Dedicated Engineer (FDE)",
      "1 Dedicated Marketer (FDM)",
      "Slack/email support",
      "Weekly sync calls",
      "Custom integrations",
      "Custom predictive model",
      "Custom LLM model",
      "$1,000 cloud + LLM usage credits included",
    ],
  },
  {
    name: "Agency",
    id: "agency",
    price: "Custom",
    period: "multi-brand",
    commitment: "Annual Contract",
    highlight: false,
    mobileDesc: "Dedicated teams + custom infra",
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
    <section id="pricing" className="py-8 sm:py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-5 sm:mb-10 max-w-4xl">
          <div className="mb-3 sm:mb-6 font-mono text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">
            Pricing
          </div>
          <h2 className="text-2xl font-light italic tracking-tight text-foreground sm:text-5xl lg:text-6xl whitespace-nowrap">
            Scale Intelligence, Not Headcount
          </h2>
          <p className="hidden sm:block mt-6 text-xl leading-relaxed text-muted-foreground">
            We deploy production marketing systems into your organization. Every deployment includes the full intelligence engine and the dedicated operators behind it.
          </p>
        </div>

        {/* Tier Cards - Desktop */}
        <div className="hidden sm:grid gap-px border border-border bg-border md:grid-cols-2">
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
                    <span className={`font-light tracking-tight text-foreground ${tier.price === "Custom" ? "text-3xl" : "text-4xl"}`}>{tier.price}</span>
                    <span className="text-sm text-muted-foreground">{tier.period}</span>
                  </div>
                </div>
              </div>

              {tier.name === "Agency" && (
                <div className="mt-2 text-xs text-muted-foreground/60">{tier.commitment}</div>
              )}

              <div className="mt-6 flex-1">
                <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Includes</div>
                <ul className="space-y-2">
                  {tier.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-base text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/50" />
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

        {/* Tier Cards - Mobile: name, price, subtitle, CTA */}
        <div className="sm:hidden grid gap-px border border-border bg-border">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="flex items-center justify-between bg-background px-4 py-3"
            >
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{tier.name}</h3>
                  <span className="text-lg font-light tracking-tight text-foreground">{tier.price}</span>
                  <span className="text-[10px] text-muted-foreground">{tier.period}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{tier.mobileDesc}</p>
              </div>
              <Button
                onClick={() => handleContactClick(tier.id)}
                size="sm"
                className={`h-7 px-3 shrink-0 font-mono text-[9px] uppercase tracking-wider ${
                  tier.highlight
                    ? "bg-foreground text-background"
                    : "bg-transparent text-foreground border border-foreground"
                }`}
                variant={tier.highlight ? "default" : "outline"}
              >
                Contact
              </Button>
            </div>
          ))}
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
