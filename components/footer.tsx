import Image from "next/image"

export function Footer() {
  return (
    <footer className="py-6 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Desktop footer */}
        <div className="hidden sm:grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <span className="flex items-center gap-2 text-2xl font-light italic tracking-tight text-foreground">
              <Image src="/logo.png" alt="dble logo" width={28} height={28} className="h-7 w-7" />
              dble
            </span>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">
              The Palantir for DTC e-commerce marketing. Custom AI systems that run 24/7.
            </p>
          </div>
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Platform</h4>
            <nav className="mt-6 flex flex-col gap-3">
              <a href="#platform" className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground">How it works</a>
              <a href="#platform-features" className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground">Platform</a>
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
        {/* Mobile footer - minimal */}
        <div className="sm:hidden text-center">
          <span className="flex items-center justify-center gap-2 text-lg font-light italic tracking-tight text-foreground">
            <Image src="/logo.png" alt="dble logo" width={22} height={22} className="h-[22px] w-[22px]" />
            dble
          </span>
          <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground/60">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
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
