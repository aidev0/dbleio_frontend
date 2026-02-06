"use client";

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from './video-simulation/auth/authContext';
import { Button } from '@/components/ui/button';
import { Menu, X, ArrowRight } from 'lucide-react';
import Image from 'next/image';

function AppHome() {
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParams.get('code');
      if (!code) return;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/auth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const data = await response.json();
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }

        window.location.href = '/app';
      } catch (err) {
        console.error('Authentication error:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';
      }
    };

    handleAuthCallback();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feature-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          ...formData,
          user_id: user._id,
          email: user.email,
          name: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email
        })
      });
      if (response.ok) {
        setSubmitted(true);
        setFormData({ title: '', description: '' });
      }
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (searchParams.get('code')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-foreground"></div>
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Completing login...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-70 text-2xl font-light italic tracking-tight text-foreground">
            <Image src="/logo.png" alt="dble" width={28} height={28} className="h-7 w-7" />
            dble
          </Link>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-lg p-2 transition-colors hover:bg-secondary"
            >
              {showMenu ? (
                <X className="h-5 w-5 text-foreground" />
              ) : (
                <Menu className="h-5 w-5 text-foreground" />
              )}
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-border bg-background shadow-lg">
                  {user && (
                    <div className="border-b border-border px-4 py-3">
                      <p className="truncate font-mono text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  )}
                  <div className="py-1">
                    <Link href="/app" className="block px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => setShowMenu(false)}>
                      Dashboard
                    </Link>
                    <Link href="/app/video-simulation" className="block px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => setShowMenu(false)}>
                      Video Simulation
                    </Link>
                    <Link href="/app/video-simulation?tab=integrations" className="block px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => setShowMenu(false)}>
                      Integrations
                    </Link>
                    <button
                      onClick={() => { setShowRequestForm(true); setShowMenu(false); }}
                      className="block w-full px-4 py-2 text-left font-mono text-xs uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      Request New App
                    </button>
                  </div>
                  <div className="border-t border-border py-1">
                    <Link href="/" className="block px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => setShowMenu(false)}>
                      Home
                    </Link>
                    <Link href="/#pricing" className="block px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => setShowMenu(false)}>
                      Pricing
                    </Link>
                  </div>
                  <div className="border-t border-border py-1">
                    <button
                      onClick={() => { logout(); setShowMenu(false); }}
                      className="block w-full px-4 py-2 text-left font-mono text-xs uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-16">
        {/* Request Custom Feature - Top Card */}
        <div className="mb-12">
          <button onClick={() => setShowRequestForm(true)} className="group block w-full border border-border bg-background p-8 text-left transition-colors hover:border-foreground/50 md:w-1/2">
            <div className="mb-4 font-mono text-xs text-muted-foreground/40">+</div>
            <h2 className="text-xl font-light text-foreground">Request Custom Feature</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Have an idea for automation? Submit a request and we&apos;ll build it.
            </p>
            <div className="mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">
              Request
              <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        </div>

        {/* Platform Apps Section */}
        <div className="mb-8">
          <div className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">Platform Apps</div>
        </div>

        {/* Apps Grid */}
        <div className="grid gap-px border border-border bg-border md:grid-cols-2">
          {/* Video Simulation */}
          <Link href="/app/video-simulation" className="group block bg-background p-8">
            <div className="mb-4 font-mono text-xs text-muted-foreground/40">01</div>
            <h2 className="text-xl font-light text-foreground">Video Simulation</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Test video campaigns with AI persona simulations before spending on ads.
            </p>
            <div className="mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">
              Open
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          {/* Creative Generation - Coming Soon */}
          <div className="bg-background p-8">
            <div className="mb-4 font-mono text-xs text-muted-foreground/40">02</div>
            <h2 className="text-xl font-light text-foreground/50">Creative Generation</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground/60">
              AI-powered video and image ad generation across formats and platforms.
            </p>
            <div className="mt-6 font-mono text-xs uppercase tracking-wider text-muted-foreground/40">
              Coming Soon
            </div>
          </div>

          {/* Testing & Optimization - Coming Soon */}
          <div className="bg-background p-8">
            <div className="mb-4 font-mono text-xs text-muted-foreground/40">03</div>
            <h2 className="text-xl font-light text-foreground/50">Testing & Optimization</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground/60">
              Pre-launch creative scoring and live campaign optimization with AI.
            </p>
            <div className="mt-6 font-mono text-xs uppercase tracking-wider text-muted-foreground/40">
              Coming Soon
            </div>
          </div>

          {/* Campaign Management - Coming Soon */}
          <div className="bg-background p-8">
            <div className="mb-4 font-mono text-xs text-muted-foreground/40">04</div>
            <h2 className="text-xl font-light text-foreground/50">Campaign Management</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground/60">
              Cross-platform campaign launches and automated budget allocation.
            </p>
            <div className="mt-6 font-mono text-xs uppercase tracking-wider text-muted-foreground/40">
              Coming Soon
            </div>
          </div>

          {/* Analytics & Reporting - Coming Soon */}
          <div className="bg-background p-8">
            <div className="mb-4 font-mono text-xs text-muted-foreground/40">05</div>
            <h2 className="text-xl font-light text-foreground/50">Analytics & Reporting</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground/60">
              Unified dashboard with real-time performance analytics and custom reports.
            </p>
            <div className="mt-6 font-mono text-xs uppercase tracking-wider text-muted-foreground/40">
              Coming Soon
            </div>
          </div>

          {/* More Coming Soon Placeholder */}
          <div className="flex items-center justify-center bg-background p-8">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground/40">More coming soon</p>
          </div>
        </div>

        {/* Integrations Section */}
        <div className="mt-16 mb-8">
          <div className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">Integrations</div>
        </div>

        {/* Integrations Grid */}
        <div className="grid gap-px border border-border bg-border md:grid-cols-3">
          {/* Shopify */}
          <Link href="/app/video-simulation?tab=integrations" className="group block bg-background p-8">
            <div className="mb-4 flex items-center gap-3">
              <svg className="h-8 w-8" viewBox="0 0 109 124" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M95.8 23.8C95.7 23.1 95.1 22.7 94.6 22.7C94.1 22.7 85.3 22.5 85.3 22.5C85.3 22.5 77.2 14.6 76.4 13.8C75.6 13 74 13.2 73.5 13.4C73.5 13.4 71.4 14 68.1 15.1C67.5 13.1 66.6 10.7 65.2 8.3C61.1 1.3 55.1 -0.2 50.4 0C50.3 0 50.2 0 50.2 0C49.5 0 48.9 0.1 48.3 0.1C41.9 0.5 37.5 4.4 34.6 9.5C30.3 17.2 26.8 29.3 24.7 38.5L8.2 43.6C5.1 44.6 5 44.7 4.6 47.6C4.3 49.8 0 89.7 0 89.7L75.1 105.3L108.4 96.7C108.4 96.7 95.9 24.5 95.8 23.8ZM64.8 16.2C62.2 17 59.2 17.9 55.9 19L55.8 18.8C56.7 14.6 58.3 10.7 60.5 8C63.1 10 64.3 12.9 64.8 16.2ZM51.5 7.3C53.4 4.9 56.3 3.5 59.6 4.4C57.8 7.7 56.4 12 55.5 17.1C52.2 18.2 48.9 19.2 46.1 20.2C48.1 13.1 49.7 9.4 51.5 7.3ZM45.9 47.9C46.3 53.9 61.7 55.2 62.6 69.6C63.3 80.9 56.5 88.6 46.6 89.2C34.9 89.9 28.5 82.9 28.5 82.9L31.4 71.4C31.4 71.4 37.9 76.5 43.1 76.1C46.5 75.9 47.7 73.1 47.6 71.1C47.1 63.4 34.5 63.8 33.7 50.6C33 39.6 40.4 28.4 56.6 27.3C63 26.9 66.2 28.5 66.2 28.5L62 43.2C62 43.2 57.9 41.3 53 41.6C45.8 42.1 45.7 46.7 45.9 47.9Z" fill="currentColor" className="text-[#96BF48]"/>
              </svg>
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Connected</span>
            </div>
            <h2 className="text-xl font-light text-foreground">Shopify</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Sync products, orders, and customer data from your Shopify store.
            </p>
            <div className="mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">
              Manage
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          {/* Meta Ads - Coming Soon */}
          <div className="bg-background p-8">
            <div className="mb-4 flex items-center gap-3">
              <svg className="h-8 w-8 text-muted-foreground/40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
              </svg>
            </div>
            <h2 className="text-xl font-light text-foreground/50">Meta Ads</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground/60">
              Connect your Meta Business account to sync ad performance data.
            </p>
            <div className="mt-6 font-mono text-xs uppercase tracking-wider text-muted-foreground/40">
              Coming Soon
            </div>
          </div>

          {/* Google Ads - Coming Soon */}
          <div className="bg-background p-8">
            <div className="mb-4 flex items-center gap-3">
              <svg className="h-8 w-8 text-muted-foreground/40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              </svg>
            </div>
            <h2 className="text-xl font-light text-foreground/50">Google Ads</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground/60">
              Import campaign data and performance metrics from Google Ads.
            </p>
            <div className="mt-6 font-mono text-xs uppercase tracking-wider text-muted-foreground/40">
              Coming Soon
            </div>
          </div>

          {/* TikTok Ads - Coming Soon */}
          <div className="bg-background p-8">
            <div className="mb-4 flex items-center gap-3">
              <svg className="h-8 w-8 text-muted-foreground/40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </div>
            <h2 className="text-xl font-light text-foreground/50">TikTok Ads</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground/60">
              Sync TikTok ad campaigns, creatives, and performance analytics.
            </p>
            <div className="mt-6 font-mono text-xs uppercase tracking-wider text-muted-foreground/40">
              Coming Soon
            </div>
          </div>

          {/* Amazon Ads - Coming Soon */}
          <div className="bg-background p-8">
            <div className="mb-4 flex items-center gap-3">
              <svg className="h-8 w-8 text-muted-foreground/40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.493.124.104.17.09.336-.04.495-.106.13-.242.275-.403.435-1.57 1.508-3.5 2.69-5.79 3.55-2.29.86-4.6 1.29-6.93 1.29-2.26 0-4.47-.39-6.64-1.18-2.17-.78-4.07-1.87-5.69-3.27-.135-.11-.17-.25-.1-.42zm6.628-9.545c0-1.38.37-2.52 1.1-3.42s1.67-1.53 2.82-1.89c1.04-.33 2.3-.55 3.79-.65l.96-.07v-.88c0-.71-.06-1.22-.19-1.53-.2-.49-.6-.74-1.2-.74-.57 0-.97.18-1.2.54-.17.27-.28.75-.33 1.42l-3.48-.18c.1-1.35.54-2.38 1.33-3.09.94-.84 2.36-1.26 4.25-1.26 1.46 0 2.67.34 3.64 1.03.78.56 1.27 1.23 1.45 2 .12.5.18 1.28.18 2.32l-.05 3.43c0 1.14.03 1.94.1 2.42.1.67.32 1.23.67 1.68H14.63a5.7 5.7 0 0 1-.35-1.08c-.63.43-1.26.76-1.87 1a5.88 5.88 0 0 1-2.1.35c-1.23 0-2.23-.38-3-1.13-.77-.76-1.16-1.74-1.16-2.95zm4.94.55c0 .53.14.97.42 1.32.32.4.76.59 1.33.59.38 0 .78-.1 1.18-.31.52-.27.86-.63 1.04-1.1.14-.37.21-1.03.21-1.97v-.49c-.85.08-1.52.2-2.02.35-1.1.34-1.64.91-1.64 1.6z"/>
              </svg>
            </div>
            <h2 className="text-xl font-light text-foreground/50">Amazon Ads</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground/60">
              Connect Amazon Advertising to track sponsored product performance.
            </p>
            <div className="mt-6 font-mono text-xs uppercase tracking-wider text-muted-foreground/40">
              Coming Soon
            </div>
          </div>

          {/* More Integrations Placeholder */}
          <div className="flex items-center justify-center bg-background p-8">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground/40">More coming soon</p>
          </div>
        </div>
      </main>

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowRequestForm(false)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6" onClick={e => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-light italic tracking-tight">Request a System</h2>
              <button onClick={() => setShowRequestForm(false)} className="text-2xl text-muted-foreground hover:text-foreground">&times;</button>
            </div>

            {submitted ? (
              <div className="py-8 text-center">
                <p className="mb-2 text-lg font-medium">Request Submitted</p>
                <p className="mb-4 text-sm text-muted-foreground">We&apos;ll be in touch within 24 hours.</p>
                <button onClick={() => { setSubmitted(false); setShowRequestForm(false); }} className="text-sm text-muted-foreground hover:text-foreground">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="What do you want to build?"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">Details</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe your idea, goals, and any specific requirements..."
                    rows={4}
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full font-mono text-xs uppercase tracking-wider">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground"></div>
      </div>
    }>
      <AppHome />
    </Suspense>
  );
}
