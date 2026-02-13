"use client";

import { Sparkles } from 'lucide-react';

export default function AIGenerationPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-light">AI Generation</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-powered content generation, analysis, and optimization tools.
          </p>
        </div>
        <div className="rounded-lg border border-border p-12 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            AI Generation hub coming soon
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate content, run simulations, and optimize campaigns with AI.
          </p>
        </div>
      </main>
    </div>
  );
}
