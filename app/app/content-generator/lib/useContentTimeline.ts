"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ContentTimelineEntry } from './types';
import {
  getContentTimeline,
  createContentTimelineEntry,
  updateContentTimelineEntry,
  deleteContentTimelineEntry,
  publishContentTimelineEntry,
} from './api';

// Re-export ContentTimelineEntry fields compatible with developer TimelineEntry
// so we can pass them to the shared TimelineContainer
// The TimelineContainer expects { _id, card_type, content, author_id, author_role, visibility, ... }

interface UseContentTimelineOptions {
  workflowId: string;
  userRole: string;
  pollInterval?: number;
  active?: boolean;
}

export function useContentTimeline({ workflowId, userRole, pollInterval = 5000, active = true }: UseContentTimelineOptions) {
  const [entries, setEntries] = useState<ContentTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const visibility = userRole === 'client' ? 'public' : undefined;

  const fetchEntries = useCallback(async () => {
    try {
      const data = await getContentTimeline(workflowId, visibility);
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch content timeline entries:', err);
    } finally {
      setLoading(false);
    }
  }, [workflowId, visibility]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchEntries();
  }, [fetchEntries]);

  // Polling
  useEffect(() => {
    if (!active) return;
    pollRef.current = setInterval(fetchEntries, pollInterval);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchEntries, pollInterval, active]);

  const addEntry = useCallback(async (content: string, cardType: string = 'user_message', vis: string = 'public') => {
    const entry = await createContentTimelineEntry(workflowId, {
      card_type: cardType,
      content,
      visibility: vis,
    });
    setEntries((prev) => [...prev, entry]);
    setTimeout(fetchEntries, 1000);
    return entry;
  }, [workflowId, fetchEntries]);

  const editEntry = useCallback(async (entryId: string, content: string) => {
    const updated = await updateContentTimelineEntry(workflowId, entryId, { content });
    setEntries((prev) => prev.map((e) => (e._id === entryId ? updated : e)));
    return updated;
  }, [workflowId]);

  const removeEntry = useCallback(async (entryId: string) => {
    await deleteContentTimelineEntry(workflowId, entryId);
    setEntries((prev) => prev.filter((e) => e._id !== entryId));
  }, [workflowId]);

  const publishEntry = useCallback(async (entryId: string) => {
    const updated = await publishContentTimelineEntry(workflowId, entryId);
    setEntries((prev) => prev.map((e) => (e._id === entryId ? updated : e)));
    return updated;
  }, [workflowId]);

  return {
    entries,
    loading,
    addEntry,
    editEntry,
    removeEntry,
    publishEntry,
    refresh: fetchEntries,
  };
}
