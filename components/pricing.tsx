"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { ContactFormModal } from "@/components/contact-form-modal"

const tiers = [
  // {
  //   name: "Brand",
  //   id: "brand",
  //   price: "$8,000",
  //   period: "/mo/brand",
  //   commitment: "Monthly Subscription",
  //   highlight: true,
  //   mobileDesc: "Dedicated engineer + marketer",
  //   includes: [
  //     "Custom platforms and solutions",
  //     "1 Dedicated Engineer (FDE)",
  //     "1 Dedicated Marketer (FDM)",
  //     "Slack/email support",
  //     "Weekly sync calls",
  //     "Custom integrations",
  //     "Custom predictive model",
  //     "Custom LLM model",
  //     "$1,000 cloud + LLM usage credits included",
  //   ],
  // },
  {
    name: "Agency",
    id: "agency",
    price: "Custom",
    period: "multi-brand",
    commitment: "Annual Contract",
    highlight: true,
    mobileDesc: "Dedicated teams + custom infra",
    includes: [
      "Custom platforms and solutions",
      "Dedicated FDE team",
      "Dedicated FDM team",
      "Slack/email support",
      "Weekly sync calls",
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
    category: "AI Agents",
    features: ["Research & trend discovery", "Competitive analysis", "Content generation pipeline", "Persona simulation & A/B testing", "Predictive performance scoring", "Content ranking & scheduling"],
  },
  {
    category: "Creative Production",
    features: ["AI video ad generation", "AI image ad generation", "Storyboard-to-video", "Multi-LLM support (GPT, Claude, Gemini)", "Brand asset management", "Shopify product sync"],
  },
  {
    category: "Campaign Intelligence",
    features: ["Cross-platform campaigns (Meta, TikTok, Instagram, Amazon)", "Budget optimization", "Audience & persona targeting", "ROAS prediction & forecasting", "Real-time performance alerts"],
  },
  {
    category: "Analytics & Integrations",
    features: ["Unified analytics dashboard", "Instagram & competitor tracking", "Shopify integration", "Custom reports & attribution", "Interactive AI insights chat"],
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
        {/* Desktop */}
        <div className="hidden sm:flex flex-col items-center">
          <div className="mb-3 font-mono text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">
            Pricing
          </div>
          <h2 className="text-2xl font-light italic tracking-tight text-foreground sm:text-5xl lg:text-6xl text-center">
            Scale Intelligence, Not Headcount
          </h2>
          <p className="mt-6 text-xl leading-relaxed text-muted-foreground text-center max-w-2xl">
            We deploy production marketing systems into your organization. Every deployment includes the full intelligence engine and the dedicated operators behind it.
          </p>

          <div className="mt-10 w-full max-w-2xl border border-border bg-card p-8 lg:p-10">
            <h3 className="text-3xl font-light tracking-tight text-foreground">Agency</h3>
            <div className="mt-3 flex items-center gap-4">
              <span className="text-lg text-muted-foreground">Custom &middot; multi-brand</span>
              <span className="text-sm text-muted-foreground/60">Annual Contract</span>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <ul className="grid grid-cols-2 gap-x-8 gap-y-3">
                {tiers[0].includes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={() => handleContactClick("agency")}
              className="mt-8 font-mono text-xs uppercase tracking-wider bg-foreground text-background px-10"
              onMouseEnter={() => setHoveredButton("agency")}
              onMouseLeave={() => setHoveredButton(null)}
            >
              CONTACT US
            </Button>
          </div>
        </div>

        {/* Platform Features */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-px border border-border bg-border mt-10">
          {platformFeatures.map((cat) => (
            <div key={cat.category} className="bg-background p-6">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-4">{cat.category}</h3>
              <ul className="space-y-2">
                {cat.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-foreground/50" />
                    {f}
                  </li>
                ))}
              </ul>
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
