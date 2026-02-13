"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Play, MessageSquare, ListChecks, GitBranch,
  CheckCircle2, Circle, Loader2, XCircle, Clock,
  MoreHorizontal, CalendarClock, Copy, Download, Star, Trash2,
  ChevronLeft, ChevronRight, Bot, User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Chat from '@/components/Chat';
import type { ChatMessage } from '@/components/Chat';
import ContentWorkflowStatusBadge from '../../components/ContentWorkflowStatusBadge';
import NavMenu from '@/components/NavMenu';
import {
  getContentWorkflow,
  getContentNodes,
  runContentPipeline,
  approveContentStage,
  getUserMe,
  getContentTimeline,
  createContentTimelineEntry,
} from '../../lib/api';
import type { ContentWorkflow, ContentWorkflowNode, ContentTimelineEntry } from '../../lib/types';
import { CONTENT_PIPELINE_STAGES, CONTENT_STAGE_LABELS } from '../../lib/types';

type TabMode = 'chat' | 'steps' | 'graph';

// --- Variation card mock data (will come from pipeline output_data) ---
interface ContentVariation {
  id: string;
  title: string;
  preview?: string;
  type: 'video' | 'image' | 'copy';
  score?: number;
  scheduled_at?: string;
  status: 'draft' | 'approved' | 'scheduled' | 'published';
}

const VARIATIONS_PER_PAGE = 4;

