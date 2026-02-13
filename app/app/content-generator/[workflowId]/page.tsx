"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Play, ListChecks, GitBranch,
  CheckCircle2, Circle, Loader2, XCircle, Clock,
  MoreHorizontal, CalendarClock, Copy, Download, Star, Trash2,
  ChevronLeft, ChevronRight, Bot, User as UserIcon, Image as ImageIcon,
  Megaphone, Paperclip, Settings2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ContentWorkflowStatusBadge from '../components/ContentWorkflowStatusBadge';
import NavMenu from '@/components/NavMenu';
import {
  getContentWorkflow,
  getContentNodes,
  runContentPipeline,
  approveContentStage,
  advanceContentStage,
  submitStageInput,
  getUserMe,
  getContentTimeline,
  createContentTimelineEntry,
  updateContentWorkflow,
  getCampaigns,
  getBrands,
} from '../lib/api';
import type { Campaign } from '../lib/api';
import { getBrandAssets, getStrategies } from '../../brands/lib/api';
import type { BrandAsset, Strategy } from '../../brands/lib/types';
import type { Brand } from '../../brands/lib/types';
import type { ContentWorkflow, ContentWorkflowNode, ContentTimelineEntry } from '../lib/types';
import { CONTENT_PIPELINE_STAGES, CONTENT_STAGE_LABELS } from '../lib/types';

type TabMode = 'steps' | 'graph' | 'content';

// --- Variation card ---
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
        <div className="absolute top-2 left-2">
          <ScoreBadge score={variation.score} />
        </div>
        <div className="absolute top-1.5 right-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background">
                <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem><CalendarClock className="h-3.5 w-3.5" /><span>Schedule Post</span></DropdownMenuItem>
              <DropdownMenuItem><Download className="h-3.5 w-3.5" /><span>Download</span></DropdownMenuItem>
              <DropdownMenuItem><Copy className="h-3.5 w-3.5" /><span>Duplicate</span></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive"><Trash2 className="h-3.5 w-3.5" /><span>Delete</span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-dashed border-border bg-muted/30 overflow-hidden">
            <div className="aspect-[9/16] max-h-[40vh] flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground/20" />
            </div>
            <div className="p-2">
              <div className="h-2.5 w-2/3 rounded bg-muted-foreground/10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {pageVariations.map((v, i) => (
          <VariationCard key={v.id} variation={v} index={page * VARIATIONS_PER_PAGE + i} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-[10px] text-muted-foreground">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// --- Workflow Steps List with clickable circles ---
