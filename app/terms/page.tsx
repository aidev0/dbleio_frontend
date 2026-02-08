"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "../app/video-simulation/auth/authContext"
import { useSyncExternalStore } from "react"

export default function TermsPage() {
  const { login, isAuthenticated } = useAuth()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

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

      <main className="mx-auto max-w-4xl px-6 py-24">
        <div className="mb-16">
          <div className="mb-4 inline-flex items-center gap-3 font-mono text-xs tracking-widest text-muted-foreground">
            <span className="h-px w-12 bg-foreground/30" />
            <span>LEGAL</span>
          </div>
          <h1 className="text-4xl font-light italic tracking-tight text-foreground sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 font-mono text-xs text-muted-foreground">Last updated: January 2025</p>
        </div>

        <div className="space-y-12 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">1. Agreement to Terms</h2>
            <p>
              By accessing or using dble&apos;s platform and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use our services.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">2. Description of Services</h2>
            <p>
              dble provides AI-powered marketing automation systems for e-commerce brands. Our services include platform access, custom system development, integrations, deployment, and ongoing maintenance and optimization.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">3. Account Registration</h2>
            <p className="mb-4">To use our services, you must:</p>
            <ul className="list-inside list-disc space-y-2">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update any changes to your information</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">4. Subscription and Payment</h2>
            <div className="space-y-4">
              <p>
                <strong className="text-foreground">Pricing:</strong> Services are billed monthly based on your selected plan. Current pricing is available on our website.
              </p>
              <p>
                <strong className="text-foreground">Usage Credits:</strong> Each plan includes monthly usage credits. Additional usage is billed at published rates.
              </p>
              <p>
                <strong className="text-foreground">Payment:</strong> Payment is due at the beginning of each billing cycle. We accept major credit cards and ACH transfers.
              </p>
              <p>
                <strong className="text-foreground">Commitment Terms:</strong> Build plans require a 3-month commitment. Scale plans require 6 months. Custom/Enterprise plans require 12 months.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">5. Acceptable Use</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-inside list-disc space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit malicious code or interfere with platform operations</li>
              <li>Attempt unauthorized access to our systems</li>
              <li>Use the platform to send spam or misleading content</li>
              <li>Resell or sublicense access without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">6. Intellectual Property</h2>
            <div className="space-y-4">
              <p>
                <strong className="text-foreground">Our IP:</strong> The dble platform, including all software, algorithms, and documentation, remains our exclusive property.
              </p>
              <p>
                <strong className="text-foreground">Your Content:</strong> You retain ownership of your data, creative assets, and business information. You grant us a license to use this content solely to provide our services.
              </p>
              <p>
                <strong className="text-foreground">Custom Systems:</strong> Systems built specifically for you are considered work-for-hire. You own the output and configurations; we retain ownership of underlying platform technology.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">7. Confidentiality</h2>
            <p>
              Both parties agree to maintain confidentiality of proprietary information shared during the course of service. This includes business data, system configurations, and strategic information.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">8. Service Level</h2>
            <p>
              We strive for 99.9% platform uptime. Scheduled maintenance will be communicated in advance. We are not liable for downtime caused by third-party services, force majeure, or factors outside our control.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, dble shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities. Our total liability shall not exceed the fees paid by you in the twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">10. Termination</h2>
            <div className="space-y-4">
              <p>
                <strong className="text-foreground">By You:</strong> You may cancel your subscription with 30 days written notice after your commitment period ends.
              </p>
              <p>
                <strong className="text-foreground">By Us:</strong> We may terminate or suspend access for violation of these terms, non-payment, or at our discretion with 30 days notice.
              </p>
              <p>
                <strong className="text-foreground">Effect:</strong> Upon termination, you retain access to export your data for 30 days. Systems running on our infrastructure will be deactivated.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">11. Modifications</h2>
            <p>
              We reserve the right to modify these terms at any time. Material changes will be communicated via email or platform notification at least 30 days before taking effect.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">12. Governing Law</h2>
            <p>
              These terms are governed by the laws of the State of Delaware, USA. Any disputes shall be resolved through binding arbitration in accordance with AAA rules.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">13. Contact</h2>
            <p>
              For questions about these Terms, contact us at legal@dble.io.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