// --- Pipeline Progress Bar ---
function PipelineProgressBar({ workflow, nodes }: { workflow: ContentWorkflow; nodes: ContentWorkflowNode[] }) {
  const nodeMap = new Map(nodes.map((n) => [n.stage_key, n]));
  const total = CONTENT_PIPELINE_STAGES.length;
  const completed = CONTENT_PIPELINE_STAGES.filter((s) => nodeMap.get(s.key)?.status === 'completed').length;
  const pct = Math.round((completed / total) * 100);
  const currentLabel = CONTENT_STAGE_LABELS[workflow.current_stage] || workflow.current_stage;

  return (
    <div className="border-b border-border px-3 md:px-6 py-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[9px] text-muted-foreground">{currentLabel}</span>
        <span className="font-mono text-[9px] text-muted-foreground">{completed}/{total} &middot; {pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-foreground transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// --- Score Badge ---
function ScoreBadge({ score }: { score?: number }) {
  if (score == null) return null;
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-500';
  return (
    <div className={`flex items-center gap-0.5 font-mono text-[10px] font-semibold ${color}`}>
      <Star className="h-3 w-3 fill-current" />
      {score}
    </div>
  );
}

// --- Variation Card ---
function VariationCard({ variation, index }: { variation: ContentVariation; index: number }) {
  return (
    <div className="group relative rounded-lg border border-border bg-background overflow-hidden transition-all hover:border-foreground/20 hover:shadow-sm">
      {/* Preview area */}
      <div className="relative aspect-[4/5] bg-muted">
        {variation.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={variation.preview} alt={variation.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/30">
              {variation.type}
            </span>
          </div>
        )}

        {/* Score overlay */}
        <div className="absolute top-2 left-2">
          <ScoreBadge score={variation.score} />
        </div>

        {/* Menu overlay */}
        <div className="absolute top-1.5 right-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background">
                <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem>
                <CalendarClock className="h-3.5 w-3.5" />
                <span>Schedule Post</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-3.5 w-3.5" />
                <span>Duplicate</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status badge */}
        {variation.status !== 'draft' && (
          <div className="absolute bottom-2 left-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
              variation.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : variation.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-muted text-muted-foreground'
            }`}>
              {variation.status}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-xs font-medium truncate">{variation.title || `Variation ${index + 1}`}</h4>
      </div>
    </div>
  );
}

// --- Variations Grid ---
function VariationsGrid({ variations }: { variations: ContentVariation[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(variations.length / VARIATIONS_PER_PAGE);
  const pageVariations = variations.slice(page * VARIATIONS_PER_PAGE, (page + 1) * VARIATIONS_PER_PAGE);

  if (variations.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/40">
          No content generated yet
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {pageVariations.map((v, i) => (
          <VariationCard key={v.id} variation={v} index={page * VARIATIONS_PER_PAGE + i} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-[10px] text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// --- Workflow Steps List ---
function WorkflowStepsList({ workflow, nodes }: { workflow: ContentWorkflow; nodes: ContentWorkflowNode[] }) {
  return (
    <div className="divide-y divide-border">
      {CONTENT_PIPELINE_STAGES.map((stage, i) => {
        const node = nodes.find((n) => n.stage_key === stage.key);
        const status = node?.status || 'pending';
        const isCurrent = workflow.current_stage === stage.key;
        const Icon = status === 'completed' ? CheckCircle2
          : status === 'running' ? Loader2
          : status === 'failed' ? XCircle
          : status === 'waiting_approval' ? Clock
          : Circle;
        const TypeIcon = stage.stageType === 'agent' ? Bot : UserIcon;

        return (
          <div
            key={stage.key}
            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
              isCurrent ? 'bg-muted/50' : ''
            }`}
          >
            <span className="font-mono text-[10px] text-muted-foreground/30 w-5 shrink-0 text-right">
              {i + 1}
            </span>
            <Icon className={`h-4 w-4 shrink-0 ${
              status === 'running' ? 'animate-spin text-foreground' : ''
            } ${status === 'completed' ? 'text-foreground' : ''
            } ${status === 'failed' ? 'text-destructive' : ''
            } ${status === 'waiting_approval' ? 'text-yellow-500' : ''
            } ${status === 'pending' ? 'text-muted-foreground/30' : ''}`} />
            <div className="flex-1 min-w-0">
              <span className={`text-sm ${isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {stage.label}
              </span>
              {isCurrent && (
                <span className="ml-2 inline-flex rounded-full bg-foreground px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-background">
                  current
                </span>
              )}
            </div>
            <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
          </div>
        );
      })}
    </div>
  );
}


export default function ContentWorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.workflowId as string;

  const [workflow, setWorkflow] = useState<ContentWorkflow | null>(null);
  const [nodes, setNodes] = useState<ContentWorkflowNode[]>([]);
  const [tab, setTab] = useState<TabMode>('chat');
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);

  // Variations extracted from pipeline output
  const [variations, setVariations] = useState<ContentVariation[]>([]);

  // Graph component (lazy loaded)
  const [GraphComponent, setGraphComponent] = useState<React.ComponentType<{
    nodes: ContentWorkflowNode[];
    onNodeClick?: (node: ContentWorkflowNode) => void;
  }> | null>(null);

  const isFDM = isTeamMember;
  const isActive = workflow && ['running', 'waiting_approval', 'pending'].includes(workflow.status);

  // Detect user role
  useEffect(() => {
    (async () => {
      const me = await getUserMe();
      if (me) {
        const roles: string[] = me.roles || [];
        const team = roles.some((r) => ['admin', 'fde', 'fdm', 'qa'].includes(r));
        setIsTeamMember(team);
      }
      setRoleLoaded(true);
    })();
  }, []);

  // Load workflow + nodes
  const loadWorkflow = useCallback(async () => {
    try {
      const [wf, nodeList] = await Promise.all([
        getContentWorkflow(workflowId),
        getContentNodes(workflowId),
      ]);
      setWorkflow(wf);
      setNodes(nodeList);

      // Extract variations from content_generation node output
      const genNode = nodeList.find((n) => n.stage_key === 'content_generation');
      if (genNode?.output_data) {
        const raw = (genNode.output_data.variations || genNode.output_data.content || []) as ContentVariation[];
        if (Array.isArray(raw) && raw.length > 0) {
          setVariations(raw.map((v, i) => ({
            id: v.id || `var-${i}`,
            title: v.title || `Variation ${i + 1}`,
            preview: v.preview,
            type: v.type || 'image',
            score: v.score,
            scheduled_at: v.scheduled_at,
            status: v.status || 'draft',
          })));
        }
      }
    } catch (err) {
      console.error('Failed to load content workflow:', err);
    }
  }, [workflowId]);

  useEffect(() => { loadWorkflow(); }, [loadWorkflow]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(loadWorkflow, 5000);
    return () => clearInterval(interval);
  }, [isActive, loadWorkflow]);

  // Load chat messages from timeline
  const loadChat = useCallback(async () => {
    try {
      const entries = await getContentTimeline(workflowId);
      const msgs: ChatMessage[] = entries
        .filter((e) => !e.is_deleted)
        .map((e) => ({
          _id: e._id,
          role: (e.card_type === 'ai_message' ? 'assistant'
            : e.card_type === 'status_update' ? 'system'
            : 'user') as ChatMessage['role'],
          content: e.content,
          author_name: e.author_name || e.author_id,
          created_at: e.created_at,
          processing: e.processing,
        }));
      setChatMessages(msgs);
    } catch (err) {
      console.error('Failed to load chat:', err);
    } finally {
      setChatLoading(false);
    }
  }, [workflowId]);

  useEffect(() => { loadChat(); }, [loadChat]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(loadChat, 5000);
    return () => clearInterval(interval);
  }, [isActive, loadChat]);

  // Lazy load graph
  useEffect(() => {
    if (tab === 'graph' && !GraphComponent) {
      import('../../components/ContentPipelineGraph').then((mod) => {
        setGraphComponent(() => mod.default);
      });
    }
  }, [tab, GraphComponent]);

  const handleSendMessage = async (content: string) => {
    const cardType = isFDM ? 'fde_message' : 'user_message';
    const visibility = isFDM ? 'internal' : 'public';
    await createContentTimelineEntry(workflowId, {
      card_type: cardType,
      content,
      visibility,
    });
    // Optimistic add
    setChatMessages((prev) => [...prev, {
      _id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }]);
    setTimeout(loadChat, 1000);
  };

  const handleRun = async () => {
    if (!workflow) return;
    try {
      await runContentPipeline(workflow._id);
      loadWorkflow();
      loadChat();
    } catch (err) {
      console.error('Failed to run content pipeline:', err);
    }
  };

  const handleApprove = async (approved: boolean) => {
    if (!workflow) return;
    try {
      await approveContentStage(workflowId, workflow.current_stage, approved);
      loadWorkflow();
      loadChat();
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  if (!roleLoaded || !workflow) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentStageDef = CONTENT_PIPELINE_STAGES.find((s) => s.key === workflow.current_stage);
  const showApproval = currentStageDef?.approvalRequired && currentStageDef?.stageType === 'human';

  const TAB_ITEMS: { mode: TabMode; icon: typeof MessageSquare; label: string }[] = [
    { mode: 'chat', icon: MessageSquare, label: 'Chat & Content' },
    { mode: 'steps', icon: ListChecks, label: 'Steps' },
    { mode: 'graph', icon: GitBranch, label: 'Graph' },
  ];

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 md:px-4 py-2">
        {/* Back */}
        <button
          onClick={() => router.push('/app/content-generator')}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Title */}
        <h2 className="text-sm font-medium truncate min-w-0 flex-1">{workflow.title}</h2>

        {/* Status */}
        <ContentWorkflowStatusBadge status={workflow.status} />

        {/* Icon tabs */}
        <div className="flex items-center rounded-full border border-border p-0.5">
          {TAB_ITEMS.map(({ mode, icon: TabIcon, label }) => (
            <button
              key={mode}
              onClick={() => setTab(mode)}
              title={label}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                tab === mode
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TabIcon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        {/* Run button */}
        {isFDM && (workflow.status === 'pending' || workflow.status === 'failed') && (
          <Button
            size="sm"
            onClick={handleRun}
            className="h-7 w-7 p-0"
            title="Run Pipeline"
          >
            <Play className="h-3 w-3" />
          </Button>
        )}

        <NavMenu />
      </div>

      {/* Progress bar */}
      <PipelineProgressBar workflow={workflow} nodes={nodes} />

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Chat + Variations tab */}
        {tab === 'chat' && (
          <div className="flex h-full flex-col">
            {/* Variations section (top, scrollable if needed) */}
            {variations.length > 0 && (
              <div className="border-b border-border px-3 md:px-4 py-3">
                <VariationsGrid variations={variations} />
              </div>
            )}

            {/* Approval bar */}
            {showApproval && (
              <div className="flex items-center justify-between border-b border-border px-3 md:px-4 py-2 bg-muted/30">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {currentStageDef?.label} — approval required
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApprove(false)}
                    className="h-7 font-mono text-[10px] uppercase tracking-wider"
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(true)}
                    className="h-7 font-mono text-[10px] uppercase tracking-wider"
                  >
                    Approve
                  </Button>
                </div>
              </div>
            )}

            {/* Chat (always at bottom, takes remaining space) */}
            <Chat
              messages={chatMessages}
              onSend={handleSendMessage}
              placeholder={isFDM ? "Message the team..." : "Describe what you need..."}
              loading={chatLoading}
              className="flex-1 min-h-0"
            />
          </div>
        )}

        {/* Steps tab */}
        {tab === 'steps' && (
          <div className="h-full overflow-auto">
            <WorkflowStepsList workflow={workflow} nodes={nodes} />
          </div>
        )}

        {/* Graph tab */}
        {tab === 'graph' && (
          <div className="h-full">
            {GraphComponent ? (
              <GraphComponent nodes={nodes} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
