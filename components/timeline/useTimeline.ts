"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimelineEntry } from '@/app/app/developer/lib/types';
import {
  getTimelineEntries,
  createTimelineEntry,
  updateTimelineEntry,
  deleteTimelineEntry,
  publishTimelineEntry,
  toggleTodo,
} from '@/app/app/developer/lib/api';

interface UseTimelineOptions {
  workflowId: string;
  userRole: string;
  pollInterval?: number;
  active?: boolean;
}

export function useTimeline({ workflowId, userRole, pollInterval = 5000, active = true }: UseTimelineOptions) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const visibility = userRole === 'client' ? 'public' : undefined;

  const fetchEntries = useCallback(async () => {
    try {
      const data = await getTimelineEntries(workflowId, visibility);
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch timeline entries:', err);
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
    const entry = await createTimelineEntry(workflowId, {
      card_type: cardType,
      content,
      visibility: vis,
    });
    setEntries((prev) => [...prev, entry]);
    // Refresh to catch any AI response placeholders
    setTimeout(fetchEntries, 1000);
    return entry;
  }, [workflowId, fetchEntries]);

  const editEntry = useCallback(async (entryId: string, content: string) => {
    const updated = await updateTimelineEntry(workflowId, entryId, { content });
    setEntries((prev) => prev.map((e) => (e._id === entryId ? updated : e)));
    return updated;
  }, [workflowId]);

  const removeEntry = useCallback(async (entryId: string) => {
    await deleteTimelineEntry(workflowId, entryId);
    setEntries((prev) => prev.filter((e) => e._id !== entryId));
  }, [workflowId]);

  const publishEntry = useCallback(async (entryId: string) => {
    const updated = await publishTimelineEntry(workflowId, entryId);
    setEntries((prev) => prev.map((e) => (e._id === entryId ? updated : e)));
    return updated;
  }, [workflowId]);

  const toggleEntryTodo = useCallback(async (entryId: string, todoId: string, completed: boolean) => {
    const updated = await toggleTodo(workflowId, entryId, todoId, completed);
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
    toggleEntryTodo,
    refresh: fetchEntries,
  };
}
