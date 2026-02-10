"use client";

import type { TimelineEntry } from '@/app/app/developer/lib/types';
import TimelineCard from './TimelineCard';
import TimelineInput from './TimelineInput';

interface TimelineContainerProps {
  entries: TimelineEntry[];
  isFDE?: boolean;
  onSubmit?: (content: string) => void;
  onEdit?: (entry: TimelineEntry) => void;
  onDelete?: (entryId: string) => void;
  onPublish?: (entryId: string) => void;
  onToggleTodo?: (entryId: string, todoId: string, completed: boolean) => void;
  onApprove?: (entryId: string, approved: boolean, note: string) => void;
  inputPlaceholder?: string;
  loading?: boolean;
  header?: React.ReactNode;
}

export default function TimelineContainer({
  entries,
  isFDE = false,
  onSubmit,
  onEdit,
  onDelete,
  onPublish,
  onToggleTodo,
  onApprove,
  inputPlaceholder = "Type a message...",
  loading = false,
  header,
}: TimelineContainerProps) {
  return (
    <div className="relative w-full py-4 md:py-12">
      {/* Vertical timeline line at 1/4 */}
      <div className="hidden md:block absolute left-[25%] top-0 bottom-0 w-px bg-border" />

      {/* Optional header (e.g. RequestCard) within the timeline context */}
      {header}

      {/* Loading state */}
      {loading && entries.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-b-2 border-foreground" />
            <span className="font-mono text-xs text-muted-foreground">Loading...</span>
          </div>
        </div>
      )}

      {/* Empty state — just whitespace so timeline still feels connected */}
      {!loading && entries.length === 0 && (
        <div className="py-8" />
      )}

      {/* Timeline cards */}
      {entries.map((entry, index) => (
        <TimelineCard
          key={entry._id}
          entry={entry}
          index={index}
          isFDE={isFDE}
          onEdit={onEdit}
          onDelete={onDelete}
          onPublish={onPublish}
          onToggleTodo={onToggleTodo}
          onApprove={onApprove}
        />
      ))}

      {/* Input at the bottom */}
      {onSubmit && (
        <TimelineInput onSubmit={onSubmit} placeholder={inputPlaceholder} />
      )}
    </div>
  );
}
