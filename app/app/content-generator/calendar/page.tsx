"use client";

import { CalendarDays } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-light">Content Calendar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Schedule and plan your content delivery across channels.
          </p>
        </div>
        <div className="rounded-lg border border-border p-12 text-center">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Calendar view coming soon
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Scheduled posts, deadlines, and review dates will appear here.
          </p>
        </div>
      </main>
    </div>
  );
}
