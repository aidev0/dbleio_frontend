import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

const tiers = [
  {
    name: "Platform",
    price: "$3,000",
    period: "/month",
    bestFor: [
      "Ideal for teams who want to operate independently",
    ],
    commitment: "Monthly",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$6,000",
    period: "/month",
    bestFor: [
      "$250K-$1M annual ad spend",
      "Have a lean team (1-3 people in marketing)",
      "Want to prove ROI before going all-in",
      "Need to solve one major bottleneck",
    ],
    commitment: "3 months",
    highlight: false,
  },
  {
    name: "Team",
    price: "$10,000",
    period: "/month",
    bestFor: [
      "$1M+ annual ad spend",
      "Have a marketing team of 3-8 people",
      "Sell across multiple platforms (Shopify + Amazon + TikTok Shop)",
      "Want end-to-end automation from generation to optimization",
      "Need systems working together, not in isolation",
    ],
    commitment: "6 months",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Contact Us",
    period: "",
    bestFor: [
      "Operate multiple brands or sub-brands",
      "Sell across multiple marketplaces (Shopify + Amazon + TikTok Shop + own site)",
      "Need custom features not in standard platform",
      "Require faster iteration (multiple builds in parallel)",
      "Have any compliance/security requirements",
    ],
    commitment: "1 year",
    highlight: false,
  },
]

const features = [
  {
    name: "Active Build Requests",
    platform: "None",
    starter: "1",
    team: "2",
    enterprise: "3+",
  },
  {
    name: "Parallel Builds",
    platform: "N/A",
    starter: "No",
    team: "Yes",
    enterprise: "Yes",
  },
  {
    name: "Platform Access",
    platform: "Full Access",
    starter: "Full Access",
    team: "Full Access",
    enterprise: "Custom Enterprise Solutions",
  },
  {
    name: "Onboarding and Integration",
    platform: "Included",
    starter: "Included",
    team: "Included",
    enterprise: "Dedicated enterprise onboarding",
  },
  {
    name: "Compliances",
    platform: "SOC 2, GDPR, CCPA",
    starter: "SOC 2, GDPR, CCPA",
    team: "SOC 2, GDPR, CCPA",
    enterprise: "Custom Enterprise Compliances",
  },
  {
    name: "Security",
    platform: "Enterprise-grade Encryption, Database, Cloud, PCI-Compliant Payments",
    starter: "Enterprise-grade Encryption, Database, Cloud, PCI-Compliant Payments",
    team: "Enterprise-grade Encryption, Database, Cloud, PCI-Compliant Payments, 2FA",
    enterprise: "Custom Enterprise Security (Custom Database, Dedicated infrastructure, Custom Cloud, Encryption, VPN, 2FA, SAML, etc)",
  },
  {
    name: "FDM (Account Manager)",
    platform: "None",
    starter: "+$4,000/month per FDM",
    team: "+$4,000/month per FDM",
    enterprise: "Custom Enterprise Dedicated FDMs",
  },
  {
    name: "Additional Build Request (FDE or ML Engineer)",
    platform: "None",
    starter: "+$4,000/month per FDE",
    team: "+$4,000/month per FDE",
    enterprise: "Custom Enterprise Dedicated FDEs",
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
            Capacity-based <span className="not-italic">pricing</span>
          </h2>
          <p className="mt-8 text-lg leading-relaxed text-muted-foreground">
            All customers access the same platform. Pay based on simultaneous system capacity.
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
                    <span className={`font-light tracking-tight text-foreground ${tier.price === "Contact Us" ? "text-2xl" : "text-3xl"}`}>{tier.price}</span>
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
                <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Best for</div>
                <ul className="space-y-2">
                  {tier.bestFor.map((item) => (
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

        {/* Feature Comparison Table */}
        <div className="mt-16">
          <h3 className="mb-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Feature Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-4 pr-4 text-left font-mono text-xs uppercase tracking-wider text-muted-foreground">Feature</th>
                  <th className="px-4 py-4 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">Platform</th>
                  <th className="px-4 py-4 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">Starter</th>
                  <th className="px-4 py-4 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">Team</th>
                  <th className="px-4 py-4 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr key={feature.name} className={index !== features.length - 1 ? "border-b border-border/50" : ""}>
                    <td className="py-4 pr-4 font-medium text-foreground">{feature.name}</td>
                    <td className="px-4 py-4 text-center text-muted-foreground">{feature.platform}</td>
                    <td className="px-4 py-4 text-center text-muted-foreground">{feature.starter}</td>
                    <td className="px-4 py-4 text-center text-muted-foreground">{feature.team}</td>
                    <td className="px-4 py-4 text-center text-muted-foreground">{feature.enterprise}</td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="py-4 pr-4 font-medium text-foreground">Commitment</td>
                  <td className="px-4 py-4 text-center text-muted-foreground">Monthly</td>
                  <td className="px-4 py-4 text-center text-muted-foreground">3 months</td>
                  <td className="px-4 py-4 text-center text-muted-foreground">6 months</td>
                  <td className="px-4 py-4 text-center text-muted-foreground">1 year</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
