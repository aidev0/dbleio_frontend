"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ApprovalPanelProps {
  stageLabel: string;
  onApprove: (note?: string) => Promise<void>;
  onReject: (note?: string) => Promise<void>;
  loading?: boolean;
}

export default function ApprovalPanel({ stageLabel, onApprove, onReject, loading }: ApprovalPanelProps) {
  const [note, setNote] = useState('');

  return (
    <div className="rounded-lg border border-border bg-background p-4 space-y-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Approval Required — {stageLabel}
      </div>
      <Textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Optional note..."
        rows={2}
        className="text-sm"
      />
      <div className="flex items-center gap-2">
        <Button
          onClick={() => onApprove(note || undefined)}
          disabled={loading}
          size="sm"
          className="gap-1"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Approve
        </Button>
        <Button
          onClick={() => onReject(note || undefined)}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-1 text-destructive hover:text-destructive"
        >
          <XCircle className="h-3.5 w-3.5" />
          Reject
        </Button>
      </div>
    </div>
  );
}
