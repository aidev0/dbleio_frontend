"use client";

import type { ContentWorkflowStatus, NodeStatus } from '../lib/types';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-foreground/5 text-foreground border-foreground/10',
  waiting_approval: 'bg-foreground/5 text-foreground border-foreground/10',
  completed: 'bg-foreground/5 text-foreground border-foreground/10',
  failed: 'bg-foreground/5 text-muted-foreground border-foreground/10',
  cancelled: 'bg-muted text-muted-foreground line-through',
  paused: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Under Progress',
  running: 'Running',
  waiting_approval: 'Awaiting Approval',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  paused: 'Paused',
};

export default function ContentWorkflowStatusBadge({
  status,
}: {
  status: ContentWorkflowStatus | NodeStatus | string;
}) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${style}`}
    >
      {status === 'running' && (
        <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
      )}
      {label}
    </span>
  );
}
