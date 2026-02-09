"use client";

import { STAGE_LABELS } from '@/app/app/developer/lib/types';

interface TimelineCardStatusProps {
  content: string;
  statusData?: { stage: string; status: string; message: string };
  createdAt?: string;
  onViewGraph?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-foreground/5 text-foreground border-foreground/10',
  completed: 'bg-foreground/5 text-foreground border-foreground/10',
  failed: 'bg-foreground/5 text-muted-foreground border-foreground/10',
  waiting_approval: 'bg-foreground/5 text-foreground border-foreground/10',
  pending: 'bg-muted text-muted-foreground border-border',
};

function formatDateTime(dateStr: string): string {
  // Backend stores UTC via datetime.utcnow() but without 'Z' suffix — append it so
  // the browser correctly interprets as UTC and converts to client's local timezone.
  const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  const d = new Date(utcStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

export default function TimelineCardStatus({ content, statusData, createdAt, onViewGraph }: TimelineCardStatusProps) {
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
      {createdAt && (
        <span className="font-mono text-[10px] text-muted-foreground/50 whitespace-nowrap">{formatDateTime(createdAt)}</span>
      )}
      {onViewGraph && (
        <button
          onClick={onViewGraph}
          className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
        >
          View Graph
        </button>
      )}
    </div>
  );
}
