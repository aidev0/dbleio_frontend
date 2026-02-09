"use client";

import { STAGE_LABELS } from '@/app/app/developer/lib/types';

interface TimelineCardStatusProps {
  content: string;
  statusData?: { stage: string; status: string; message: string };
}

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-foreground/5 text-foreground border-foreground/10',
  completed: 'bg-foreground/5 text-foreground border-foreground/10',
  failed: 'bg-foreground/5 text-muted-foreground border-foreground/10',
  waiting_approval: 'bg-foreground/5 text-foreground border-foreground/10',
  pending: 'bg-muted text-muted-foreground border-border',
};

export default function TimelineCardStatus({ content, statusData }: TimelineCardStatusProps) {
  const stage = statusData?.stage || '';
  const status = statusData?.status || '';
  const label = STAGE_LABELS[stage] || stage;
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.pending;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider whitespace-nowrap ${colorClass}`}>
        {label}
      </span>
      <span className="font-sans text-xs text-muted-foreground">{content}</span>
    </div>
  );
}
