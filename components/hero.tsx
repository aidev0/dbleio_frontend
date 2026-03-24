"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useState } from "react"
import Image from "next/image"

interface HeroProps {
  onContactUs?: () => void
}

export function Hero({ onContactUs }: HeroProps) {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)
  return (
    <section className="relative sm:min-h-screen overflow-hidden hero-mobile-landscape">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px"
        }}
      />

      <div className="relative z-10 mx-auto flex sm:min-h-screen max-w-6xl flex-col sm:justify-center px-4 sm:px-6 pt-20 sm:pt-20 pb-8 sm:pb-0">
        <div className="max-w-4xl">
      
          <h1 className="text-balance text-4xl font-light italic tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
            The Palantir
            <span className="block not-italic font-normal">for DTC marketing</span>
          </h1>

          <p className="mt-3 sm:mt-8 max-w-xl text-pretty text-sm sm:text-xl leading-relaxed text-muted-foreground">
            <span className="sm:hidden">We build customized AI-powered marketing platforms that agencies deploy directly for their clients. Not software — an execution partner.</span>
            <span className="hidden sm:inline">We design and build customized experiences, AI-powered solutions, and proprietary marketing platforms that agencies can deploy directly for their clients. Like Sitecore, we create composable, tailored experiences. Like Palantir, we embed forward-deployed engineers and marketers directly into the workflow.</span><br></br><br></br>
            <span>dble.io is not a DIY platform or off-the-shelf software. We are an execution partner that eliminates friction in DTC marketing operations, optimizes existing workflows, and builds new acquisition pillars that drive measurable revenue growth for your agency and your clients&apos; brands.</span>
          </p>

          <div className="mt-6 sm:mt-14 flex flex-row gap-3 sm:gap-4 items-center justify-center sm:justify-start">
            <Button
              size="lg"
              className={`h-11 sm:h-14 px-6 sm:px-10 font-mono text-xs sm:text-sm uppercase tracking-wider transition-all btn-mobile-landscape ${
                hoveredButton === 'contact' || (!hoveredButton && true)
                  ? 'bg-foreground text-background'
                  : 'bg-transparent text-foreground border border-foreground'
              }`}
              onClick={onContactUs}
              onMouseEnter={() => setHoveredButton('contact')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              Contact Us
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className={`h-11 sm:h-14 px-6 sm:px-10 font-mono text-xs sm:text-sm uppercase tracking-wider transition-all btn-mobile-landscape ${
                hoveredButton === 'plans'
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-transparent text-foreground border-foreground'
              }`}
              asChild
              onMouseEnter={() => setHoveredButton('plans')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <a href="#pricing">View Plans</a>
            </Button>
          </div>
        </div>

        {/* Platform Logos */}
        <div className="mt-6 sm:mt-16 md:mt-20">
          <div className="text-center mb-3 sm:mb-8">
            <h3 className="font-mono text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">Supported Platforms</h3>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-12">
            {[
              {
                name: "Meta",
                logo: "/logos/meta.svg"
              },
              {
                name: "Instagram",
                logo: "/logos/instagram.svg"
              },
              {
                name: "Amazon",
                logo: "/logos/amazon.svg"
              },
              {
                name: "TikTok",
                logo: "/logos/tiktok.svg"
              },
              {
                name: "Pinterest",
                logo: "/logos/pinterest.png"
              },
              {
                name: "Vibe",
                logo: "/vibe-logo.svg"
              },
              {
                name: "X",
                logo: "/logos/x.svg"
              },
              {
                name: "YouTube",
                logo: "/logos/youtube.svg"
              },
            ].map((platform) => (
              <div key={platform.name} className="flex items-center justify-center mx-auto">
                <Image
                  src={platform.logo}
                  alt={`${platform.name} logo`}
                  className={`object-contain filter grayscale ${
                    platform.name === 'Instagram' || platform.name === 'Pinterest' || platform.name === 'TikTok' || platform.name === 'Meta' || platform.name === 'YouTube'
                      ? 'h-6 w-6 sm:h-12 sm:w-12'
                      : platform.name === 'X'
                      ? 'h-5 w-5 sm:h-10 sm:w-10'
                      : 'h-10 w-10 sm:h-20 sm:w-20'
                  }`}
                  width={80}
                  height={80}
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
