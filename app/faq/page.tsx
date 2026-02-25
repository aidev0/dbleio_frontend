"use client"

import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "../app/video-simulation/auth/authContext"
import { useState, useSyncExternalStore } from "react"

const faqs = [
  {
    question: "Is dble just another generative AI tool?",
    answer: `No. dble is deployed production infrastructure, not a generative AI wrapper. We provide an end-to-end AI marketing system that predicts performance before your budget is spent, effectively closing the intelligence gap and replacing the standard "test and learn" cycle that wastes 30-50% of ad spend.`
  },
  {
    question: "What is the Forward Deployed model?",
    answer: `Unlike traditional SaaS tools that hand you a login, we embed experts directly into your workflow. Forward Deployed Engineers (FDEs) manage your custom technical builds, integrations, and system maintenance. Forward Deployed Marketers (FDMs) act as your strategic partners, reviewing creative outputs, enforcing brand standards, and optimizing campaigns for growth.`
  },
  {
    question: "How do you predict ad performance before spending budget?",
    answer: `Our core engine uses two layers of pre-launch intelligence. First, a custom predictive model ranks every concept against core KPIs like predicted CTR, Conversion Rate, and ROAS. Second, top concepts are stress-tested through a simulation engine using AI personas that model real audience behaviors, dictating exactly where to allocate media budget for maximum return.`
  },
  {
    question: "What platforms does dble integrate with?",
    answer: `The integration suite seamlessly connects your entire growth stack. We integrate with Meta, Amazon, Shopify, TikTok, Google, and major analytics platforms, unifying your data into one centralized system.`
  },
  {
    question: "Is our agency and client data secure?",
    answer: `Yes. The platform is built for regulated environments and sensitive data. We maintain enterprise-grade security including SOC 2 Type II, GDPR, and CCPA compliance. Infrastructure includes AES-256 encryption at rest, TLS 1.3 in transit, SSO/SAML, and full audit trails. We also offer dedicated infrastructure and custom data residency options.`
  },
  {
    question: "How is the platform priced?",
    answer: `Every partnership tier receives full platform access with no locked features; your investment scales with your growth and required level of custom development. The Scale plan is $4,000/mo/brand, and the Enterprise plan is $8,000/mo/brand, which fully integrates your dedicated FDE and FDM teams.`
  },
  {
    question: "How do you guarantee brand safety and consistency?",
    answer: `You maintain absolute control over the final output. The platform uses your specific brand fonts, colors, and styling for every asset generated. Furthermore, your dedicated Forward Deployed Marketers (FDMs) review outputs to enforce your brand standards, ensuring every asset passes strict compliance checks before anything goes live.`
  },
  {
    question: "Do we need to provide our own LLM or cloud infrastructure?",
    answer: `No. All of our plans automatically include $1,000 in cloud and LLM usage credits. For Enterprise partners, we can also build on dedicated infrastructure or provide on-premise options to meet your specific compliance needs.`
  },
]

export default function FAQPage() {
  const { login, isAuthenticated } = useAuth()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

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
            <span>FAQ</span>
          </div>
          <h1 className="text-4xl font-light italic tracking-tight text-foreground sm:text-5xl">
            Frequently Asked Questions
          </h1>
        </div>

        <div className="space-y-px border border-border bg-border">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-background">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-secondary/30"
              >
                <span className="pr-8 text-lg font-light text-foreground">{faq.question}</span>
                <span className="flex-shrink-0 font-mono text-xl text-muted-foreground">
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>
              {openIndex === index && (
                <div className="border-t border-border px-6 pb-6 pt-4">
                  <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
