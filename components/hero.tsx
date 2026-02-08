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
          <div className="mb-4 sm:mb-8 hidden sm:inline-flex items-center gap-3 font-mono text-xs tracking-widest text-muted-foreground">
            <span className="h-px w-12 bg-foreground/30" />
            <span>MARKETING INTELLIGENCE PLATFORM</span>
          </div>

          <h1 className="text-balance text-4xl font-light italic tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
            The Palantir
            <span className="block not-italic font-normal">for DTC marketing</span>
          </h1>

          <p className="mt-3 sm:mt-8 max-w-xl text-pretty text-sm sm:text-xl leading-relaxed text-muted-foreground">
            <span className="sm:hidden">AI-powered ad systems. We run it, you scale.</span>
            <span className="hidden sm:inline">Custom AI systems across every ad platform. We build, deploy, and run it—you scale your brand.</span>
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
                logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/1024px-Meta_Platforms_Inc._logo.svg.png"
              },
              {
                name: "Instagram",
                logo: "https://upload.wikimedia.org/wikipedia/commons/9/95/Instagram_logo_2022.svg"
              },
              {
                name: "Amazon",
                logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/1024px-Amazon_logo.svg.png"
              },
              {
                name: "TikTok",
                logo: "https://upload.wikimedia.org/wikipedia/commons/3/34/Ionicons_logo-tiktok.svg"
              },
              {
                name: "Pinterest",
                logo: "https://upload.wikimedia.org/wikipedia/commons/0/08/Pinterest-logo.png"
              },
              {
                name: "Vibe",
                logo: "/vibe-logo.svg"
              },
              {
                name: "X",
                logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/X_logo_2023.svg/512px-X_logo_2023.svg.png"
              },
              {
                name: "YouTube",
                logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/512px-YouTube_full-color_icon_%282017%29.svg.png"
              },
            ].map((platform) => (
              <div key={platform.name} className="flex items-center justify-center mx-auto">
                <Image
                  src={platform.logo}
                  alt={`${platform.name} logo`}
                  className={`object-contain filter grayscale ${
                    platform.name === 'Instagram' || platform.name === 'Pinterest' || platform.name === 'TikTok'
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
