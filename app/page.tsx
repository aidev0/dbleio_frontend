"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { HowItWorks } from "@/components/how-it-works"
import { Features } from "@/components/features"
import { Pricing } from "@/components/pricing"
import { Security } from "@/components/security"
import { Footer } from "@/components/footer"
import { useAuth } from "./app/video-simulation/auth/authContext"

export default function Home() {
  const router = useRouter()
  const { login, isAuthenticated } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push("/app")
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
      <main>
        <Hero onStartBuilding={handleGetStarted} />
        <HowItWorks />
        <Features />
        <Pricing />
        <Security />
      </main>
      <Footer />
    </div>
  )
}