function WorkflowStepsList({
  workflow,
  nodes,
  campaignName,
  strategyNames,
  assetCount,
  onClickStage,
  onOpenStage,
}: {
  workflow: ContentWorkflow;
  nodes: ContentWorkflowNode[];
  campaignName?: string;
  strategyNames: string[];
  assetCount: number;
  onClickStage?: (stageKey: string) => void;
  onOpenStage?: (stageKey: string) => void;
}) {
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
        const canComplete = isCurrent && (status === 'pending' || status === 'running') && !stage.approvalRequired;

        return (
          <div key={stage.key}>
            <div
              className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-muted/30 ${isCurrent ? 'bg-muted/50' : ''}`}
              onClick={() => onOpenStage?.(stage.key)}
            >
              <span className="font-mono text-[10px] text-muted-foreground/30 w-5 shrink-0 text-right">
                {i + 1}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); canComplete && onClickStage?.(stage.key); }}
                disabled={!canComplete}
                className={`shrink-0 ${canComplete ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
                title={canComplete ? 'Click to complete' : undefined}
              >
                <Icon className={`h-4 w-4 ${
                  status === 'running' ? 'animate-spin text-foreground' : ''
                } ${status === 'completed' ? 'text-foreground' : ''
                } ${status === 'failed' ? 'text-destructive' : ''
                } ${status === 'waiting_approval' ? 'text-yellow-500' : ''
                } ${status === 'pending' && canComplete ? 'text-muted-foreground/50 hover:text-foreground' : ''
                } ${status === 'pending' && !canComplete ? 'text-muted-foreground/30' : ''}`} />
              </button>
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                  {stage.label}
                </span>
                {isCurrent && (
                  <span className="ml-2 inline-flex rounded-full bg-foreground px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-background">
                    current
                  </span>
                )}
                <p className="text-xs text-muted-foreground/50 mt-0.5 line-clamp-1">{stage.description}</p>
              </div>
              <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
            </div>

            {/* Strategy & Assets readiness indicators */}
            {stage.key === 'strategy_assets' && isCurrent && (
              <div className="px-4 pb-3 bg-muted/50">
                <div className="ml-10 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {campaignName
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />}
                    <Megaphone className="h-3 w-3 text-muted-foreground/40" />
                    <span className={`text-xs ${campaignName ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      {campaignName || 'Campaign — none set'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {strategyNames.length > 0
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />}
                    <Settings2 className="h-3 w-3 text-muted-foreground/40" />
                    <span className={`text-xs ${strategyNames.length > 0 ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      {strategyNames.length > 0 ? strategyNames.join(', ') : 'Strategy — none set'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {assetCount > 0
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />}
                    <Paperclip className="h-3 w-3 text-muted-foreground/40" />
                    <span className={`text-xs ${assetCount > 0 ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      Assets {assetCount > 0 ? `(${assetCount})` : '— none uploaded'}
                    </span>
                  </div>
                </div>
              </div>
            )}
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
  const [tab, setTab] = useState<TabMode>('steps');
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);

  // Variations
  const [variations, setVariations] = useState<ContentVariation[]>([]);

  // Brand context
  const [brand, setBrand] = useState<Brand | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);

  // Graph component (lazy loaded)
  const [GraphComponent, setGraphComponent] = useState<React.ComponentType<{
    nodes: ContentWorkflowNode[];
    onNodeClick?: (node: ContentWorkflowNode) => void;
  }> | null>(null);

  // Stage detail modal
  const [openStageKey, setOpenStageKey] = useState<string | null>(null);

  // All stage settings (persisted to workflow.config.stage_settings)
  const [stageSettings, setStageSettings] = useState<Record<string, Record<string, unknown>>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      // Init stage settings from workflow config (skip if a debounced save is pending)
      if (wf?.config?.stage_settings && !saveTimeoutRef.current) {
        setStageSettings(wf.config.stage_settings as Record<string, Record<string, unknown>>);
      }

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

      // Load brand context if available
      if (wf?.brand_id) {
        const campaignId = (wf.config as Record<string, unknown>)?.campaign_id as string | undefined;
        const [brs, camps, assets, strats] = await Promise.all([
          getBrands(),
          getCampaigns(wf.brand_id),
          getBrandAssets(wf.brand_id),
          campaignId ? getStrategies(campaignId) : Promise.resolve([]),
        ]);
        const b = brs.find((br) => br._id === wf.brand_id) || null;
        setBrand(b);
        setCampaigns(camps);
        setBrandAssets(assets);
        setStrategies(strats);
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

  // Lazy load graph
  useEffect(() => {
    if (tab === 'graph' && !GraphComponent) {
      import('../components/ContentPipelineGraph').then((mod) => {
        setGraphComponent(() => mod.default);
      });
    }
  }, [tab, GraphComponent]);

  const handleRun = async () => {
    if (!workflow) return;
    try {
      await runContentPipeline(workflow._id);
      loadWorkflow();
    } catch (err) {
      console.error('Failed to run content pipeline:', err);
    }
  };

  const handleApprove = async (approved: boolean) => {
    if (!workflow) return;
    try {
      await approveContentStage(workflowId, workflow.current_stage, approved);
      loadWorkflow();
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  // Get/set a value for a stage, auto-saves to backend with debounce
  const getSetting = (stage: string, key: string) => stageSettings[stage]?.[key];

  const updateStageSetting = (stage: string, key: string, value: unknown) => {
    setStageSettings((prev) => {
      const next = { ...prev, [stage]: { ...prev[stage], [key]: value } };
      // Debounce save to backend
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        if (!workflow) return;
        try {
          await updateContentWorkflow(workflow._id, {
            config: { ...workflow.config, stage_settings: next },
          } as Partial<ContentWorkflow>);
        } catch (err) {
          console.error('Failed to save settings:', err);
        }
      }, 500);
      return next;
    });
  };

  const toggleArrayItem = (stage: string, key: string, item: string) => {
    const current = (getSetting(stage, key) as string[] | undefined) || [];
    const next = current.includes(item) ? current.filter((i) => i !== item) : [...current, item];
    updateStageSetting(stage, key, next);
  };

  // Derived settings from stage settings (persisted)
  const selectedAssetIds = new Set((stageSettings['strategy_assets']?.['asset_ids'] as string[] | undefined) || []);
  const handleToggleAsset = (id: string) => toggleArrayItem('strategy_assets', 'asset_ids', id);
  const selectedStrategy = (getSetting('strategy_assets', 'strategy') as string) || '';
  const handleSelectStrategy = (v: string) => updateStageSetting('strategy_assets', 'strategy', v);

  const handleCompleteStage = async (stageKey: string) => {
    if (!workflow) return;
    try {
      await submitStageInput(workflow._id, stageKey, { completed_by: 'user' });
      await loadWorkflow();
    } catch (err) {
      console.error('Failed to complete stage:', err);
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

  const TAB_ITEMS: { mode: TabMode; icon: typeof ListChecks; label: string }[] = [
    { mode: 'steps', icon: ListChecks, label: 'Steps' },
    { mode: 'graph', icon: GitBranch, label: 'Graph' },
    { mode: 'content', icon: ImageIcon, label: 'Content' },
  ];

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 md:px-4 py-2">
        <button
          onClick={() => router.push('/app/content-generator')}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium truncate">{workflow.title}</h2>
          {brand && (
            <span className="text-[10px] text-muted-foreground/60">{brand.name}</span>
          )}
        </div>

        <ContentWorkflowStatusBadge status={workflow.status} />

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

        {isFDM && (workflow.status === 'pending' || workflow.status === 'failed') && (
          <Button size="sm" onClick={handleRun} className="h-7 w-7 p-0" title="Run Pipeline">
            <Play className="h-3 w-3" />
          </Button>
        )}

        <NavMenu />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Content tab */}
        {tab === 'content' && (
          <div className="flex h-full flex-col overflow-auto">
            <div className="px-3 md:px-4 py-4">
              <VariationsGrid variations={variations} />
            </div>

            {showApproval && (
              <div className="flex items-center justify-between border-t border-border px-3 md:px-4 py-2 bg-muted/30">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {currentStageDef?.label} — approval required
                </span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleApprove(false)}
                    className="h-7 font-mono text-[10px] uppercase tracking-wider">Reject</Button>
                  <Button size="sm" onClick={() => handleApprove(true)}
                    className="h-7 font-mono text-[10px] uppercase tracking-wider">Approve</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Steps tab */}
        {tab === 'steps' && (
          <div className="h-full overflow-auto">
            <WorkflowStepsList
              workflow={workflow}
              nodes={nodes}
              campaignName={campaigns.find((c) => c._id === (workflow.config as Record<string, unknown>)?.campaign_id)?.name}
              strategyNames={strategies.map((s) => s.name)}
              assetCount={brandAssets.length}
              onClickStage={handleCompleteStage}
              onOpenStage={setOpenStageKey}
            />
            <PipelineProgressBar workflow={workflow} nodes={nodes} />
          </div>
        )}

        {/* Graph tab */}
        {tab === 'graph' && (
          <div className="flex h-full flex-col">
            <div className="flex-1 min-h-0">
              {GraphComponent ? (
                <GraphComponent nodes={nodes} onNodeClick={(node) => setOpenStageKey(node.stage_key)} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <PipelineProgressBar workflow={workflow} nodes={nodes} />
          </div>
        )}
      </div>

      {/* Stage Detail Modal */}
      {openStageKey && (() => {
        const stageDef = CONTENT_PIPELINE_STAGES.find((s) => s.key === openStageKey);
        const node = nodes.find((n) => n.stage_key === openStageKey);
        const stageIndex = CONTENT_PIPELINE_STAGES.findIndex((s) => s.key === openStageKey);
        if (!stageDef) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpenStageKey(null)}>
            <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground/50">{String(stageIndex + 1).padStart(2, '0')}</span>
                  <h3 className="text-sm font-semibold">{stageDef.label}</h3>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                    node?.status === 'completed' ? 'bg-foreground text-background'
                    : node?.status === 'running' ? 'bg-foreground text-background'
                    : node?.status === 'failed' ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground'
                  }`}>
                    {node?.status || 'pending'}
                  </span>
                </div>
                <button onClick={() => setOpenStageKey(null)} className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">{stageDef.description}</p>

                {/* ── Strategy & Assets ── */}
                {openStageKey === 'strategy_assets' && (() => {
                  const wfConfig = workflow.config as Record<string, unknown> | undefined;
                  const wfCampaignId = wfConfig?.campaign_id as string | undefined;
                  const campaign = campaigns.find((c) => c._id === wfCampaignId);
                  return (
                  <>
                    {/* Campaign */}
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Megaphone className="h-3 w-3" /> Campaign
                      </div>
                      {campaign ? (
                        <div className="rounded border border-border px-3 py-2">
                          <span className="text-xs font-medium">{campaign.name}</span>
                          {campaign.description && <p className="text-[10px] text-muted-foreground mt-0.5">{campaign.description}</p>}
                        </div>
                      ) : <p className="text-xs text-muted-foreground/50">No campaign linked</p>}
                    </div>

                    {/* Strategy selector */}
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Settings2 className="h-3 w-3" /> Strategy
                      </div>
                      {strategies.length > 0 ? (
                        <Select value={selectedStrategy} onValueChange={handleSelectStrategy}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select strategy" />
                          </SelectTrigger>
                          <SelectContent>
                            {strategies.map((s) => (
                              <SelectItem key={s._id} value={s._id}>
                                {s.name}{s.budget_amount ? ` ($${s.budget_amount} ${s.budget_type || ''})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : <p className="text-xs text-muted-foreground/50">{wfCampaignId ? 'No strategies for this campaign' : 'Link a campaign to see strategies'}</p>}
                    </div>

                    {/* Assets multi-select */}
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Paperclip className="h-3 w-3" /> Assets ({selectedAssetIds.size} selected)
                      </div>
                      {brandAssets.length > 0 ? (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {brandAssets.map((a) => (
                            <label key={a._id} className={`flex items-center gap-2.5 rounded border px-3 py-2 cursor-pointer transition-colors ${
                              selectedAssetIds.has(a._id) ? 'border-foreground bg-muted/50' : 'border-border hover:bg-muted/30'
                            }`}>
                              <input
                                type="checkbox"
                                checked={selectedAssetIds.has(a._id)}
                                onChange={() => handleToggleAsset(a._id)}
                                className="rounded border-border accent-foreground"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium truncate">{a.name}</span>
                                <span className="ml-1.5 font-mono text-[9px] text-muted-foreground">{a.asset_type}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : <p className="text-xs text-muted-foreground/50">No assets — upload in Brands</p>}
                    </div>
                  </>
                  );
                })()}

                {/* ── Scheduling ── */}
                {openStageKey === 'scheduling' && (
                  <>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Frequency</div>
                      <Select value={(getSetting('scheduling', 'frequency') as string) || ''} onValueChange={(v) => updateStageSetting('scheduling', 'frequency', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select frequency" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="3x_week">3x / week</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Start Date</div>
                        <input type="date" value={(getSetting('scheduling', 'start_date') as string) || ''} onChange={(e) => updateStageSetting('scheduling', 'start_date', e.target.value)} className="w-full h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                      </div>
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">End Date</div>
                        <input type="date" value={(getSetting('scheduling', 'end_date') as string) || ''} onChange={(e) => updateStageSetting('scheduling', 'end_date', e.target.value)} className="w-full h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Best Time to Post</div>
                      <div className="flex gap-1">
                        <Select value={(getSetting('scheduling', 'best_time_hour') as string) || ''} onValueChange={(v) => updateStageSetting('scheduling', 'best_time_hour', v)}>
                          <SelectTrigger className="h-8 w-[72px] text-xs"><SelectValue placeholder="Hr" /></SelectTrigger>
                          <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <SelectItem key={h} value={String(h)}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                        <span className="flex items-center text-muted-foreground text-xs">:</span>
                        <Select value={(getSetting('scheduling', 'best_time_minute') as string) || ''} onValueChange={(v) => updateStageSetting('scheduling', 'best_time_minute', v)}>
                          <SelectTrigger className="h-8 w-[72px] text-xs"><SelectValue placeholder="Min" /></SelectTrigger>
                          <SelectContent>{['00', '15', '30', '45'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={(getSetting('scheduling', 'best_time_period') as string) || ''} onValueChange={(v) => updateStageSetting('scheduling', 'best_time_period', v)}>
                          <SelectTrigger className="h-8 w-[72px] text-xs"><SelectValue placeholder="AM/PM" /></SelectTrigger>
                          <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Research ── */}
                {openStageKey === 'research' && (
                  <>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Trend Keywords</div>
                      <input type="text" placeholder="e.g. skincare, reels, summer" value={(getSetting('research', 'keywords') as string) || ''} onChange={(e) => updateStageSetting('research', 'keywords', e.target.value)} className="w-full h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Competitor URLs</div>
                      <input type="text" placeholder="https://instagram.com/..." value={(getSetting('research', 'competitor_urls') as string) || ''} onChange={(e) => updateStageSetting('research', 'competitor_urls', e.target.value)} className="w-full h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">LLM Model</div>
                      <Select value={(getSetting('research', 'model') as string) || ''} onValueChange={(v) => updateStageSetting('research', 'model', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select model" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="claude-sonnet">Claude Sonnet</SelectItem>
                          <SelectItem value="claude-opus">Claude Opus</SelectItem>
                          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* ── Concepts ── */}
                {openStageKey === 'concepts' && (
                  <>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Number of Concepts</div>
                      <Select value={(getSetting('concepts', 'num_concepts') as string) || ''} onValueChange={(v) => updateStageSetting('concepts', 'num_concepts', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {[3, 5, 8, 10].map((n) => <SelectItem key={n} value={String(n)}>{n} concepts</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Tone</div>
                      <Select value={(getSetting('concepts', 'tone') as string) || ''} onValueChange={(v) => updateStageSetting('concepts', 'tone', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select tone" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="bold">Bold</SelectItem>
                          <SelectItem value="playful">Playful</SelectItem>
                          <SelectItem value="luxury">Luxury</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Creative Brief</div>
                      <textarea placeholder="Describe what you want..." rows={3} value={(getSetting('concepts', 'creative_brief') as string) || ''} onChange={(e) => updateStageSetting('concepts', 'creative_brief', e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground resize-none" />
                    </div>
                  </>
                )}

                {/* ── Content Generation ── */}
                {openStageKey === 'content_generation' && (() => {
                  const allocations = (getSetting('content_generation', 'creative_allocations') as Array<{ count: string; model: string }>) || [{ count: '4', model: '' }];
                  const totalCreatives = allocations.reduce((sum, a) => sum + (parseInt(a.count) || 0), 0);

                  const updateAllocations = (next: Array<{ count: string; model: string }>) => {
                    updateStageSetting('content_generation', 'creative_allocations', next);
                  };
                  const updateRow = (idx: number, field: 'count' | 'model', value: string) => {
                    const next = allocations.map((a, i) => i === idx ? { ...a, [field]: value } : a);
                    updateAllocations(next);
                  };
                  const addRow = () => updateAllocations([...allocations, { count: '1', model: '' }]);
                  const removeRow = (idx: number) => updateAllocations(allocations.filter((_, i) => i !== idx));

                  return (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Creatives &middot; {totalCreatives} total</div>
                        <button onClick={addRow} className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">+ Add model</button>
                      </div>
                      <div className="space-y-1.5">
                        {allocations.map((alloc, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <Select value={alloc.count} onValueChange={(v) => updateRow(idx, 'count', v)}>
                              <SelectTrigger className="h-8 w-[60px] text-xs shrink-0"><SelectValue /></SelectTrigger>
                              <SelectContent>{[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                            </Select>
                            <span className="text-muted-foreground text-[10px] shrink-0">&times;</span>
                            <Select value={alloc.model} onValueChange={(v) => updateRow(idx, 'model', v)}>
                              <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Select model" /></SelectTrigger>
                              <SelectContent>
                                {/* OpenAI (direct API) */}
                                <SelectItem value="sora-2-pro">Sora 2 Pro — OpenAI</SelectItem>
                                <SelectItem value="sora-2">Sora 2 — OpenAI</SelectItem>
                                {/* Google (direct API) */}
                                <SelectItem value="veo-3.1">Veo 3.1 — Google</SelectItem>
                                <SelectItem value="veo-3.1-fast">Veo 3.1 Fast — Google</SelectItem>
                                <SelectItem value="veo-3">Veo 3 — Google</SelectItem>
                                <SelectItem value="veo-3-fast">Veo 3 Fast — Google</SelectItem>
                                {/* Replicate */}
                                <SelectItem value="kwaivgi/kling-v2.6">Kling v2.6 — Kuaishou</SelectItem>
                                <SelectItem value="kwaivgi/kling-v2.5-turbo-pro">Kling v2.5 Turbo Pro — Kuaishou</SelectItem>
                                <SelectItem value="minimax/hailuo-2.3">Hailuo 2.3 — MiniMax</SelectItem>
                                <SelectItem value="minimax/hailuo-02">Hailuo 02 — MiniMax</SelectItem>
                                <SelectItem value="pixverse/pixverse-v5">PixVerse v5 — PixVerse</SelectItem>
                                <SelectItem value="bytedance/seedance-1-pro">Seedance 1 Pro — ByteDance</SelectItem>
                                <SelectItem value="luma/ray-2-720p">Ray 2 720p — Luma</SelectItem>
                                <SelectItem value="wan-video/wan-2.5-t2v">Wan 2.5 T2V — Alibaba</SelectItem>
                                <SelectItem value="wan-video/wan-2.5-i2v">Wan 2.5 I2V — Alibaba</SelectItem>
                                <SelectItem value="wan-video/wan-2.2-t2v-fast">Wan 2.2 Fast — Alibaba</SelectItem>
                                <SelectItem value="tencent/hunyuan-video">HunyuanVideo — Tencent</SelectItem>
                              </SelectContent>
                            </Select>
                            {allocations.length > 1 && (
                              <button onClick={() => removeRow(idx)} className="shrink-0 rounded p-1 text-muted-foreground/40 hover:text-foreground transition-colors">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Output Format</div>
                      <Select value={(getSetting('content_generation', 'output_format') as string) || ''} onValueChange={(v) => updateStageSetting('content_generation', 'output_format', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select format" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reel_9_16">Reel 9:16</SelectItem>
                          <SelectItem value="story_9_16">Story 9:16</SelectItem>
                          <SelectItem value="post_1_1">Post 1:1</SelectItem>
                          <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Resolution</div>
                      <Select value={(getSetting('content_generation', 'resolution') as string) || ''} onValueChange={(v) => updateStageSetting('content_generation', 'resolution', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select resolution" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="720p">720p</SelectItem>
                          <SelectItem value="1080p">1080p (HD)</SelectItem>
                          <SelectItem value="4k">4K</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                  );
                })()}

                {/* ── Simulation & Testing ── */}
                {openStageKey === 'simulation_testing' && (
                  <>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Audience Personas</div>
                      <Select value={(getSetting('simulation_testing', 'audience_persona') as string) || ''} onValueChange={(v) => updateStageSetting('simulation_testing', 'audience_persona', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select persona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gen_z">Gen Z (18-24)</SelectItem>
                          <SelectItem value="millennials">Millennials (25-34)</SelectItem>
                          <SelectItem value="gen_x">Gen X (35-50)</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Test Metric</div>
                      <Select value={(getSetting('simulation_testing', 'test_metric') as string) || ''} onValueChange={(v) => updateStageSetting('simulation_testing', 'test_metric', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select metric" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="engagement">Engagement Rate</SelectItem>
                          <SelectItem value="watch_time">Watch Time</SelectItem>
                          <SelectItem value="click_through">Click-Through Rate</SelectItem>
                          <SelectItem value="conversion">Conversion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Sample Size</div>
                      <Select value={(getSetting('simulation_testing', 'sample_size') as string) || ''} onValueChange={(v) => updateStageSetting('simulation_testing', 'sample_size', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="500">500</SelectItem>
                          <SelectItem value="1000">1,000</SelectItem>
                          <SelectItem value="5000">5,000</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* ── Brand QA ── */}
                {openStageKey === 'brand_qa' && (
                  <>
                    <div className="space-y-2">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Checklist</div>
                      {['Brand colors correct', 'Logo placement verified', 'Tone matches guidelines', 'No trademark issues', 'Safe for all audiences'].map((item) => (
                        <label key={item} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input type="checkbox" className="rounded border-border" checked={((getSetting('brand_qa', 'checklist') as string[]) || []).includes(item)} onChange={() => toggleArrayItem('brand_qa', 'checklist', item)} />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Notes</div>
                      <textarea placeholder="Add QA notes..." rows={3} value={(getSetting('brand_qa', 'notes') as string) || ''} onChange={(e) => updateStageSetting('brand_qa', 'notes', e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground resize-none" />
                    </div>
                  </>
                )}

                {/* ── FDM Review ── */}
                {openStageKey === 'fdm_review' && (
                  <>
                    <div className="space-y-2">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Review Checklist</div>
                      {['Content quality approved', 'Compliance verified', 'Platform guidelines met', 'Copy reviewed', 'CTA effective'].map((item) => (
                        <label key={item} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input type="checkbox" className="rounded border-border" checked={((getSetting('fdm_review', 'checklist') as string[]) || []).includes(item)} onChange={() => toggleArrayItem('fdm_review', 'checklist', item)} />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Reviewer Notes</div>
                      <textarea placeholder="Add review notes..." rows={3} value={(getSetting('fdm_review', 'notes') as string) || ''} onChange={(e) => updateStageSetting('fdm_review', 'notes', e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground resize-none" />
                    </div>
                  </>
                )}

                {/* ── Publish ── */}
                {openStageKey === 'publish' && (
                  <>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Platform</div>
                      <Select value={(getSetting('publish', 'platform') as string) || ''} onValueChange={(v) => updateStageSetting('publish', 'platform', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select platform" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="youtube">YouTube Shorts</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Publish Date</div>
                      <input type="date" value={(getSetting('publish', 'publish_date') as string) || ''} onChange={(e) => updateStageSetting('publish', 'publish_date', e.target.value)} className="w-full h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Publish Time</div>
                      <div className="flex gap-1">
                        <Select value={(getSetting('publish', 'publish_hour') as string) || ''} onValueChange={(v) => updateStageSetting('publish', 'publish_hour', v)}>
                          <SelectTrigger className="h-8 w-[72px] text-xs"><SelectValue placeholder="Hr" /></SelectTrigger>
                          <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <SelectItem key={h} value={String(h)}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                        <span className="flex items-center text-muted-foreground text-xs">:</span>
                        <Select value={(getSetting('publish', 'publish_minute') as string) || ''} onValueChange={(v) => updateStageSetting('publish', 'publish_minute', v)}>
                          <SelectTrigger className="h-8 w-[72px] text-xs"><SelectValue placeholder="Min" /></SelectTrigger>
                          <SelectContent>{['00', '15', '30', '45'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={(getSetting('publish', 'publish_period') as string) || ''} onValueChange={(v) => updateStageSetting('publish', 'publish_period', v)}>
                          <SelectTrigger className="h-8 w-[72px] text-xs"><SelectValue placeholder="AM/PM" /></SelectTrigger>
                          <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Caption</div>
                      <textarea placeholder="Write caption..." rows={3} value={(getSetting('publish', 'caption') as string) || ''} onChange={(e) => updateStageSetting('publish', 'caption', e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground resize-none" />
                    </div>
                  </>
                )}

                {/* ── Metrics ── */}
                {openStageKey === 'metrics' && (
                  <>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">KPI Targets</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground">Views</span>
                          <input type="number" placeholder="10000" value={(getSetting('metrics', 'views_target') as string) || ''} onChange={(e) => updateStageSetting('metrics', 'views_target', e.target.value)} className="w-full h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Engagement %</span>
                          <input type="number" placeholder="5" value={(getSetting('metrics', 'engagement_target') as string) || ''} onChange={(e) => updateStageSetting('metrics', 'engagement_target', e.target.value)} className="w-full h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Tracking Period</div>
                      <Select value={(getSetting('metrics', 'tracking_period') as string) || ''} onValueChange={(v) => updateStageSetting('metrics', 'tracking_period', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24h">24 hours</SelectItem>
                          <SelectItem value="7d">7 days</SelectItem>
                          <SelectItem value="30d">30 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* ── Analytics ── */}
                {openStageKey === 'analytics' && (
                  <>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Report Type</div>
                      <Select value={(getSetting('analytics', 'report_type') as string) || ''} onValueChange={(v) => updateStageSetting('analytics', 'report_type', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="performance">Performance Summary</SelectItem>
                          <SelectItem value="audience">Audience Insights</SelectItem>
                          <SelectItem value="roi">ROI Analysis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">From</div>
                        <input type="date" value={(getSetting('analytics', 'from_date') as string) || ''} onChange={(e) => updateStageSetting('analytics', 'from_date', e.target.value)} className="w-full h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                      </div>
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">To</div>
                        <input type="date" value={(getSetting('analytics', 'to_date') as string) || ''} onChange={(e) => updateStageSetting('analytics', 'to_date', e.target.value)} className="w-full h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                      </div>
                    </div>
                  </>
                )}

                {/* ── Channel Learning ── */}
                {openStageKey === 'channel_learning' && (
                  <>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Platform Focus</div>
                      <Select value={(getSetting('channel_learning', 'platform_focus') as string) || ''} onValueChange={(v) => updateStageSetting('channel_learning', 'platform_focus', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select platform" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="all">All Platforms</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Insight Type</div>
                      <Select value={(getSetting('channel_learning', 'insight_type') as string) || ''} onValueChange={(v) => updateStageSetting('channel_learning', 'insight_type', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="best_time">Best Time to Post</SelectItem>
                          <SelectItem value="format">Best Format</SelectItem>
                          <SelectItem value="hashtags">Top Hashtags</SelectItem>
                          <SelectItem value="hooks">Top Hooks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* ── A/B Testing ── */}
                {openStageKey === 'ab_testing' && (
                  <>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Variants</div>
                      <Select value={(getSetting('ab_testing', 'variants') as string) || ''} onValueChange={(v) => updateStageSetting('ab_testing', 'variants', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} variants</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Success Metric</div>
                      <Select value={(getSetting('ab_testing', 'success_metric') as string) || ''} onValueChange={(v) => updateStageSetting('ab_testing', 'success_metric', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="engagement">Engagement</SelectItem>
                          <SelectItem value="watch_time">Watch Time</SelectItem>
                          <SelectItem value="shares">Shares</SelectItem>
                          <SelectItem value="saves">Saves</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Test Duration</div>
                      <Select value={(getSetting('ab_testing', 'test_duration') as string) || ''} onValueChange={(v) => updateStageSetting('ab_testing', 'test_duration', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24h">24 hours</SelectItem>
                          <SelectItem value="48h">48 hours</SelectItem>
                          <SelectItem value="7d">7 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* ── Reinforcement Learning ── */}
                {openStageKey === 'reinforcement_learning' && (
                  <>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Learning Mode</div>
                      <Select value={(getSetting('reinforcement_learning', 'learning_mode') as string) || ''} onValueChange={(v) => updateStageSetting('reinforcement_learning', 'learning_mode', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conservative">Conservative</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="aggressive">Aggressive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Feedback Weight</div>
                      <Select value={(getSetting('reinforcement_learning', 'feedback_weight') as string) || ''} onValueChange={(v) => updateStageSetting('reinforcement_learning', 'feedback_weight', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="engagement">Prioritize Engagement</SelectItem>
                          <SelectItem value="conversion">Prioritize Conversion</SelectItem>
                          <SelectItem value="reach">Prioritize Reach</SelectItem>
                          <SelectItem value="equal">Equal Weight</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {node?.error && (
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-destructive mb-1">Error</div>
                    <pre className="max-h-32 overflow-auto rounded border border-destructive/30 bg-destructive/5 p-3 font-mono text-[10px] text-destructive">
                      {node.error}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
