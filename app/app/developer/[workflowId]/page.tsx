"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TimelineContainer from '@/components/timeline/TimelineContainer';
import { useTimeline } from '@/components/timeline/useTimeline';
import WorkflowStatusBadge from '../components/WorkflowStatusBadge';
import {
  getWorkflow,
  getWorkflowNodes,
  getSpecification,
  approveWorkflowPlan,
  approveWorkflowQA,
  approveWorkflowClient,
  retryWorkflow,
  getUserMe,
} from '../lib/api';
import type { Workflow, WorkflowNode, Specification, TimelineEntry } from '../lib/types';

type ContentMode = 'timeline' | 'graph';

function RequestCard({ spec, creatorName, createdAt }: { spec: Specification; creatorName: string; createdAt?: string }) {
  const formattedDate = createdAt
    ? new Date(createdAt.endsWith('Z') ? createdAt : createdAt + 'Z').toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : '';

  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="flex items-center gap-2.5 mb-3">
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
      {spec.spec_text && (
        <p className="text-sm leading-relaxed text-muted-foreground">{spec.spec_text}</p>
      )}
      {spec.acceptance_criteria && (
        <div className="mt-3 rounded border border-border bg-muted/30 px-3 py-2">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Acceptance Criteria</div>
          <p className="text-xs text-muted-foreground leading-relaxed">{spec.acceptance_criteria}</p>
        </div>
      )}
    </div>
  );
}

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.workflowId as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [contentMode, setContentMode] = useState<ContentMode>('timeline');
  const [userRole, setUserRole] = useState<string>('client');
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimelineEntry | null>(null);
  const [editContent, setEditContent] = useState('');
  const [spec, setSpec] = useState<Specification | null>(null);
  const [creatorName, setCreatorName] = useState<string>('');

  const [GraphComponent, setGraphComponent] = useState<React.ComponentType<{ nodes: WorkflowNode[]; onNodeClick?: (node: WorkflowNode) => void }> | null>(null);

  const isFDE = isTeamMember;
  const isActive = workflow && ['running', 'waiting_approval', 'pending'].includes(workflow.status);

  const {
    entries,
    loading: timelineLoading,
    addEntry,
    editEntry,
    removeEntry,
    publishEntry,
    toggleEntryTodo,
    refresh,
  } = useTimeline({
    workflowId,
    userRole,
    active: !!isActive,
  });

  // Detect user role
  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const me: any = await getUserMe();
      if (me) {
        const fullName = [me.first_name || '', me.last_name || ''].filter(Boolean).join(' ') || me.email || '';
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
      const [wf, nodeList] = await Promise.all([
        getWorkflow(workflowId),
        getWorkflowNodes(workflowId),
      ]);
      setWorkflow(wf);
      setNodes(nodeList);
    } catch (err) {
      console.error('Failed to load workflow:', err);
    }
  }, [workflowId]);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  // Fetch spec once workflow is loaded
  useEffect(() => {
    if (!workflow?.specification_id) return;
    getSpecification(workflow.specification_id).then((s) => {
      if (s) setSpec(s);
    });
  }, [workflow?.specification_id]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(loadWorkflow, 5000);
    return () => clearInterval(interval);
  }, [isActive, loadWorkflow]);

  // Lazy load graph component
  useEffect(() => {
    if (contentMode === 'graph' && !GraphComponent) {
      import('../components/DevelopmentWorkflowGraph').then((mod) => {
        setGraphComponent(() => mod.default);
      });
    }
  }, [contentMode, GraphComponent]);

  const handleAddMessage = async (content: string) => {
    if (isFDE) {
      await addEntry(content, 'fde_message', 'internal');
    } else {
      await addEntry(content, 'user_message', 'public');
    }
  };

  const handleEdit = (entry: TimelineEntry) => {
    setEditingEntry(entry);
    setEditContent(entry.content);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    await editEntry(editingEntry._id, editContent);
    setEditingEntry(null);
    setEditContent('');
  };

  const handleDelete = async (entryId: string) => {
    await removeEntry(entryId);
  };

  const handlePublish = async (entryId: string) => {
    await publishEntry(entryId);
  };

  const handleToggleTodo = async (entryId: string, todoId: string, completed: boolean) => {
    await toggleEntryTodo(entryId, todoId, completed);
  };

  const handleApprove = async (entryId: string, approved: boolean, note: string) => {
    if (!workflow) return;
    const stage = workflow.current_stage;
    try {
      if (stage === 'plan_approval') {
        await approveWorkflowPlan(workflow._id, approved, note);
      } else if (stage === 'qa_review') {
        await approveWorkflowQA(workflow._id, approved, note);
      } else if (stage === 'client_review') {
        await approveWorkflowClient(workflow._id, approved, note);
      }
      loadWorkflow();
      refresh();
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const handleRun = async () => {
    if (!workflow) return;
    try {
      await retryWorkflow(workflow._id);
      loadWorkflow();
      refresh();
    } catch (err) {
      console.error('Failed to start workflow:', err);
    }
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
            onClick={() => router.push('/app/developer')}
            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-medium truncate max-w-[200px] md:max-w-none">
            {workflow.title}
          </h2>
          <WorkflowStatusBadge status={workflow.status} />
        </div>

        <div className="flex items-center gap-2">
          {/* Timeline/Graph toggle — everyone can see */}
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
              Workflow
            </button>
          </div>

          {/* Run button — team members only */}
          {isFDE && (workflow.status === 'pending' || workflow.status === 'failed') && (
            <Button
              size="sm"
              onClick={handleRun}
              className="h-7 gap-1.5 font-mono text-[10px] uppercase tracking-wider"
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
              <GraphComponent nodes={nodes} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-foreground" />
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 md:px-6">
            {/* Request card showing spec details */}
            {spec && (
              <div className="mx-auto w-full max-w-3xl pt-8">
                <RequestCard spec={spec} creatorName={creatorName || 'Unknown'} createdAt={workflow.created_at} />
              </div>
            )}
            <TimelineContainer
              entries={entries}
              isFDE={isFDE}
              onSubmit={handleAddMessage}
              onEdit={isFDE ? handleEdit : undefined}
              onDelete={isFDE ? handleDelete : undefined}
              onPublish={isFDE ? handlePublish : undefined}
              onToggleTodo={handleToggleTodo}
              onApprove={handleApprove}
              inputPlaceholder={isFDE ? "Add a message..." : "Describe what you need..."}
              loading={timelineLoading}
            />
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
              <Button variant="outline" size="sm" onClick={() => setEditingEntry(null)} className="font-mono text-[10px] uppercase tracking-wider">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} className="font-mono text-[10px] uppercase tracking-wider">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
