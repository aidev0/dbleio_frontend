"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { HowItWorks } from "@/components/how-it-works"
import { Features } from "@/components/features"
import { Pricing } from "@/components/pricing"
import { Security } from "@/components/security"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useAuth } from "./app/video-simulation/auth/authContext"

export default function Home() {
  const { login, isAuthenticated } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    feature_type: "video_generation",
    description: "",
    plan: "team"
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feature-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      if (response.ok) {
        setSubmitted(true)
        setFormData({ name: "", email: "", company: "", feature_type: "video_generation", description: "", plan: "team" })
      }
    } catch (error) {
      console.error("Error submitting request:", error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        isAuthenticated={mounted ? isAuthenticated : false}
        onLogin={login}
        onRequestAccess={() => setShowRequestForm(true)}
      />
      <main>
        <Hero onStartBuilding={() => setShowRequestForm(true)} />
        <HowItWorks />
        <Features />
        <Pricing />
        <Security />
      </main>
      <Footer />

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowRequestForm(false)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-light italic tracking-tight">Request Access</h2>
              <button onClick={() => setShowRequestForm(false)} className="text-2xl text-muted-foreground hover:text-foreground">&times;</button>
            </div>

            {submitted ? (
              <div className="py-8 text-center">
                <p className="mb-2 text-lg font-medium">Request Submitted</p>
                <p className="mb-4 text-sm text-muted-foreground">We&apos;ll be in touch within 24 hours.</p>
                <button onClick={() => { setSubmitted(false); setShowRequestForm(false) }} className="text-sm text-muted-foreground hover:text-foreground">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">What to automate</label>
                  <select
                    value={formData.feature_type}
                    onChange={(e) => setFormData({ ...formData, feature_type: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                  >
                    <option value="video_generation">AI Video Ad Generation</option>
                    <option value="image_generation">AI Image Ad Generation</option>
                    <option value="creative_testing">Pre-Launch Creative Testing</option>
                    <option value="campaign_optimization">Live Campaign Optimization</option>
                    <option value="full_stack">Full Stack (All of the above)</option>
                    <option value="custom">Custom / Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">Plan</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                  >
                    <option value="platform">Platform ($3,000/mo)</option>
                    <option value="starter">Starter ($6,000/mo)</option>
                    <option value="team">Team ($10,000/mo)</option>
                    <option value="enterprise">Enterprise (Custom)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">Additional Details</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full font-mono text-xs uppercase tracking-wider">
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
