"use client";

import type { TimelineEntry } from '@/app/app/developer/lib/types';
import VisibilityBadge from './VisibilityBadge';
import TimelineCardUserMessage from './TimelineCardUserMessage';
import TimelineCardAIMessage from './TimelineCardAIMessage';
import TimelineCardFDEMessage from './TimelineCardFDEMessage';
import TimelineCardTask from './TimelineCardTask';
import TimelineCardApproval from './TimelineCardApproval';
import TimelineCardStatus from './TimelineCardStatus';

interface TimelineCardProps {
  entry: TimelineEntry;
  index: number;
  isFDE?: boolean;
  onEdit?: (entry: TimelineEntry) => void;
  onDelete?: (entryId: string) => void;
  onPublish?: (entryId: string) => void;
  onToggleTodo?: (entryId: string, todoId: string, completed: boolean) => void;
  onApprove?: (entryId: string, approved: boolean, note: string) => void;
  onViewGraph?: () => void;
}

const DOT_COLORS: Record<string, string> = {
  user_message: 'bg-foreground',
  ai_message: 'bg-foreground/40',
  fde_message: 'bg-foreground',
  task_card: 'bg-foreground/60',
  approval_card: 'bg-foreground/60',
  status_update: 'bg-muted-foreground',
};

const CARD_BG: Record<string, string> = {
  ai_message: 'bg-secondary/30',
  fde_message: 'bg-secondary/50',
  status_update: '',
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export default function TimelineCard({
  entry,
  index,
  isFDE = false,
  onEdit,
  onDelete,
  onPublish,
  onToggleTodo,
  onApprove,
  onViewGraph,
}: TimelineCardProps) {
  const isStatus = entry.card_type === 'status_update';
  const dotColor = DOT_COLORS[entry.card_type] || 'bg-foreground';
  const cardBg = CARD_BG[entry.card_type] || '';

  return (
    <div
      className="relative flex items-start"
      style={{
        animation: 'timeline-card-enter 0.4s ease-out both',
        animationDelay: `${Math.min(index * 50, 500)}ms`,
      }}
    >
      {/* Timeline dot */}
      <div className="absolute left-6 md:left-8 top-3 z-10">
        <div
          className={`h-3 w-3 rounded-full ${dotColor}`}
          style={{ animation: 'dot-appear 0.3s ease-out' }}
        />
      </div>

      {/* Card body */}
      <div className={`ml-[calc(1.5rem+1.5rem)] md:ml-[calc(2rem+1.5rem)] w-[calc(100%-4.5rem)] md:w-[80%] ${isStatus ? 'py-1.5' : 'py-3'}`}>
        {isStatus ? (
          <TimelineCardStatus
            content={entry.content}
            statusData={entry.status_data}
            onViewGraph={onViewGraph}
          />
        ) : (
          <div className={`rounded-lg ${cardBg} ${cardBg ? 'px-4 py-3' : ''}`}>
            {/* Header */}
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-foreground/70">
                {entry.author_name}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/50">
                {formatRelativeTime(entry.created_at)}
              </span>
              {isFDE && entry.visibility === 'internal' && <VisibilityBadge />}
              {entry.edited_by && (
                <span className="font-mono text-[9px] text-muted-foreground/40">(edited)</span>
              )}
            </div>

            {/* Content based on card_type */}
            {entry.card_type === 'user_message' && (
              <TimelineCardUserMessage content={entry.content} />
            )}
            {entry.card_type === 'ai_message' && (
              <TimelineCardAIMessage
                content={entry.content}
                processing={entry.processing}
                isFDE={isFDE}
                visibility={entry.visibility}
                onEdit={onEdit ? () => onEdit(entry) : undefined}
                onDelete={onDelete ? () => onDelete(entry._id) : undefined}
                onPublish={onPublish ? () => onPublish(entry._id) : undefined}
              />
            )}
            {entry.card_type === 'fde_message' && (
              <TimelineCardFDEMessage content={entry.content} />
            )}
            {entry.card_type === 'task_card' && (
              <TimelineCardTask
                content={entry.content}
                todos={entry.todos || []}
                onToggleTodo={onToggleTodo ? (todoId, completed) => onToggleTodo(entry._id, todoId, completed) : undefined}
              />
            )}
            {entry.card_type === 'approval_card' && (
              <TimelineCardApproval
                content={entry.content}
                approvalData={entry.approval_data}
                onApprove={onApprove ? (approved, note) => onApprove(entry._id, approved, note) : undefined}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
