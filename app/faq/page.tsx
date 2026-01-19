"use client"

import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "../app/video-simulation/auth/authContext"
import { useState, useEffect } from "react"

const faqs = [
  {
    question: "What exactly is dble?",
    answer: `dble builds and runs AI-powered marketing systems for e-commerce brands.

Instead of giving you software and tutorials, dble:
• designs automation for your business
• integrates it into your stack
• runs it continuously
• improves it over time

You're buying working systems, not tools.`
  },
  {
    question: "Is this a SaaS product or a service?",
    answer: `It's both.

You get:
• a full AI marketing platform
• plus engineers who build systems on top of it

You're not paying for logins. You're paying for automation capacity.`
  },
  {
    question: "How is this different from an agency?",
    answer: `Agencies do work manually. dble builds systems that do the work automatically.

Key differences:
• systems run 24/7
• decisions happen in real time
• performance improves with use
• results don't stop when humans stop working

If you stop paying an agency, the work stops. With dble, the systems are the value.`
  },
  {
    question: "How is this different from buying tools like Motion, Smartly, or Triple Whale?",
    answer: `Tools give you capabilities. dble gives you outcomes.

With tools:
• you configure everything
• you manage workflows
• you troubleshoot issues
• you hire people to operate them

With dble:
• systems are built for you
• everything is integrated
• automation runs end-to-end
• humans are optional`
  },
  {
    question: "What do you actually build for me?",
    answer: `That depends on your biggest bottleneck.

Common systems include:
• automated video ad generation from Shopify
• pre-launch creative testing (predict winners before spend)
• live campaign optimization across platforms
• marketplace feed automation
• custom business rules and logic

You decide what to automate. dble builds it.`
  },
  {
    question: "What is an \"Active Build Request\"?",
    answer: `An Active Build Request is a system dble is actively working on.

Examples:
• building a video generation system
• modifying testing logic
• adding a new integration
• adjusting optimization rules

You can submit unlimited requests. Your plan determines how many are worked on at once.`
  },
  {
    question: "What happens after the system is built?",
    answer: `It runs continuously.

That includes:
• monitoring
• optimization
• performance improvements
• bug fixes
• model updates

You don't need to babysit it.`
  },
  {
    question: "Do all plans include the same features?",
    answer: `Yes. There is no feature gating.

All plans include:
• generation
• testing
• optimization
• integrations
• reinforcement learning

Plans only differ in capacity, speed, and security depth.`
  },
  {
    question: "Why does pricing start at $6,000/month?",
    answer: `Because this isn't software access. It's engineering.

Behind the scenes:
• engineers design systems for your business
• integrations are built and maintained
• infrastructure runs continuously
• performance is monitored and improved

This replaces:
• agency retainers
• freelancers
• multiple tools
• internal headcount`
  },
  {
    question: "What's included in the monthly price?",
    answer: `Every plan includes:
• full platform access
• system design and build (based on tier)
• integrations and deployment
• monitoring and maintenance
• $1,000/month in included usage credits
  • $500 LLM credits
  • $500 cloud and infrastructure credits

Anything beyond that is usage-based and transparent.`
  },
  {
    question: "Will I get surprise usage charges?",
    answer: `No.

Usage is:
• visible in your dashboard
• predictable for most customers
• alertable with caps if needed

Most brands stay within included credits early on.`
  },
  {
    question: "How long does it take to get started?",
    answer: `Typically 3–4 weeks from kickoff to first system live.

Subsequent systems are faster since integrations are already in place.`
  },
  {
    question: "Do I need an internal marketing team?",
    answer: `Not necessarily.

You can:
• run systems yourself
• add a Forward Deployed Marketer (FDM)
• or mix internal + dble execution

The model is flexible by design.`
  },
  {
    question: "What does an FDM do?",
    answer: `An FDM:
• operates systems daily
• launches campaigns
• monitors performance
• executes optimizations
• reports results

An FDM does not build systems. New logic requires a build request.`
  },
  {
    question: "What if you build custom systems for us and later we want to run everything ourselves?",
    answer: `That's expected and supported.

Many customers:
• start with dble building systems
• prove performance
• graduate to running them internally on the Operate plan

You're not locked in.`
  },
  {
    question: "If we move to Operate, do the systems stop working?",
    answer: `No.

The systems stay live. You simply take over operation.

You can always re-add build capacity later if needed.`
  },
  {
    question: "Can I upgrade or downgrade plans?",
    answer: `Yes.

Customers commonly:
• move from Build → Scale
• or Build → Operate once stable
• or add temporary capacity during peak seasons

Pricing scales with need, not contracts.`
  },
  {
    question: "What platforms do you integrate with?",
    answer: `Out of the box:
• Shopify
• Meta (Facebook, Instagram)
• TikTok + TikTok Shop
• Google (Search, Shopping, YouTube)
• Amazon Ads

Custom integrations are available on higher tiers.`
  },
  {
    question: "Is this secure?",
    answer: `Yes.

All plans include:
• enterprise-grade encryption
• secure cloud infrastructure
• compliance with SOC 2, GDPR, and CCPA

Enterprise plans add:
• dedicated infrastructure
• SSO / SAML
• VPN and IP allowlists
• custom compliance requirements`
  },
  {
    question: "Who is this not a fit for?",
    answer: `dble is not ideal if:
• you spend under ~$250k/year on ads
• you want DIY tools
• you're looking for a traditional agency

It's built for brands serious about automation.`
  },
  {
    question: "What's the typical ROI?",
    answer: `Most customers see value from:
• reduced creative costs
• lower wasted ad spend
• faster iteration
• fewer hires or agencies

ROI usually becomes clear within the first 60–90 days.`
  },
  {
    question: "What's the commitment?",
    answer: `• Build: 3 months
• Scale: 6 months
• Custom: 12 months

After that, plans are flexible with notice.`
  },
  {
    question: "What happens if we cancel?",
    answer: `You keep:
• all creative assets
• performance data exports
• documentation

Systems stop running only because they're on dble infrastructure.`
  },
  {
    question: "What's the simplest way to think about dble?",
    answer: `Like Designjoy, but for AI marketing systems.

You request what to automate. dble builds and runs it. Pricing is based on how many systems we work on at once.`
  }
]

export default function FAQPage() {
  const { login, isAuthenticated } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

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
