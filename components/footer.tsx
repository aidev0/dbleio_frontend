import Image from "next/image"

interface FooterProps {
  onContactUs?: () => void
}

export function Footer({ onContactUs }: FooterProps) {
  return (
    <footer className="py-6 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Desktop footer */}
        <div className="hidden sm:grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <a href="/" className="flex items-center gap-2 text-2xl font-light italic tracking-tight text-foreground">
              <Image src="/logo.png" alt="dble logo" width={28} height={28} className="h-7 w-7" />
              dble
            </a>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">
              The Palantir for marketing. Custom AI systems that run 24/7.
            </p>
            <div className="mt-4 flex gap-4">
              <a href="https://www.instagram.com/dble.io/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/60 hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://www.linkedin.com/company/dbleio/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/60 hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a href="https://x.com/dbleio" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/60 hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://www.tiktok.com/@dble.io" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/60 hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.71a8.21 8.21 0 0 0 4.76 1.52V6.69h-1z"/>
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Company</h4>
            <nav className="mt-6 flex flex-col gap-3">
              <a href="#platform" className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground">Platform</a>
              <a href="#pricing" className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground">Pricing</a>
              <button onClick={onContactUs} className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground text-left">Contact Us</button>
            </nav>
          </div>
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Legal</h4>
            <nav className="mt-6 flex flex-col gap-3">
              <a href="/privacy" className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground">Privacy</a>
              <a href="/terms" className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground">Terms</a>
            </nav>
          </div>
        </div>
        {/* Mobile footer - minimal */}
        <div className="sm:hidden text-center">
          <a href="/" className="flex items-center justify-center gap-2 text-lg font-light italic tracking-tight text-foreground">
            <Image src="/logo.png" alt="dble logo" width={22} height={22} className="h-[22px] w-[22px]" />
            dble
          </a>
          <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground/60">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
        <div className="mt-6 sm:mt-12 flex flex-col items-center justify-between gap-2 sm:gap-4 pt-4 sm:pt-8 md:flex-row">
          <p className="font-mono text-[10px] sm:text-xs text-muted-foreground/50">
            &copy; {new Date().getFullYear()} dble. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
