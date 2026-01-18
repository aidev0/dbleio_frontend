export function Security() {
  const features = [
    {
      title: "SOC 2 Type II",
      items: ["GDPR + DPA", "CCPA", "HIPAA available"],
    },
    {
      title: "Encryption",
      items: ["AES-256 at rest", "TLS 1.3 in transit", "Key management"],
    },
    {
      title: "Access Control",
      items: ["SSO/SAML", "RBAC", "2FA enforcement"],
    },
    {
      title: "Infrastructure",
      items: ["Dedicated options", "Custom data residency", "Full audit trail"],
    },
  ]

  return (
    <section id="security" className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          <div>
            <div className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Security
            </div>
            <h2 className="text-3xl font-light italic tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Enterprise-grade <span className="not-italic">security by default</span>
            </h2>
            <p className="mt-8 text-lg leading-relaxed text-muted-foreground">
              Built for teams that handle sensitive data and operate in regulated environments.
            </p>
          </div>
          
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="bg-background p-6">
                <h3 className="font-mono text-xs uppercase tracking-wider text-foreground">{feature.title}</h3>
                <ul className="mt-4 space-y-2">
                  {feature.items.map((item) => (
                    <li key={item} className="text-sm text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
