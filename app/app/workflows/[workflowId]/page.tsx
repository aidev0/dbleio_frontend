"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, ArrowRight, CheckCircle2, Circle, Loader2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TimelineContainer from '@/components/timeline/TimelineContainer';
import {
  getCustomWorkflow,
  getCustomWorkflowGraph,
  getCustomTimelineEntries,
  createCustomTimelineEntry,
  updateCustomTimelineEntry,
  deleteCustomTimelineEntry,
  publishCustomTimelineEntry,
  toggleCustomTodo,
} from '../lib/api';
import { getUserMe, getWorkflow as getDevWorkflow, getWorkflowNodes as getDevNodes, getSpecification } from '../../developer/lib/api';
import { STAGE_LABELS } from '../../developer/lib/types';
import type { Workflow as DevWorkflow, WorkflowNode as DevWorkflowNode, Specification } from '../../developer/lib/types';
import type { CustomWorkflow, CustomGraphNode, CustomGraphEdge, TimelineEntry } from '../lib/types';

type ContentMode = 'timeline' | 'graph';

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

const NODE_STATUS_ICON: Record<string, typeof Circle> = {
  completed: CheckCircle2,
  running: Loader2,
  failed: XCircle,
  waiting_approval: Clock,
  pending: Circle,
};

function DevJourneyCard({ devWorkflow, devNodes }: { devWorkflow: DevWorkflow; devNodes: DevWorkflowNode[] }) {
  const completedCount = devNodes.filter((n) => n.status === 'completed').length;
  const totalCount = devNodes.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Developer Journey</div>
          <h3 className="text-sm font-medium">{devWorkflow.title}</h3>
        </div>
        <Link
          href={`/app/developer/${devWorkflow._id}`}
          className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          View
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[9px] text-muted-foreground">{completedCount}/{totalCount} stages</span>
          <span className="font-mono text-[9px] text-muted-foreground">{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Stage list */}
      <div className="space-y-1">
        {devNodes
          .sort((a, b) => a.stage_index - b.stage_index)
          .map((node) => {
            const Icon = NODE_STATUS_ICON[node.status] || Circle;
            const isCurrent = devWorkflow.current_stage === node.stage_name;
            return (
              <div
                key={node._id}
                className={`flex items-center gap-2 py-0.5 ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                <Icon className={`h-3 w-3 shrink-0 ${node.status === 'running' ? 'animate-spin' : ''} ${node.status === 'completed' ? 'text-foreground' : ''} ${node.status === 'failed' ? 'text-destructive' : ''}`} />
                <span className={`font-mono text-[10px] ${isCurrent ? 'font-semibold' : ''}`}>
                  {STAGE_LABELS[node.stage_name] || node.stage_name}
                </span>
                {isCurrent && (
                  <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-foreground/60">Current</span>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

function RequestMessageCard({ spec, creatorName, createdAt }: { spec: Specification; creatorName: string; createdAt?: string }) {
  const formattedDate = createdAt
    ? new Date(createdAt.endsWith('Z') ? createdAt : createdAt + 'Z').toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : '';

  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-semibold">
          {creatorName.trim().split(/\s+/).length >= 2
            ? (creatorName.trim().split(/\s+/)[0].charAt(0) + creatorName.trim().split(/\s+/).slice(-1)[0].charAt(0)).toUpperCase()
            : creatorName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-medium">{creatorName}</div>
          {formattedDate && (
            <div className="font-mono text-[9px] text-muted-foreground">{formattedDate}</div>
          )}
        </div>
      </div>
      <h4 className="text-sm font-semibold mb-1">{spec.title}</h4>
      <p className="text-sm leading-relaxed text-muted-foreground">{spec.spec_text}</p>
      {spec.acceptance_criteria && (
        <div className="mt-3 rounded border border-border bg-muted/30 px-3 py-2">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Acceptance Criteria</div>
          <p className="text-xs text-muted-foreground leading-relaxed">{spec.acceptance_criteria}</p>
        </div>
      )}
    </div>
  );
}

export default function CustomWorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.workflowId as string;

  const [workflow, setWorkflow] = useState<CustomWorkflow | null>(null);
  const [graphNodes, setGraphNodes] = useState<CustomGraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<CustomGraphEdge[]>([]);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [contentMode, setContentMode] = useState<ContentMode>('timeline');
  const [userRole, setUserRole] = useState<string>('client');
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimelineEntry | null>(null);
  const [editContent, setEditContent] = useState('');

  // Dev workflow journey
  const [devWorkflow, setDevWorkflow] = useState<DevWorkflow | null>(null);
  const [devNodes, setDevNodes] = useState<DevWorkflowNode[]>([]);
  const [devSpec, setDevSpec] = useState<Specification | null>(null);
  const [creatorName, setCreatorName] = useState<string>('');

  const [GraphComponent, setGraphComponent] = useState<React.ComponentType<{ nodes: CustomGraphNode[]; edges: CustomGraphEdge[] }> | null>(null);

  const isFDE = isTeamMember;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect user role
  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const me: any = await getUserMe();
      if (me) {
        const fullName = [me.first_name || '', me.last_name || ''].filter(Boolean).join(' ') || me.email || 'Unknown';
        setCreatorName(fullName);
        const roles: string[] = me.roles || [];
        const team = roles.some((r) => ['admin', 'fde', 'fdm', 'qa'].includes(r));
        setIsTeamMember(team);
        if (roles.includes('admin')) setUserRole('admin');
        else if (roles.includes('fde')) setUserRole('fde');
        else if (roles.includes('qa')) setUserRole('qa');
        else setUserRole('client');
      }
      setRoleLoaded(true);
    })();
  }, []);

  const loadWorkflow = useCallback(async () => {
    try {
      const [wf, graph] = await Promise.all([
        getCustomWorkflow(workflowId),
        getCustomWorkflowGraph(workflowId),
      ]);
      setWorkflow(wf);
      setGraphNodes(graph.nodes);
      setGraphEdges(graph.edges);

      // Load linked dev workflow if present
      if (wf.source_dev_workflow_id) {
        try {
          const [dw, dn] = await Promise.all([
            getDevWorkflow(wf.source_dev_workflow_id),
            getDevNodes(wf.source_dev_workflow_id),
          ]);
          setDevWorkflow(dw);
          setDevNodes(dn);

          // Fetch spec for the request message
          if (dw.specification_id) {
            const spec = await getSpecification(dw.specification_id);
            if (spec) setDevSpec(spec);
          }
        } catch {
          // Dev workflow may not be accessible
        }
      }
    } catch (err) {
      console.error('Failed to load workflow:', err);
    }
  }, [workflowId]);

  const fetchTimeline = useCallback(async () => {
    try {
      const visibility = userRole === 'client' ? 'public' : undefined;
      const data = await getCustomTimelineEntries(workflowId, visibility);
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  }, [workflowId, userRole]);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  useEffect(() => {
    setTimelineLoading(true);
    fetchTimeline();
  }, [fetchTimeline]);

  // Poll every 10s
  useEffect(() => {
    pollRef.current = setInterval(() => {
      loadWorkflow();
      fetchTimeline();
    }, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadWorkflow, fetchTimeline]);

  // Lazy load graph component
  useEffect(() => {
    if (contentMode === 'graph' && !GraphComponent) {
      import('../components/CustomWorkflowGraph').then((mod) => {
        setGraphComponent(() => mod.default);
      });
    }
  }, [contentMode, GraphComponent]);

  const handleAddMessage = async (content: string) => {
    const cardType = isFDE ? 'fde_message' : 'user_message';
    const visibility = isFDE ? 'internal' : 'public';
    const entry = await createCustomTimelineEntry(workflowId, {
      card_type: cardType,
      content,
      visibility,
    });
    setEntries((prev) => [...prev, entry]);
    setTimeout(fetchTimeline, 1000);
  };

  const handleEdit = (entry: TimelineEntry) => {
    setEditingEntry(entry);
    setEditContent(entry.content);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    const updated = await updateCustomTimelineEntry(workflowId, editingEntry._id, { content: editContent });
    setEntries((prev) => prev.map((e) => (e._id === editingEntry._id ? updated : e)));
    setEditingEntry(null);
    setEditContent('');
  };

  const handleDelete = async (entryId: string) => {
    await deleteCustomTimelineEntry(workflowId, entryId);
    setEntries((prev) => prev.filter((e) => e._id !== entryId));
  };

  const handlePublish = async (entryId: string) => {
    const updated = await publishCustomTimelineEntry(workflowId, entryId);
    setEntries((prev) => prev.map((e) => (e._id === entryId ? updated : e)));
  };

  const handleToggleTodo = async (entryId: string, todoId: string, completed: boolean) => {
    const updated = await toggleCustomTodo(workflowId, entryId, todoId, completed);
    setEntries((prev) => prev.map((e) => (e._id === entryId ? updated : e)));
  };

  if (!roleLoaded || !workflow) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-b-2 border-foreground" />
          <span className="font-mono text-xs text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Sub-header */}
      <div className="flex items-center justify-between border-b border-border px-4 md:px-6 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/app')}
            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-medium truncate max-w-[200px] md:max-w-none">
            {workflow.title}
          </h2>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${STATUS_STYLES[workflow.status] || STATUS_STYLES.draft}`}>
            {STATUS_LABELS[workflow.status] || workflow.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeline/Graph toggle */}
          <div className="flex rounded-full border border-border p-0.5">
            <button
              onClick={() => setContentMode('timeline')}
              className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                contentMode === 'timeline'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setContentMode('graph')}
              className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                contentMode === 'graph'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {workflow.status === 'active' ? 'Plan' : 'Workflow'}
            </button>
          </div>

          {/* Run button */}
          {isFDE && workflow.status !== 'archived' && (
            <Button
              size="sm"
              className="h-7 gap-1.5 font-mono text-[10px] uppercase tracking-wider"
              onClick={() => {
                // Navigate to dev workflow to run it
                if (workflow.source_dev_workflow_id) {
                  router.push(`/app/developer/${workflow.source_dev_workflow_id}`);
                }
              }}
            >
              <Play className="h-3 w-3" />
              Run
            </Button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {contentMode === 'graph' ? (
          <div className="h-full">
            {GraphComponent ? (
              <GraphComponent nodes={graphNodes} edges={graphEdges} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-foreground" />
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 md:px-6">
            <div className="mx-auto w-full max-w-3xl pt-6 space-y-4">
              {/* Request message — first message showing who created this and what they asked */}
              {devSpec && (
                <RequestMessageCard
                  spec={devSpec}
                  creatorName={creatorName || 'Unknown'}
                  createdAt={devWorkflow?.created_at}
                />
              )}

              {/* Developer Journey Card */}
              {devWorkflow && devNodes.length > 0 && (
                <DevJourneyCard devWorkflow={devWorkflow} devNodes={devNodes} />
              )}
            </div>

            {entries.length > 0 && (
              <TimelineContainer
                entries={entries}
                isFDE={isFDE}
                onEdit={isFDE ? handleEdit : undefined}
                onDelete={isFDE ? handleDelete : undefined}
                onPublish={isFDE ? handlePublish : undefined}
                onToggleTodo={handleToggleTodo}
                loading={timelineLoading}
              />
            )}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingEntry(null)}>
          <div className="w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Edit Message</h3>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              className="mb-3 w-full resize-none rounded border border-border bg-transparent px-3 py-2 font-sans text-sm outline-none focus:border-foreground"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingEntry(null)}
                className="rounded border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded bg-foreground px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-background hover:bg-foreground/90 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
