"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCustomWorkflows } from './lib/api';
import type { CustomWorkflow } from './lib/types';

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '';
  const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  const d = new Date(utcStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'border-border text-muted-foreground',
  active: 'border-foreground text-foreground',
  archived: 'border-border text-muted-foreground/50',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Under Development',
  archived: 'Archived',
};

export default function CustomWorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<CustomWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const wfs = await getCustomWorkflows();
      setWorkflows(wfs);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6">
      <div className="relative py-8 md:py-12">
        {/* Vertical timeline line */}
        <div className="absolute left-[1.875rem] md:left-[2.375rem] top-0 bottom-0 w-px bg-border" />

        <div className="relative">
          {/* Section label */}
          <div className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Your Custom Workflows
          </div>

          {/* Loading */}
          {loading && workflows.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-b-2 border-foreground" />
                <span className="font-mono text-xs text-muted-foreground">Loading workflows...</span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && workflows.length === 0 && (
            <div className="ml-[calc(1.5rem+1.5rem)] md:ml-[calc(2rem+1.5rem)] py-16">
              <p className="text-sm text-muted-foreground">
                No custom workflows yet. Workflows built through the Developer pipeline will appear here.
              </p>
            </div>
          )}

          {/* Workflow list */}
          {workflows.map((wf, index) => (
            <div
              key={wf._id}
              className="relative flex items-start cursor-pointer"
              style={{
                animation: 'timeline-card-enter 0.4s ease-out both',
                animationDelay: `${Math.min(index * 50, 500)}ms`,
              }}
              onClick={() => router.push(`/app/workflows/${wf._id}`)}
            >
              <div className="absolute left-6 md:left-8 top-4 z-10">
                <div
                  className="h-3 w-3 rounded-full bg-foreground"
                  style={{ animation: 'dot-appear 0.3s ease-out' }}
                />
              </div>
              <div className="ml-[calc(1.5rem+1.5rem)] md:ml-[calc(2rem+1.5rem)] w-[calc(100%-4.5rem)] md:w-[90%] py-3">
                <div className="group rounded-lg border border-border bg-background p-5 transition-all hover:border-foreground/20 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium">{wf.title}</h3>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${STATUS_STYLES[wf.status] || STATUS_STYLES.draft}`}>
                      {STATUS_LABELS[wf.status] || wf.status}
                    </span>
                  </div>
                  {/* Description */}
                  {wf.description && (
                    <div className="mt-2">
                      <p className={`text-sm text-muted-foreground leading-relaxed ${expandedId === wf._id ? '' : 'line-clamp-3'}`}>
                        {wf.description}
                      </p>
                      {wf.description.length > 200 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === wf._id ? null : wf._id); }}
                          className="mt-1 font-mono text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors"
                        >
                          {expandedId === wf._id ? 'Show less' : 'Show more...'}
                        </button>
                      )}
                    </div>
                  )}
                  {/* Timestamps */}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground/50">
                    <span>Created {formatShortDate(wf.created_at)}</span>
                    {wf.updated_at && wf.updated_at !== wf.created_at && (
                      <span>Updated {formatShortDate(wf.updated_at)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
