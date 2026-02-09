"use client";

import type { TimelineEntry } from '@/app/app/developer/lib/types';
import { Pencil, Trash2 } from 'lucide-react';
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
  ai_message: 'bg-muted/30',
  status_update: '',
};

const AVATAR_STYLES: Record<string, string> = {
  user_message: 'bg-foreground text-background',
  ai_message: 'bg-muted-foreground/20 text-muted-foreground',
  fde_message: 'bg-foreground text-background',
  task_card: 'bg-muted-foreground/20 text-muted-foreground',
  approval_card: 'bg-muted-foreground/20 text-muted-foreground',
  status_update: 'bg-muted-foreground/20 text-muted-foreground',
};

function displayName(authorName: string): string {
  if (authorName.includes('@')) {
    const local = authorName.split('@')[0];
    return local.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return authorName;
}

function getInitials(authorName: string): string {
  const name = displayName(authorName);
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

function formatRelativeTime(dateStr: string): string {
  const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  const date = new Date(utcStr);
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

function formatDateTime(dateStr: string): string {
  const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  const d = new Date(utcStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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
      <div className={`ml-[calc(1.5rem+1.5rem)] md:ml-[calc(2rem+1.5rem)] w-[calc(100%-4.5rem)] md:w-[80%] py-2`}>
        {isStatus ? (
          /* Status update — clean minimal card */
          <div className="rounded-lg border border-border px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">
                {getInitials(entry.author_name)}
              </div>
              <span className="text-xs font-medium text-foreground">
                {displayName(entry.author_name)}
              </span>
              <span className="font-mono text-[9px] text-muted-foreground">
                {formatDateTime(entry.created_at)}
              </span>
            </div>
            <TimelineCardStatus
              content={entry.content}
              statusData={entry.status_data}
            />
          </div>
        ) : (
          /* Message cards — full avatar header */
          <div className={`group rounded-lg border border-border px-5 py-4 ${cardBg}`}>
            {/* Header with avatar */}
            <div className="mb-3 flex items-center gap-2.5">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${AVATAR_STYLES[entry.card_type] || 'bg-foreground text-background'}`}>
                {getInitials(entry.author_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {displayName(entry.author_name)}
                  </span>
                  {isFDE && entry.visibility === 'internal' && <VisibilityBadge />}
                  {entry.edited_by && (
                    <span className="font-mono text-[9px] text-muted-foreground/40">(edited)</span>
                  )}
                  {/* Edit/Delete — show on hover for editable messages */}
                  {(onEdit || onDelete) && (entry.card_type === 'fde_message' || entry.card_type === 'user_message') && (
                    <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEdit && (
                        <button onClick={() => onEdit(entry)} className="rounded p-1 text-muted-foreground/40 hover:text-foreground transition-colors">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(entry._id)} className="rounded p-1 text-muted-foreground/40 hover:text-foreground transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <span className="font-mono text-[9px] text-muted-foreground">
                  {formatRelativeTime(entry.created_at)}
                </span>
              </div>
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
