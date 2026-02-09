"use client";

import { STAGE_LABELS } from '@/app/app/developer/lib/types';

interface TimelineCardStatusProps {
  content: string;
  statusData?: { stage: string; status: string; message: string };
  onViewGraph?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-foreground/5 text-foreground border-foreground/10',
  completed: 'bg-foreground/5 text-foreground border-foreground/10',
  failed: 'bg-foreground/5 text-muted-foreground border-foreground/10',
  waiting_approval: 'bg-foreground/5 text-foreground border-foreground/10',
  pending: 'bg-muted text-muted-foreground border-border',
};

export default function TimelineCardStatus({ content, statusData, onViewGraph }: TimelineCardStatusProps) {
  const stage = statusData?.stage || '';
  const status = statusData?.status || '';
  const label = STAGE_LABELS[stage] || stage;
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.pending;

  return (
    <div className="flex items-center gap-3">
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${colorClass}`}>
        {status === 'running' && (
          <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
        )}
        {label}
      </span>
      <span className="font-sans text-xs text-muted-foreground">{content}</span>
      {onViewGraph && (
        <button
          onClick={onViewGraph}
          className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          View Workflow
        </button>
      )}
    </div>
  );
}
