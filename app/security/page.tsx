"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "../app/video-simulation/auth/authContext"
import { useState, useEffect } from "react"
import { Shield, Lock, Server, Eye, FileCheck, Users } from "lucide-react"

const securityFeatures = [
  {
    icon: Lock,
    title: "Encryption",
    description: "All data is encrypted in transit (TLS 1.3) and at rest (AES-256). API keys and credentials are stored in secure vaults with hardware security modules."
  },
  {
    icon: Server,
    title: "Infrastructure",
    description: "Hosted on enterprise-grade cloud infrastructure with SOC 2 Type II certification. Isolated compute environments, automated backups, and multi-region redundancy."
  },
  {
    icon: Shield,
    title: "Access Control",
    description: "Role-based access control (RBAC) with least-privilege principles. Multi-factor authentication required for all accounts. Session management with automatic timeouts."
  },
  {
    icon: Eye,
    title: "Monitoring",
    description: "24/7 security monitoring with anomaly detection. Real-time alerts for suspicious activity. Comprehensive audit logs for all system access and changes."
  },
  {
    icon: FileCheck,
    title: "Compliance",
    description: "SOC 2 Type II compliant. GDPR and CCPA ready. Regular third-party security audits and penetration testing. Data processing agreements available."
  },
  {
    icon: Users,
    title: "Enterprise Options",
    description: "Dedicated infrastructure, SSO/SAML integration, VPN and IP allowlists, custom data retention policies, and dedicated security review for Enterprise plans."
  }
]

export default function SecurityPage() {
  const { login, isAuthenticated } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleGetStarted = () => {
    if (isAuthenticated) {
      window.location.href = "/app"
    } else {
      login()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        isAuthenticated={mounted ? isAuthenticated : false}
        onLogin={login}
        onRequestAccess={handleGetStarted}
      />

      <main className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-16">
          <div className="mb-4 inline-flex items-center gap-3 font-mono text-xs tracking-widest text-muted-foreground">
            <span className="h-px w-12 bg-foreground/30" />
            <span>SECURITY</span>
          </div>
          <h1 className="text-4xl font-light italic tracking-tight text-foreground sm:text-5xl">
            Enterprise-Grade Security
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Your data security is foundational to everything we build. We implement rigorous security practices to protect your business information and marketing systems.
          </p>
        </div>

        {/* Security Features Grid */}
        <div className="mb-24 grid gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {securityFeatures.map((feature) => (
            <div key={feature.title} className="bg-background p-8">
              <feature.icon className="mb-4 h-8 w-8 text-foreground/70" />
              <h3 className="mb-3 text-lg font-light text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Security Practices */}
        <div className="mb-24">
          <h2 className="mb-8 text-2xl font-light italic text-foreground">Security Practices</h2>
          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <div className="border-l-2 border-border pl-6">
              <h3 className="mb-2 font-medium text-foreground">Secure Development</h3>
              <p>All code undergoes security review before deployment. We follow OWASP guidelines, conduct regular dependency audits, and maintain a responsible disclosure program.</p>
            </div>
            <div className="border-l-2 border-border pl-6">
              <h3 className="mb-2 font-medium text-foreground">Data Handling</h3>
              <p>We process only the data necessary to provide our services. Data is logically isolated per customer. We never sell or share your data with third parties for their own purposes.</p>
            </div>
            <div className="border-l-2 border-border pl-6">
              <h3 className="mb-2 font-medium text-foreground">Incident Response</h3>
              <p>We maintain a documented incident response plan with defined escalation procedures. In the event of a security incident, affected customers are notified within 72 hours per regulatory requirements.</p>
            </div>
            <div className="border-l-2 border-border pl-6">
              <h3 className="mb-2 font-medium text-foreground">Vendor Security</h3>
              <p>Third-party vendors undergo security assessment before integration. We maintain a minimal vendor footprint and require all partners to meet our security standards.</p>
            </div>
          </div>
        </div>

        {/* Compliance Badges */}
        <div className="mb-24">
          <h2 className="mb-8 text-2xl font-light italic text-foreground">Compliance</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border border-border p-6 text-center">
              <div className="mb-2 font-mono text-2xl text-foreground">SOC 2</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Type II Certified</div>
            </div>
            <div className="border border-border p-6 text-center">
              <div className="mb-2 font-mono text-2xl text-foreground">GDPR</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Compliant</div>
            </div>
            <div className="border border-border p-6 text-center">
              <div className="mb-2 font-mono text-2xl text-foreground">CCPA</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Compliant</div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="border border-border p-8">
          <h2 className="mb-4 text-xl font-light text-foreground">Security Questions?</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            For security inquiries, vulnerability reports, or to request our SOC 2 report, contact our security team.
          </p>
          <a
            href="mailto:security@dble.io"
            className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-foreground transition-colors hover:text-muted-foreground"
          >
            security@dble.io
          </a>
        </div>
      </main>

      <Footer />
    </div>
  )
}
