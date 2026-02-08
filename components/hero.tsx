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
    <section className="relative min-h-screen overflow-hidden hero-mobile-landscape">
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

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 sm:px-6 pt-16 sm:pt-20">
        <div className="max-w-4xl">
          <div className="mb-8 inline-flex items-center gap-3 font-mono text-xs tracking-widest text-muted-foreground">
            <span className="h-px w-12 bg-foreground/30" />
            <span>MARKETING INTELLIGENCE PLATFORM</span>
          </div>

          <h1 className="text-balance text-5xl font-light italic tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
            The Palantir
            <span className="block not-italic font-normal">for DTC marketing</span>
          </h1>

          <p className="mt-8 max-w-xl text-pretty text-lg sm:text-xl leading-relaxed text-muted-foreground">
            Custom AI systems, automation, and optimization across every ad platform.
            We build it, deploy it, and run it—you focus on scaling your brand.
          </p>

          <div className="mt-10 sm:mt-14 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center">
            <Button 
              size="lg" 
              className={`h-12 sm:h-14 px-8 sm:px-10 font-mono text-xs sm:text-sm uppercase tracking-wider transition-all btn-mobile-landscape ${
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
              className={`h-12 sm:h-14 px-8 sm:px-10 font-mono text-xs sm:text-sm uppercase tracking-wider transition-all btn-mobile-landscape ${
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
        <div className="mt-12 sm:mt-16 md:mt-20">
          <div className="text-center mb-8">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Supported Ad Platforms</h3>
          </div>
          <div className="grid grid-cols-4 gap-px border border-border bg-border sm:grid-cols-8">
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
              <div key={platform.name} className="bg-background p-6 sm:p-8 flex items-center justify-center">
                <Image
                  src={platform.logo}
                  alt={`${platform.name} logo`}
                  className={`object-contain filter grayscale ${
                    platform.name === 'Instagram' || platform.name === 'Pinterest' || platform.name === 'TikTok'
                      ? 'h-16 w-16 sm:h-20 sm:w-20'
                      : platform.name === 'X'
                      ? 'h-12 w-12 sm:h-16 sm:w-16'
                      : platform.name === 'Meta' || platform.name === 'Amazon' || platform.name === 'Vibe'
                      ? 'h-28 w-28 sm:h-32 sm:w-32'
                      : 'h-24 w-24 sm:h-28 sm:w-28'
                  }`}
                  width={128}
                  height={128}
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
