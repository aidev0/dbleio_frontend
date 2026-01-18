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
    feature_type: 'video_generation',
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
        setFormData({ feature_type: 'video_generation', description: '' });
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
          <Link href="/" className="flex items-center gap-2 text-2xl font-light italic tracking-tight text-foreground transition-opacity hover:opacity-70">
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
        {/* Request New System - Top Card */}
        <div className="mb-16">
          <button onClick={() => setShowRequestForm(true)} className="group block w-full border border-border bg-background p-8 text-left transition-colors hover:border-foreground/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-light text-foreground">Request New System</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Have an idea for automation? Submit a request and we&apos;ll build it.
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">
                Request
                <ArrowRight className="h-4 w-4" />
              </div>
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

          {/* Placeholder for future apps */}
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
                  <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">What to automate</label>
                  <select
                    value={formData.feature_type}
                    onChange={e => setFormData({...formData, feature_type: e.target.value})}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                  >
                    <option value="video_generation">AI Video Ad Generation</option>
                    <option value="image_generation">AI Image Ad Generation</option>
                    <option value="creative_testing">Pre-Launch Creative Testing</option>
                    <option value="campaign_optimization">Live Campaign Optimization</option>
                    <option value="full_stack">Full Stack (All of the above)</option>
                    <option value="custom">Custom / Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">Additional Details</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    rows={3}
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
