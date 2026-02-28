"use client";

import { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, RefreshCw, ArrowUp, X } from 'lucide-react';
import { submitFeedback, getItemFeedback, deleteFeedback } from '../lib/api';
import type { FeedbackItem } from '../lib/types';

interface FeedbackBarProps {
  workflowId: string;
  contentId?: string;
  stageKey: string;
  itemType: string;
  itemId: string;
  onRegenerate?: () => void;
}

export default function FeedbackBar({
  workflowId,
  contentId,
  stageKey,
  itemType,
  itemId,
  onRegenerate,
}: FeedbackBarProps) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [myReaction, setMyReaction] = useState<'like' | 'dislike' | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadFeedback = useCallback(async () => {
    const items = await getItemFeedback(workflowId, stageKey, itemId);
    setFeedback(items);
    let likes = 0, dislikes = 0;
    for (const f of items) {
      if (f.reaction === 'like' && !f.comment) likes++;
      if (f.reaction === 'dislike' && !f.comment) dislikes++;
    }
    setLikeCount(likes);
    setDislikeCount(dislikes);
  }, [workflowId, stageKey, itemId]);

  useEffect(() => { loadFeedback(); }, [loadFeedback]);

  const handleReaction = async (reaction: 'like' | 'dislike') => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await submitFeedback(workflowId, {
        content_id: contentId,
        stage_key: stageKey,
        item_type: itemType,
        item_id: itemId,
        reaction,
      });
      if ((result as { action?: string }).action === 'removed') {
        setMyReaction(null);
      } else {
        setMyReaction(reaction);
      }
      await loadFeedback();
    } catch (err) {
      console.error('Feedback error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await submitFeedback(workflowId, {
        content_id: contentId,
        stage_key: stageKey,
        item_type: itemType,
        item_id: itemId,
        comment: commentText.trim(),
      });
      setCommentText('');
      await loadFeedback();
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (feedbackId: string) => {
    try {
      await deleteFeedback(workflowId, feedbackId);
      await loadFeedback();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const comments = feedback.filter(f => f.comment);

  return (
    <div className="mt-3 border-t border-border/40 pt-3 space-y-4">
      {/* Reactions & Actions Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleReaction('like')}
            disabled={submitting}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all ${
              myReaction === 'like'
                ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            <span className="tabular-nums">{likeCount}</span>
          </button>
          <button
            onClick={() => handleReaction('dislike')}
            disabled={submitting}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all ${
              myReaction === 'dislike'
                ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
            }`}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            <span className="tabular-nums">{dislikeCount}</span>
          </button>
        </div>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium bg-foreground/5 text-muted-foreground hover:bg-foreground hover:text-background transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Regenerate</span>
          </button>
        )}
      </div>

      {/* Comment Thread */}
      {comments.length > 0 && (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
          {comments.map((c) => {
            const initials = c.user_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
            return (
              <div key={c._id} className="group flex items-start gap-2.5">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  c.source === 'client' ? 'bg-orange-500 text-white' : 'bg-foreground/10 text-foreground/70'
                }`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-foreground/80">
                      {c.user_name || 'User'}
                      {c.source === 'client' && <span className="ml-1.5 text-[9px] text-orange-500 font-normal uppercase tracking-wider">Client</span>}
                    </span>
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="rounded-lg rounded-tl-none bg-muted/30 px-2.5 py-1.5 text-xs text-foreground/90 leading-relaxed">
                    {c.comment}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Chat Input */}
      <div className="relative group">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleComment(); }}
          placeholder="Send a message..."
          className="w-full h-9 rounded-lg bg-muted/40 border border-transparent px-3 pr-10 text-xs text-foreground placeholder:text-muted-foreground/50 transition-all focus:bg-muted/60 focus:border-border focus:outline-none"
        />
        <button
          onClick={handleComment}
          disabled={!commentText.trim() || submitting}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center transition-all ${
            commentText.trim() 
              ? 'bg-foreground text-background hover:scale-105 active:scale-95' 
              : 'text-muted-foreground/30'
          }`}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

