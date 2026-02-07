"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import Image from "next/image"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-12">
          <a href="#" className="flex items-center gap-2 text-2xl font-light italic tracking-tight text-foreground">
            <Image src="/logo.png" alt="dble logo" width={28} height={28} className="h-7 w-7" />
            dble
          </a>
          <nav className="hidden items-center gap-8 md:flex" />

        </div>
        <div className="hidden items-center gap-4 md:flex">
          <Button 
            variant="ghost" 
            className={`font-mono text-xs uppercase tracking-wider transition-all ${
              hoveredButton === 'login' || (!hoveredButton)
                ? 'text-muted-foreground' 
                : 'text-muted-foreground/40'
            }`}
            onMouseEnter={() => setHoveredButton('login')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            Login
          </Button>
          <Button 
            className={`font-mono text-xs uppercase tracking-wider transition-all ${
              hoveredButton === 'contact' || (!hoveredButton)
                ? 'bg-foreground text-background' 
                : 'bg-muted text-muted-foreground'
            }`}
            onMouseEnter={() => setHoveredButton('contact')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            Contact Us
          </Button>
        </div>
        <button
          type="button"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5 text-foreground" />
          ) : (
            <Menu className="h-5 w-5 text-foreground" />
          )}
        </button>
      </div>
      {mobileMenuOpen && (
        <div className="border-t border-border/50 bg-background px-6 py-6 md:hidden">
          <div className="flex flex-col gap-2">
            <Button variant="ghost" className="w-full justify-center font-mono text-xs uppercase tracking-wider text-muted-foreground">Login</Button>
            <Button className="w-full font-mono text-xs uppercase tracking-wider">Contact Us</Button>
          </div>
        </div>
      )}
    </header>
  )
}
