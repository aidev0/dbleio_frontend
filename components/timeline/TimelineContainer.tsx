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
  onViewGraph?: () => void;
  inputPlaceholder?: string;
  loading?: boolean;
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
  onViewGraph,
  inputPlaceholder = "Type a message...",
  loading = false,
}: TimelineContainerProps) {
  return (
    <div className="relative mx-auto w-full max-w-3xl py-8 md:py-12">
      {/* The vertical timeline line */}
      <div className="absolute left-[calc(1.5rem+0.3125rem)] md:left-[calc(2rem+0.3125rem)] top-0 bottom-0 w-px bg-border" />

      {/* Loading state */}
      {loading && entries.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-b-2 border-foreground" />
            <span className="font-mono text-xs text-muted-foreground">Loading...</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <p className="font-mono text-xs text-muted-foreground">No entries yet</p>
        </div>
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
          onViewGraph={onViewGraph}
        />
      ))}

      {/* Input at the bottom */}
      {onSubmit && (
        <TimelineInput onSubmit={onSubmit} placeholder={inputPlaceholder} />
      )}
    </div>
  );
}
