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
    <div className="space-y-1.5">
      {/* Reactions row */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handleReaction('like')}
          disabled={submitting}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] transition-colors ${
            myReaction === 'like'
              ? 'bg-green-500/15 text-green-600'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <ThumbsUp className="h-3 w-3" />
          {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
        </button>
        <button
          onClick={() => handleReaction('dislike')}
          disabled={submitting}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] transition-colors ${
            myReaction === 'dislike'
              ? 'bg-red-500/15 text-red-600'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <ThumbsDown className="h-3 w-3" />
          {dislikeCount > 0 && <span className="tabular-nums">{dislikeCount}</span>}
        </button>
      </div>

      {/* Comment thread — inline */}
      {comments.length > 0 && (
        <div className="space-y-1">
          {comments.map((c) => (
            <div key={c._id} className="group flex items-start gap-1.5 text-[10px]">
              <span className="font-medium text-foreground/70 shrink-0">
                {c.user_name?.split(' ')[0] || 'User'}
                {c.source === 'client' && <span className="ml-0.5 text-[8px] text-orange-500 font-normal">client</span>}
              </span>
              <span className="text-muted-foreground flex-1 min-w-0">{c.comment}</span>
              <button
                onClick={() => handleDelete(c._id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-500 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Inline comment input */}
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleComment(); }}
          placeholder="Add a comment..."
          className="flex-1 h-6 rounded-full bg-muted/40 border-0 px-2.5 text-[10px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
        {commentText.trim() && (
          <button
            onClick={handleComment}
            disabled={submitting}
            className="shrink-0 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-foreground/80 disabled:opacity-40 transition-colors"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Regenerate — after comments */}
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Regenerate</span>
        </button>
      )}
    </div>
  );
}
