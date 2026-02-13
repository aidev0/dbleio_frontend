"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckSquare, Clock } from 'lucide-react';
import { getContentWorkflows } from '../lib/api';
import { CONTENT_STAGE_MAP, CONTENT_STAGE_LABELS } from '../lib/types';
import type { ContentWorkflow } from '../lib/types';

export default function ReviewsPage() {
  const [workflows, setWorkflows] = useState<ContentWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const all = await getContentWorkflows();
        // Filter to workflows at a human review stage
        const pending = all.filter(w => {
          const stageDef = CONTENT_STAGE_MAP[w.current_stage];
          return stageDef && stageDef.stageType === 'human' && w.status === 'running';
        });
        setWorkflows(pending);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-light">Pending Reviews</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Workflows waiting for human review (Brand QA, FDM Review, etc.).
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-foreground" />
          </div>
        )}

        {!loading && workflows.length === 0 && (
          <div className="rounded-lg border border-border p-12 text-center">
            <CheckSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              No pending reviews
            </p>
          </div>
        )}

        {!loading && (
          <div className="space-y-2">
            {workflows.map(w => (
              <Link
                key={w._id}
                href={`/app/content-generator/content/${w._id}`}
                className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 transition-all hover:border-foreground/20"
              >
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{w.title}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    Awaiting: {CONTENT_STAGE_LABELS[w.current_stage] || w.current_stage}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
