"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface HeaderProps {
  isAuthenticated?: boolean
  onLogin?: () => void
  onRequestAccess?: () => void
}

export function Header({ isAuthenticated, onLogin, onRequestAccess }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-12">
          <Link href="/" className="flex items-center gap-2 text-2xl font-light italic tracking-tight text-foreground">
            <Image src="/logo.png" alt="dble" width={28} height={28} className="h-7 w-7" />
            dble
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              How It Works
            </a>
            <a href="#platform" className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              Platform
            </a>
            <a href="#pricing" className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </a>
            <a href="#security" className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
              Security
            </a>
          </nav>
        </div>
        <div className="hidden items-center gap-4 md:flex">
          <Button variant="ghost" className="font-mono text-xs uppercase tracking-wider text-muted-foreground" onClick={onLogin}>
            LOGIN
          </Button>
          <Button className="font-mono text-xs uppercase tracking-wider" onClick={onRequestAccess}>
            CONTACT US
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
          <nav className="flex flex-col gap-4">
            <a href="#how-it-works" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">How It Works</a>
            <a href="#platform" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Platform</a>
            <a href="#pricing" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Pricing</a>
            <a href="#security" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Security</a>
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              <Button variant="ghost" className="w-full justify-center font-mono text-xs uppercase tracking-wider text-muted-foreground" onClick={onLogin}>LOGIN</Button>
              <Button className="w-full font-mono text-xs uppercase tracking-wider" onClick={onRequestAccess}>CONTACT US</Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
