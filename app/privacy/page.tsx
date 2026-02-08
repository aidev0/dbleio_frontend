"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "../app/video-simulation/auth/authContext"
import { useSyncExternalStore } from "react"

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-4 font-mono text-xs text-muted-foreground">Last updated: January 2025</p>
        </div>

        <div className="space-y-12 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">Introduction</h2>
            <p>
              dble (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform and services.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium text-foreground">Account Information</h3>
                <p>When you create an account, we collect your name, email address, company name, and billing information.</p>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-foreground">Platform Data</h3>
                <p>We collect data from connected platforms (Shopify, Meta, TikTok, Google, Amazon) as authorized by you to provide our services. This includes product catalogs, campaign performance data, and creative assets.</p>
              </div>
              <div>
                <h3 className="mb-2 font-medium text-foreground">Usage Data</h3>
                <p>We automatically collect information about how you interact with our platform, including pages visited, features used, and system performance metrics.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">How We Use Your Information</h2>
            <ul className="list-inside list-disc space-y-2">
              <li>To provide, maintain, and improve our services</li>
              <li>To build and operate AI marketing systems on your behalf</li>
              <li>To process transactions and send related information</li>
              <li>To communicate with you about updates, support, and marketing</li>
              <li>To monitor and analyze usage patterns and trends</li>
              <li>To detect, prevent, and address technical issues</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">Data Sharing</h2>
            <p className="mb-4">We do not sell your personal information. We may share data with:</p>
            <ul className="list-inside list-disc space-y-2">
              <li>Service providers who assist in operating our platform</li>
              <li>Third-party platforms you authorize us to connect with</li>
              <li>Legal authorities when required by law</li>
              <li>Business partners with your explicit consent</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">Data Security</h2>
            <p>
              We implement enterprise-grade security measures including encryption in transit and at rest, secure cloud infrastructure, regular security audits, and compliance with SOC 2, GDPR, and CCPA standards.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide services. Upon account termination, we retain data for up to 90 days before permanent deletion, unless legally required to retain it longer.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-inside list-disc space-y-2">
              <li>Access and receive a copy of your data</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">Cookies</h2>
            <p>
              We use cookies and similar technologies to maintain sessions, remember preferences, and analyze platform usage. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">Contact Us</h2>
            <p>
              For privacy-related inquiries, contact us at privacy@dble.io or write to us at our business address.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-light text-foreground">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
