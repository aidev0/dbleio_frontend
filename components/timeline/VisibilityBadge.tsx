"use client";

import { Lock } from 'lucide-react';

export default function VisibilityBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
      <Lock className="h-2.5 w-2.5" />
      Internal
    </span>
  );
}
