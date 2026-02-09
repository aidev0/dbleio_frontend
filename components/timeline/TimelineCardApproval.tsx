"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface TimelineCardApprovalProps {
  content: string;
  approvalData?: { type: string; approved?: boolean; note?: string };
  onApprove?: (approved: boolean, note: string) => void;
}

export default function TimelineCardApproval({ content, approvalData, onApprove }: TimelineCardApprovalProps) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isDecided = approvalData?.approved !== undefined && approvalData.approved !== null;

  const handleDecision = async (approved: boolean) => {
    if (!onApprove) return;
    setSubmitting(true);
    try {
      onApprove(approved, note);
    } finally {
      setSubmitting(false);
    }
  };

  if (isDecided) {
    return (
      <div>
        <p className="mb-2 font-sans text-sm">{content}</p>
        <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
          approvalData?.approved
            ? 'bg-foreground/5 text-foreground'
            : 'bg-foreground/5 text-muted-foreground'
        }`}>
          {approvalData?.approved ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          {approvalData?.approved ? 'Approved' : 'Rejected'}
        </div>
        {approvalData?.note && (
          <p className="mt-2 font-sans text-xs text-muted-foreground">{approvalData.note}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 font-sans text-sm">{content}</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)..."
        rows={2}
        className="mb-3 w-full resize-none rounded border border-border bg-transparent px-3 py-2 font-sans text-xs outline-none focus:border-foreground"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => handleDecision(true)}
          disabled={submitting}
          className="h-7 font-mono text-[10px] uppercase tracking-wider"
        >
          <Check className="mr-1 h-3 w-3" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDecision(false)}
          disabled={submitting}
          className="h-7 font-mono text-[10px] uppercase tracking-wider"
        >
          <X className="mr-1 h-3 w-3" />
          Reject
        </Button>
      </div>
    </div>
  );
}
