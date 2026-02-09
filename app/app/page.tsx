"use client";

import { useEffect, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from './video-simulation/auth/authContext';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

function ContactForm({ user, logout }: { user: { email: string }; logout: () => void }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now just show confirmation — backend contact endpoint can be added later
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <Image src="/logo.png" alt="dble" width={40} height={40} className="mx-auto mb-6 h-10 w-10" />
          <h1 className="mb-4 text-2xl font-light text-foreground">Thank you</h1>
          <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
            We received your request. Our team will reach out to <span className="text-foreground">{user.email}</span> to get you onboarded.
          </p>
          <button onClick={logout} className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image src="/logo.png" alt="dble" width={40} height={40} className="mx-auto mb-6 h-10 w-10" />
          <h1 className="mb-2 text-2xl font-light text-foreground">Request Access</h1>
          <p className="text-sm text-muted-foreground">
            You're signed in as <span className="text-foreground">{user.email}</span> but your account hasn't been onboarded yet. Fill out the form below and we'll get you set up.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">How can we help?</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
              className="w-full resize-none rounded border border-border bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={logout} className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
              Sign out
            </button>
            <Button type="submit" className="font-mono text-xs uppercase tracking-wider">
              Submit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AppHome() {
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

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

  // Auth gate: user not onboarded yet
  if (user && user.platform_access === false) {
    return <ContactForm user={user} logout={logout} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-8">
          <div className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">Workflows</div>
        </div>

        {/* Apps Grid — 2 cards */}
        <div className="grid gap-px border border-border bg-border md:grid-cols-2">
          {/* Development */}
          <Link href="/app/developer" className="group block bg-background p-8">
            <div className="mb-4 font-mono text-xs text-muted-foreground/40">01</div>
            <h2 className="text-xl font-light text-foreground">Developer</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              FDE-in-the-loop AI pipeline — spec intake, project setup, planning, development, code review, validation, deployment, QA, and client approval.
            </p>
            <div className="mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">
              Open
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          {/* Content Generation Workflow */}
          <div className="bg-background p-8">
            <div className="mb-4 font-mono text-xs text-muted-foreground/40">02</div>
            <h2 className="text-xl font-light text-foreground/50">Content Generator</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground/60">
              FDM-in-the-loop AI pipeline — brief intake, content strategy, creation, review, QA, and client approval for video, image, and copy.
            </p>
            <div className="mt-6 font-mono text-xs uppercase tracking-wider text-muted-foreground/40">
              Coming Soon
            </div>
          </div>
        </div>
      </main>
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
