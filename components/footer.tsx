import Image from "next/image"

export function Footer() {
  return (
    <footer className="border-t border-border py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="dble" width={28} height={28} className="h-7 w-7" />
              <span className="text-2xl font-light italic tracking-tight text-foreground">dble</span>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              The operating system for AI marketing. Production systems that run 24/7.
            </p>
          </div>
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Platform</h4>
            <nav className="mt-6 flex flex-col gap-3">
              <a href="#platform" className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground">How it works</a>
              <a href="#capabilities" className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground">Capabilities</a>
              <a href="#pricing" className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground">Pricing</a>
              <a href="#security" className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground">Security</a>
            </nav>
          </div>
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Legal</h4>
            <nav className="mt-6 flex flex-col gap-3">
              <a href="#" className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground">Privacy</a>
              <a href="#" className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground">Terms</a>
              <a href="#" className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground">Security</a>
            </nav>
          </div>
        </div>
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="font-mono text-xs text-muted-foreground/50">
            &copy; {new Date().getFullYear()} dble. All rights reserved.
          </p>
          <p className="font-mono text-xs text-muted-foreground/50">
            SOC 2 Type II Certified
          </p>
        </div>
      </div>
    </footer>
  )
}
