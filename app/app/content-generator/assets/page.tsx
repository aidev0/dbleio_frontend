"use client";

import { Image } from 'lucide-react';

export default function AssetsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-light">Assets</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Imported and AI-generated assets across all workflows.
          </p>
        </div>
        <div className="rounded-lg border border-border p-12 text-center">
          <Image className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Asset library coming soon
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Videos, images, voiceovers, and other generated content will appear here.
          </p>
        </div>
      </main>
    </div>
  );
}
