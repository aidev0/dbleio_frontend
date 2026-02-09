"use client";

import ReactMarkdown from 'react-markdown';
import { Edit3, Trash2, Send } from 'lucide-react';

interface TimelineCardAIMessageProps {
  content: string;
  processing?: boolean;
  isFDE?: boolean;
  visibility?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onPublish?: () => void;
}

export default function TimelineCardAIMessage({
  content,
  processing,
  isFDE,
  visibility,
  onEdit,
  onDelete,
  onPublish,
}: TimelineCardAIMessageProps) {
  if (processing) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-foreground" />
        <span className="font-mono text-xs text-muted-foreground">Thinking...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="prose prose-sm max-w-none font-sans text-sm leading-relaxed [&_p]:mb-2 [&_ul]:mb-2 [&_li]:mb-0.5">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
      {isFDE && (
        <div className="mt-3 flex items-center gap-2">
          {visibility === 'internal' && onPublish && (
            <button
              onClick={onPublish}
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <Send className="h-3 w-3" />
              Publish
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit3 className="h-3 w-3" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
