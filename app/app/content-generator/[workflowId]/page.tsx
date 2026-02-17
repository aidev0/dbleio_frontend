"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Play, ListChecks, GitBranch,
  CheckCircle2, Circle, Loader2, XCircle, Clock,
  MoreHorizontal, CalendarClock, Copy, Download, Star, Trash2,
  ChevronLeft, ChevronRight, Bot, User as UserIcon, Image as ImageIcon,
  Megaphone, Paperclip, Settings2, X, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
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
  generateConcepts,
  getImageModels,
  generateStoryboard,
  generateStoryboardImage,
  getStoryboardImageStatus,
  generateVideo,
  getVideoStatus,
  updateStoryboardScene,
  getVideoJobs,
  deleteVideoJob,
  deleteVideoVariation,
} from '../lib/api';
import type { VideoJob } from '../lib/api';
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
          variation.type === 'video' ? (
            <video src={variation.preview} className="h-full w-full object-cover" controls playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={variation.preview} alt={variation.title} className="h-full w-full object-cover" />
          )
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
  const [videoJobs, setVideoJobs] = useState<VideoJob[]>([]);

  // Concept generation
  const [generatingRows, setGeneratingRows] = useState<Set<number>>(new Set());
  const [editingConceptIdx, setEditingConceptIdx] = useState<number | null>(null);

  // Storyboard state
  const [imageModels, setImageModels] = useState<{ id: string; name: string; provider: string }[]>([]);
  const [storyboardConceptIdx, setStoryboardConceptIdx] = useState<number>(0);
  const [storyboardLlmModel, setStoryboardLlmModel] = useState<string>('gemini-pro-3');
  const [storyboardImageModel, setStoryboardImageModel] = useState<string>('');
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);
  const [storyboardError, setStoryboardError] = useState<string | null>(null);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Map<string, string>>(new Map());
  const pollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

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

  // Load image models for storyboard
  useEffect(() => {
    getImageModels().then((models) => {
      if (models.length > 0) setImageModels(models);
    });
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
        const ss = { ...(wf.config.stage_settings as Record<string, Record<string, unknown>>) };
        // Clear stuck generating state on load
        if (ss.video_generation) {
          ss.video_generation = { ...ss.video_generation, _generating_rows: [], _row_errors: {} };
        }
        setStageSettings(ss);
      }

      // Extract variations from video_generation node output
      const genNode = nodeList.find((n) => n.stage_key === 'video_generation');
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

      // Load video jobs
      getVideoJobs(workflowId).then(setVideoJobs).catch(() => {});

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
      // Don't persist ephemeral keys (prefixed with _) to the DB
      if (key.startsWith('_')) return next;
      // Debounce save to backend
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        if (!workflow) return;
        try {
          // Strip ephemeral keys before saving
          const clean: Record<string, Record<string, unknown>> = {};
          for (const [s, settings] of Object.entries(next)) {
            clean[s] = {};
            for (const [k, v] of Object.entries(settings)) {
              if (!k.startsWith('_')) clean[s][k] = v;
            }
          }
          await updateContentWorkflow(workflow._id, {
            config: { ...workflow.config, stage_settings: clean },
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
            <div className={`bg-background border border-border rounded-xl shadow-xl w-full mx-4 overflow-y-auto ${openStageKey === 'storyboard' || openStageKey === 'video_generation' ? 'max-w-[98vw] max-h-[90vh]' : 'max-w-lg max-h-[80vh]'}`} onClick={(e) => e.stopPropagation()}>
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
                {openStageKey === 'concepts' && (() => {
                  const conceptRows = (getSetting('concepts', 'concept_allocations') as Array<{ num: string; tone: string; model?: string }>) || [{ num: '3', tone: '', model: '' }];
                  const totalConcepts = conceptRows.reduce((sum, r) => sum + (parseInt(r.num) || 0), 0);
                  const generatedConcepts = (getSetting('concepts', 'generated_concepts') as Array<{ title: string; hook: string; script: string; messaging: string[]; tone?: string }>) || [];

                  const updateConceptRows = (next: Array<{ num: string; tone: string; model?: string }>) => {
                    updateStageSetting('concepts', 'concept_allocations', next);
                  };
                  const updateConceptRow = (idx: number, field: 'num' | 'tone' | 'model', value: string) => {
                    const next = conceptRows.map((r, i) => i === idx ? { ...r, [field]: value } : r);
                    updateConceptRows(next);
                  };
                  const addConceptRow = () => updateConceptRows([...conceptRows, { num: '3', tone: '', model: '' }]);
                  const removeConceptRow = (idx: number) => updateConceptRows(conceptRows.filter((_, i) => i !== idx));

                  const deleteGeneratedConcept = (idx: number) => {
                    const next = generatedConcepts.filter((_, i) => i !== idx);
                    updateStageSetting('concepts', 'generated_concepts', next);
                    if (editingConceptIdx === idx) setEditingConceptIdx(null);
                  };
                  const updateGeneratedConcept = (idx: number, field: string, value: string) => {
                    const parsed = field === 'messaging' ? value.split('\n') : value;
                    const next = generatedConcepts.map((c, i) => i === idx ? { ...c, [field]: parsed } : c);
                    updateStageSetting('concepts', 'generated_concepts', next);
                  };

                  const handleGenerate = async (idx: number) => {
                    const row = conceptRows[idx];
                    if (!row.tone || !row.num) return;
                    setGeneratingRows((prev) => new Set(prev).add(idx));
                    try {
                      const result = await generateConcepts(workflowId, parseInt(row.num) || 3, row.tone);
                      const taggedConcepts = result.concepts.map((c) => ({ ...c, tone: row.tone }));
                      // Use functional update to safely merge with concurrent results
                      setStageSettings((prev) => {
                        const existing = (prev['concepts']?.['generated_concepts'] as Array<{ title: string; hook: string; script: string; messaging: string[]; tone?: string }>) || [];
                        const next = { ...prev, concepts: { ...prev['concepts'], generated_concepts: [...existing, ...taggedConcepts] } };
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
                    } catch (err) {
                      console.error('Concept generation failed:', err);
                    } finally {
                      setGeneratingRows((prev) => { const next = new Set(prev); next.delete(idx); return next; });
                    }
                  };

                  return (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Concepts &middot; {totalConcepts} total</div>
                        <button onClick={addConceptRow} className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">+ Add concept</button>
                      </div>
                      <div className="space-y-1.5">
                        {conceptRows.map((row, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <Input type="number" min={1} max={50} className="h-7 w-[48px] text-xs shrink-0 px-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" placeholder="#" value={row.num} onChange={(e) => updateConceptRow(idx, 'num', e.target.value)} />
                            <span className="text-muted-foreground text-[10px] shrink-0">&times;</span>
                            <Combobox
                              value={row.tone}
                              onValueChange={(v) => updateConceptRow(idx, 'tone', v)}
                              placeholder="Tone"
                              className="flex-1 min-w-0 h-7"
                              options={[
                                { value: 'casual', label: 'Casual' },
                                { value: 'professional', label: 'Professional' },
                                { value: 'bold', label: 'Bold' },
                                { value: 'playful', label: 'Playful' },
                                { value: 'luxury', label: 'Luxury' },
                                { value: 'witty', label: 'Witty' },
                                { value: 'authoritative', label: 'Authoritative' },
                                { value: 'warm', label: 'Warm' },
                                { value: 'edgy', label: 'Edgy' },
                                { value: 'minimalist', label: 'Minimalist' },
                              ]}
                            />
                            <Select value={row.model || ''} onValueChange={(v) => updateConceptRow(idx, 'model', v)}>
                              <SelectTrigger className="h-7 w-[120px] text-[10px] shrink-0"><SelectValue placeholder="Model" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="claude-4.5-sonnet">Claude 4.5 Sonnet</SelectItem>
                                <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
                                <SelectItem value="gemini-pro-3">Gemini Pro 3</SelectItem>
                              </SelectContent>
                            </Select>
                            <button
                              onClick={() => handleGenerate(idx)}
                              disabled={generatingRows.has(idx) || !row.tone}
                              title="Generate concepts with AI"
                              className="shrink-0 rounded p-1 text-muted-foreground/60 hover:text-foreground disabled:opacity-30 transition-colors"
                            >
                              {generatingRows.has(idx)
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Bot className="h-3.5 w-3.5" />}
                            </button>
                            {conceptRows.length > 1 && (
                              <button onClick={() => removeConceptRow(idx)} className="shrink-0 rounded p-1 text-muted-foreground/40 hover:text-foreground transition-colors">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Generated concepts */}
                    {generatedConcepts.length > 0 && (
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Generated Concepts ({generatedConcepts.length})</div>
                        <div className="space-y-2">
                          {generatedConcepts.map((concept, idx) => (
                            <div key={idx} className="relative group/card rounded border border-border p-3 space-y-2">
                              {/* Top-right: tone badge + edit/delete */}
                              <div className="absolute top-2 right-2 flex items-center gap-1">
                                <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-foreground/70">
                                  {concept.tone || 'general'}
                                </span>
                                <button
                                  onClick={() => setEditingConceptIdx(editingConceptIdx === idx ? null : idx)}
                                  className="opacity-0 group-hover/card:opacity-100 rounded p-1 text-muted-foreground hover:text-foreground transition-all"
                                  title="Edit"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => deleteGeneratedConcept(idx)}
                                  className="opacity-0 group-hover/card:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>

                              {editingConceptIdx === idx ? (
                                <>
                                  <div>
                                    <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Title</div>
                                    <input value={concept.title} onChange={(e) => updateGeneratedConcept(idx, 'title', e.target.value)} className="w-full h-7 rounded border border-border bg-background px-2 text-xs text-foreground" />
                                  </div>
                                  <div>
                                    <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Hook</div>
                                    <textarea value={concept.hook} onChange={(e) => updateGeneratedConcept(idx, 'hook', e.target.value)} rows={2} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" />
                                  </div>
                                  <div>
                                    <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Script</div>
                                    <textarea value={typeof concept.script === 'string' ? concept.script : (concept.script as string[]).join('\n')} onChange={(e) => updateGeneratedConcept(idx, 'script', e.target.value)} rows={4} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" />
                                  </div>
                                  <div>
                                    <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Key Messaging (one per line)</div>
                                    <textarea value={(concept.messaging || []).join('\n')} onChange={(e) => updateGeneratedConcept(idx, 'messaging', e.target.value)} rows={3} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <h4 className="text-xs font-semibold pr-28">{concept.title}</h4>
                                  <div>
                                    <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Hook</div>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{concept.hook}</p>
                                  </div>
                                  <div>
                                    <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Script</div>
                                    {typeof concept.script === 'string' ? (
                                      <p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{concept.script}</p>
                                    ) : Array.isArray(concept.script) ? (
                                      <ul className="space-y-0.5">
                                        {(concept.script as string[]).map((line, li) => (
                                          <li key={li} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                                            <span className="text-muted-foreground/40 shrink-0">&#x2022;</span>
                                            <span className="whitespace-pre-line">{line}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                  </div>
                                  {concept.messaging && concept.messaging.length > 0 && (
                                    <div>
                                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Key Messaging</div>
                                      <ul className="space-y-0.5">
                                        {concept.messaging.map((msg, mi) => (
                                          <li key={mi} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                                            <span className="text-muted-foreground/40 shrink-0">&#x2022;</span>
                                            <span className="whitespace-pre-line">{msg}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                  );
                })()}

                {/* ── Image Generation (optional, between Concepts & Storyboard) ── */}
                {openStageKey === 'image_generation' && (() => {
                  const generatedConcepts = (getSetting('concepts', 'generated_concepts') as Array<{ title: string; hook: string; script: string; messaging: string[]; tone?: string }>) || [];
                  type ImgGenRow = { conceptIdx: number; llm: string; imageModel: string };
                  const rows = (getSetting('image_generation', 'rows') as ImgGenRow[]) || [{ conceptIdx: 0, llm: 'gemini-pro-3', imageModel: '' }];

                  const updateRows = (next: ImgGenRow[]) => updateStageSetting('image_generation', 'rows', next);
                  const updateImgRow = (idx: number, field: keyof ImgGenRow, value: string | number) => {
                    const next = rows.map((r, i) => i === idx ? { ...r, [field]: value } : r);
                    updateRows(next);
                  };
                  const addImgRow = () => updateRows([...rows, { conceptIdx: 0, llm: 'gemini-pro-3', imageModel: '' }]);
                  const removeImgRow = (idx: number) => updateRows(rows.filter((_, i) => i !== idx));

                  return (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Concept &times; LLM &times; Image Model</div>
                        <button onClick={addImgRow} className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">+ Add row</button>
                      </div>
                      <div className="space-y-1.5">
                        {rows.map((row, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <Select value={String(row.conceptIdx)} onValueChange={(v) => updateImgRow(idx, 'conceptIdx', Number(v))}>
                              <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Concept" /></SelectTrigger>
                              <SelectContent>
                                {generatedConcepts.map((c, i) => (
                                  <SelectItem key={i} value={String(i)}>{c.title}</SelectItem>
                                ))}
                                {generatedConcepts.length === 0 && <SelectItem value="0" disabled>No concepts yet</SelectItem>}
                              </SelectContent>
                            </Select>
                            <Select value={row.llm} onValueChange={(v) => updateImgRow(idx, 'llm', v)}>
                              <SelectTrigger className="h-8 w-[140px] text-[10px] shrink-0"><SelectValue placeholder="LLM" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gemini-pro-3">Gemini Pro 3</SelectItem>
                                <SelectItem value="claude-4.5-sonnet">Claude 4.5 Sonnet</SelectItem>
                                <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select value={row.imageModel} onValueChange={(v) => updateImgRow(idx, 'imageModel', v)}>
                              <SelectTrigger className="h-8 w-[160px] text-[10px] shrink-0"><SelectValue placeholder="Image model" /></SelectTrigger>
                              <SelectContent>
                                {imageModels.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                                {imageModels.length === 0 && (
                                  <>
                                    <SelectItem value="google/nano-banana-pro">Nano Banana Pro</SelectItem>
                                    <SelectItem value="google/nano-banana">Nano Banana</SelectItem>
                                    <SelectItem value="black-forest-labs/flux-schnell">Flux Schnell</SelectItem>
                                    <SelectItem value="black-forest-labs/flux-dev">Flux Dev</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                            {rows.length > 1 && (
                              <button onClick={() => removeImgRow(idx)} className="shrink-0 rounded p-1 text-muted-foreground/40 hover:text-foreground transition-colors">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button size="sm" disabled={generatedConcepts.length === 0} className="h-8 text-xs">
                        <ImageIcon className="h-3 w-3 mr-1.5" />
                        Generate Images
                      </Button>
                    </div>

                    {generatedConcepts.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground/50">
                        <p className="text-xs">Generate concepts first in the Concepts stage</p>
                      </div>
                    )}
                  </>
                  );
                })()}

                {/* ── Storyboard ── */}
                {openStageKey === 'storyboard' && (() => {
                  // Get concepts from stageSettings or node output
                  const generatedConcepts = (getSetting('concepts', 'generated_concepts') as Array<{ title: string; hook: string; script: string; messaging: string[]; tone?: string }>) || [];
                  // Get storyboard data from nodes
                  const storyboardNode = nodes.find((n) => n.stage_key === 'storyboard');
                  const storyboardOutput = (storyboardNode?.output_data || {}) as { storyboards?: Array<Record<string, unknown>> };
                  const storyboards = storyboardOutput.storyboards || [];
                  const currentStoryboard = storyboards.find((sb) => (sb.concept_index as number) === storyboardConceptIdx) as Record<string, unknown> | undefined;

                  type StoryboardCharacter = { id: string; name: string; description: string; image_prompt: string; image_url: string | null; gs_uri: string | null; image_model: string };
                  type StoryboardScene = { id: string; scene_number: number; title: string; description: string; shot_type: string; duration_hint: string; character_ids: string[]; image_prompt: string; image_url: string | null; gs_uri: string | null; image_model: string };

                  const characters = (currentStoryboard?.characters || []) as StoryboardCharacter[];
                  const scenes = (currentStoryboard?.scenes || []) as StoryboardScene[];
                  const storyline = (currentStoryboard?.storyline || '') as string;
                  const totalCuts = (currentStoryboard?.total_cuts || 0) as number;

                  const handleGenerateStoryboard = async () => {
                    if (generatedConcepts.length === 0) return;
                    setGeneratingStoryboard(true);
                    setStoryboardError(null);
                    try {
                      await generateStoryboard(workflowId, storyboardConceptIdx, storyboardLlmModel || undefined, storyboardImageModel || undefined);
                      await loadWorkflow();
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : 'Storyboard generation failed';
                      setStoryboardError(msg);
                      console.error('Storyboard generation failed:', err);
                    } finally {
                      setGeneratingStoryboard(false);
                    }
                  };

                  const handleGenerateImage = async (targetType: 'character' | 'scene', targetId: string, model?: string) => {
                    setGeneratingImages((prev) => new Set(prev).add(targetId));
                    setImageErrors((prev) => { const next = new Map(prev); next.delete(targetId); return next; });
                    try {
                      const { task_id } = await generateStoryboardImage(workflowId, storyboardConceptIdx, targetType, targetId, model || storyboardImageModel || undefined);
                      // Poll for completion
                      const interval = setInterval(async () => {
                        try {
                          const status = await getStoryboardImageStatus(workflowId, task_id);
                          if (status.status === 'completed') {
                            clearInterval(interval);
                            pollingRef.current.delete(targetId);
                            setGeneratingImages((prev) => { const next = new Set(prev); next.delete(targetId); return next; });
                            await loadWorkflow();
                          } else if (status.status === 'failed') {
                            clearInterval(interval);
                            pollingRef.current.delete(targetId);
                            setGeneratingImages((prev) => { const next = new Set(prev); next.delete(targetId); return next; });
                            const errMsg = (status.message as string) || (status.error as string) || 'Image generation failed';
                            setImageErrors((prev) => new Map(prev).set(targetId, errMsg));
                          }
                        } catch {
                          clearInterval(interval);
                          pollingRef.current.delete(targetId);
                          setGeneratingImages((prev) => { const next = new Set(prev); next.delete(targetId); return next; });
                        }
                      }, 2000);
                      pollingRef.current.set(targetId, interval);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : 'Failed to start image generation';
                      setImageErrors((prev) => new Map(prev).set(targetId, msg));
                      setGeneratingImages((prev) => { const next = new Set(prev); next.delete(targetId); return next; });
                    }
                  };

                  const handleGenerateAllImages = async () => {
                    // Generate character images first (in parallel)
                    const charPromises = characters
                      .filter((c) => !c.image_url && !generatingImages.has(c.id))
                      .map((c) => handleGenerateImage('character', c.id));
                    if (charPromises.length > 0) {
                      await Promise.allSettled(charPromises);
                      // Wait for all character polls to finish before doing scenes
                      await new Promise<void>((resolve) => {
                        const check = setInterval(() => {
                          const charIds = characters.map((c) => c.id);
                          const stillGenerating = charIds.some((id) => pollingRef.current.has(id));
                          if (!stillGenerating) { clearInterval(check); resolve(); }
                        }, 1000);
                      });
                    }
                    // Then generate scene images (in parallel)
                    const scenePromises = scenes
                      .filter((s) => !s.image_url && !generatingImages.has(s.id))
                      .map((s) => handleGenerateImage('scene', s.id));
                    await Promise.allSettled(scenePromises);
                  };

                  // Check if all characters referenced by a scene have images
                  const sceneCharsReady = (scene: StoryboardScene) => {
                    return scene.character_ids.every((cid) => {
                      const char = characters.find((c) => c.id === cid);
                      return char && char.image_url;
                    });
                  };

                  return (
                  <>
                    {/* Controls */}
                    <div className="space-y-2">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Concept</div>
                          <Select value={String(storyboardConceptIdx)} onValueChange={(v) => setStoryboardConceptIdx(Number(v))}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select concept" /></SelectTrigger>
                            <SelectContent>
                              {generatedConcepts.map((c, i) => (
                                <SelectItem key={i} value={String(i)}>{c.title}</SelectItem>
                              ))}
                              {generatedConcepts.length === 0 && (
                                <SelectItem value="0" disabled>No concepts yet</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-[140px] shrink-0">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">LLM</div>
                          <Select value={storyboardLlmModel} onValueChange={setStoryboardLlmModel}>
                            <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="LLM" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gemini-pro-3">Gemini Pro 3</SelectItem>
                              <SelectItem value="claude-4.5-sonnet">Claude 4.5 Sonnet</SelectItem>
                              <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-[140px] shrink-0">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Image Model</div>
                          <Select value={storyboardImageModel} onValueChange={setStoryboardImageModel}>
                            <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Default" /></SelectTrigger>
                            <SelectContent>
                              {imageModels.map((m) => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                              ))}
                              {imageModels.length === 0 && (
                                <>
                                  <SelectItem value="google/nano-banana-pro">Nano Banana Pro</SelectItem>
                                  <SelectItem value="google/nano-banana">Nano Banana</SelectItem>
                                  <SelectItem value="black-forest-labs/flux-schnell">Flux Schnell</SelectItem>
                                  <SelectItem value="black-forest-labs/flux-dev">Flux Dev</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-[80px] shrink-0">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Temp</div>
                          <Select value={(getSetting('storyboard', 'temperature') as string) || '0.7'} onValueChange={(v) => updateStageSetting('storyboard', 'temperature', v)}>
                            <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0.3">0.3</SelectItem>
                              <SelectItem value="0.5">0.5</SelectItem>
                              <SelectItem value="0.7">0.7</SelectItem>
                              <SelectItem value="0.9">0.9</SelectItem>
                              <SelectItem value="1.0">1.0</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleGenerateStoryboard}
                          disabled={generatingStoryboard || generatedConcepts.length === 0}
                          className="h-7 text-[10px] shrink-0"
                        >
                          {generatingStoryboard ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Bot className="h-3 w-3 mr-1" />}
                          Generate
                        </Button>
                      </div>
                    </div>

                    {/* Error display */}
                    {storyboardError && (
                      <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2">
                        <p className="text-xs text-destructive">{storyboardError}</p>
                      </div>
                    )}

                    {/* Storyline */}
                    {currentStoryboard && (
                      <>
                        <div>
                          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Storyline</div>
                          <p className="text-sm text-foreground/80 leading-relaxed">{storyline}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="font-mono text-[9px] text-muted-foreground">{totalCuts} cuts</span>
                            <span className="font-mono text-[9px] text-muted-foreground">{characters.length} characters</span>
                          </div>
                        </div>

                        {/* Characters */}
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2">
                            Characters <span className="text-muted-foreground/40">(generate these first for visual consistency)</span>
                          </div>
                          <div className="flex gap-3 flex-wrap">
                            {characters.map((char) => (
                              <div key={char.id} className="w-[160px] rounded-lg border border-border overflow-hidden bg-muted/20">
                                <div className="relative aspect-[3/4] bg-muted">
                                  {char.image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={char.image_url} alt={char.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full items-center justify-center">
                                      {generatingImages.has(char.id) ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                      ) : (
                                        <UserIcon className="h-6 w-6 text-muted-foreground/20" />
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="p-2 space-y-1">
                                  <div className="text-xs font-medium truncate">{char.name}</div>
                                  <p className="text-[9px] text-muted-foreground line-clamp-2 leading-relaxed">{char.description}</p>
                                  {imageErrors.get(char.id) && (
                                    <p className="text-[8px] text-destructive line-clamp-2">{imageErrors.get(char.id)}</p>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleGenerateImage('character', char.id)}
                                    disabled={generatingImages.has(char.id)}
                                    className="w-full h-6 text-[9px]"
                                  >
                                    {generatingImages.has(char.id) ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : char.image_url ? 'Regenerate' : 'Generate'}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Scenes filmstrip */}
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2">Scenes</div>
                          <div className="overflow-x-auto flex gap-3 snap-x snap-mandatory pb-2">
                            {scenes.map((scene) => {
                              const charsReady = sceneCharsReady(scene);
                              return (
                                <div key={scene.id} className="min-w-[220px] max-w-[220px] snap-start rounded-lg border border-border overflow-hidden bg-muted/20 shrink-0">
                                  <div className="relative aspect-video bg-muted">
                                    {scene.image_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={scene.image_url} alt={scene.title} className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="flex h-full items-center justify-center">
                                        {generatingImages.has(scene.id) ? (
                                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                        ) : (
                                          <ImageIcon className="h-6 w-6 text-muted-foreground/20" />
                                        )}
                                      </div>
                                    )}
                                    {/* Badges */}
                                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                                      <span className="inline-flex items-center rounded-full bg-black/60 px-1.5 py-0.5 font-mono text-[8px] text-white">
                                        {scene.shot_type}
                                      </span>
                                      <span className="inline-flex items-center rounded-full bg-black/60 px-1.5 py-0.5 font-mono text-[8px] text-white">
                                        {scene.duration_hint}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="p-2 space-y-1">
                                    <div className="flex items-center gap-1">
                                      <span className="font-mono text-[8px] text-muted-foreground/50">{scene.scene_number}.</span>
                                      <span className="text-[10px] font-medium truncate">{scene.title}</span>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground line-clamp-2 leading-relaxed">{scene.description}</p>
                                    {/* Character pills */}
                                    <div className="flex flex-wrap gap-1">
                                      {scene.character_ids.map((cid) => {
                                        const char = characters.find((c) => c.id === cid);
                                        return (
                                          <span key={cid} className="inline-flex items-center rounded-full border border-border px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground">
                                            {char?.name || cid}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    {imageErrors.get(scene.id) && (
                                      <p className="text-[8px] text-destructive line-clamp-2">{imageErrors.get(scene.id)}</p>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleGenerateImage('scene', scene.id)}
                                      disabled={generatingImages.has(scene.id) || !charsReady}
                                      title={!charsReady ? 'Generate character images first' : undefined}
                                      className="w-full h-6 text-[9px]"
                                    >
                                      {generatingImages.has(scene.id) ? (
                                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                      ) : !charsReady ? (
                                        'Chars required'
                                      ) : scene.image_url ? (
                                        'Regenerate'
                                      ) : (
                                        'Generate'
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Generate All */}
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={handleGenerateAllImages}
                            disabled={generatingImages.size > 0 || (characters.length === 0 && scenes.length === 0)}
                            className="h-8 text-xs"
                          >
                            {generatingImages.size > 0 ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <ImageIcon className="h-3 w-3 mr-1.5" />}
                            Generate All Images
                          </Button>
                        </div>

                        {/* Thumbnail */}
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2">Thumbnail</div>
                          <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                            {(currentStoryboard as Record<string, unknown>)?.thumbnail_url ? (
                              <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={(currentStoryboard as Record<string, unknown>).thumbnail_url as string} alt="Thumbnail" className="w-full aspect-video object-cover" />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleGenerateImage('scene', `thumbnail_${storyboardConceptIdx}`)}
                                  disabled={generatingImages.has(`thumbnail_${storyboardConceptIdx}`)}
                                  className="absolute bottom-2 right-2 h-6 text-[9px] bg-background/80 backdrop-blur-sm"
                                >
                                  {generatingImages.has(`thumbnail_${storyboardConceptIdx}`) ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : 'Regenerate'}
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-6 gap-2">
                                <ImageIcon className="h-6 w-6 text-muted-foreground/20" />
                                <p className="text-[9px] text-muted-foreground/50">Auto-composed from characters & scenes</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleGenerateImage('scene', `thumbnail_${storyboardConceptIdx}`)}
                                  disabled={generatingImages.has(`thumbnail_${storyboardConceptIdx}`) || (characters.every((c) => !c.image_url) && scenes.every((s) => !s.image_url))}
                                  className="h-7 text-[10px]"
                                >
                                  {generatingImages.has(`thumbnail_${storyboardConceptIdx}`) ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ImageIcon className="h-3 w-3 mr-1" />}
                                  Generate Thumbnail
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {!currentStoryboard && !generatingStoryboard && generatedConcepts.length > 0 && (
                      <div className="text-center py-8 text-muted-foreground/50">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">Select a concept and click &quot;Generate Storyboard&quot; to begin</p>
                      </div>
                    )}

                    {generatedConcepts.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground/50">
                        <p className="text-xs">Generate concepts first in the Concepts stage</p>
                      </div>
                    )}

                    {/* Generated Videos below storyboard */}
                    {(() => {
                      const vidNode = nodes.find((n) => n.stage_key === 'video_generation');
                      const vidVariations = (vidNode?.output_data?.variations || []) as Array<{ id: string; title: string; preview?: string; type: string }>;
                      if (vidVariations.length === 0) return null;
                      const fmt = (getSetting('video_generation', 'output_format') as string) || '';
                      const fmtMap: Record<string, string> = { 'reel_9_16': 'aspect-[9/16]', 'story_9_16': 'aspect-[9/16]', 'post_1_1': 'aspect-square', 'landscape_16_9': 'aspect-video' };
                      const vidAspect = fmtMap[fmt] || 'aspect-video';
                      return (
                        <div className="mt-6 border-t border-border pt-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Generated Videos</h4>
                          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            {vidVariations.map((v) => (
                              <div key={v.id} className="rounded-lg border border-border overflow-hidden bg-muted relative group/gv">
                                <video
                                  src={v.preview}
                                  className={`w-full ${vidAspect} object-cover [&:fullscreen]:object-contain [&:fullscreen]:bg-black [&:fullscreen]:h-screen [&:fullscreen]:w-auto [&:fullscreen]:mx-auto`}
                                  controls
                                  playsInline
                                />
                                <button
                                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white/70 hover:text-white hover:bg-red-600/80 opacity-0 group-hover/gv:opacity-100 transition-opacity flex items-center justify-center"
                                  onClick={() => deleteVideoVariation(workflowId, v.id).then(() => loadWorkflow()).catch(() => {})}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                                <div className="p-1.5">
                                  <p className="text-[9px] font-medium truncate">{v.title}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                  );
                })()}

                {/* ── Video Generation ── */}
                {openStageKey === 'video_generation' && (() => {
                  const rawAlloc = getSetting('video_generation', 'creative_allocations') as Array<{ count: string | number; model: string }> | undefined;
                  const allocations = (rawAlloc && rawAlloc.length > 0 ? rawAlloc : [{ count: '1', model: '' }]).map(a => ({ ...a, count: String(a.count || '1') }));
                  const totalCreatives = allocations.reduce((sum, a) => sum + (parseInt(a.count) || 0), 0);

                  const updateAllocations = (next: Array<{ count: string; model: string }>) => {
                    updateStageSetting('video_generation', 'creative_allocations', next);
                  };
                  const updateVidRow = (idx: number, field: 'count' | 'model', value: string) => {
                    const next = allocations.map((a, i) => i === idx ? { ...a, [field]: value } : a);
                    updateAllocations(next);
                  };
                  const addVidRow = () => updateAllocations([...allocations, { count: '1', model: '' }]);
                  const removeVidRow = (idx: number) => updateAllocations(allocations.filter((_, i) => i !== idx));

                  const vidGeneratingRows = (getSetting('video_generation', '_generating_rows') as number[]) || [];
                  const vidRowErrors = (getSetting('video_generation', '_row_errors') as Record<number, string>) || {};

                  const handleGenerateRow = async (idx: number) => {
                    const alloc = allocations[idx];
                    if (!alloc.model) return;

                    // Mark row as generating
                    updateStageSetting('video_generation', '_generating_rows', [...vidGeneratingRows, idx]);
                    updateStageSetting('video_generation', '_row_errors', { ...vidRowErrors, [idx]: '' });

                    try {
                      const outputFormat = (getSetting('video_generation', 'output_format') as string) || undefined;
                      const resolution = (getSetting('video_generation', 'resolution') as string) || undefined;
                      const temperature = parseFloat((getSetting('video_generation', 'temperature') as string) || '0.7');

                      const { task_id } = await generateVideo(
                        workflowId,
                        selectedSbIdx,
                        parseInt(alloc.count) || 1,
                        alloc.model,
                        outputFormat,
                        resolution,
                        temperature,
                      );

                      // Poll for completion
                      const poll = setInterval(async () => {
                        try {
                          const status = await getVideoStatus(workflowId, task_id);
                          if (status.status === 'completed' || status.status === 'failed') {
                            clearInterval(poll);
                            const currentGenerating = ((getSetting('video_generation', '_generating_rows') as number[]) || []).filter((r) => r !== idx);
                            updateStageSetting('video_generation', '_generating_rows', currentGenerating);
                            if (status.status === 'failed') {
                              updateStageSetting('video_generation', '_row_errors', {
                                ...((getSetting('video_generation', '_row_errors') as Record<number, string>) || {}),
                                [idx]: (status.error as string) || 'Generation failed',
                              });
                            }
                            await loadWorkflow();
                          }
                        } catch {
                          clearInterval(poll);
                          const currentGenerating = ((getSetting('video_generation', '_generating_rows') as number[]) || []).filter((r) => r !== idx);
                          updateStageSetting('video_generation', '_generating_rows', currentGenerating);
                        }
                      }, 3000);
                    } catch (err) {
                      const currentGenerating = vidGeneratingRows.filter((r) => r !== idx);
                      updateStageSetting('video_generation', '_generating_rows', currentGenerating);
                      updateStageSetting('video_generation', '_row_errors', {
                        ...vidRowErrors,
                        [idx]: err instanceof Error ? err.message : 'Failed to start generation',
                      });
                    }
                  };

                  // Get storyboard data
                  const storyboardNode = nodes.find((n) => n.stage_key === 'storyboard');
                  const storyboardOutput = (storyboardNode?.output_data || {}) as { storyboards?: Array<Record<string, unknown>> };
                  const storyboards = storyboardOutput.storyboards || [];
                  const generatedConcepts = (getSetting('concepts', 'generated_concepts') as Array<{ title: string; hook: string; script: string; messaging: string[]; tone?: string }>) || [];
                  const selectedSbIdx = (getSetting('video_generation', 'selected_storyboard') as number) ?? 0;
                  const selectedSb = storyboards[selectedSbIdx] as Record<string, unknown> | undefined;

                  type VidChar = { id: string; name: string; description: string; image_url: string | null; image_model: string };
                  type VidScene = { id: string; scene_number: number; title: string; description: string; shot_type: string; duration_hint: string; character_ids: string[]; image_url: string | null; image_model: string };
                  const sbStoryline = (selectedSb?.storyline || '') as string;
                  const sbTotalCuts = (selectedSb?.total_cuts || 0) as number;
                  const sbCharacters = (selectedSb?.characters || []) as VidChar[];
                  const sbScenes = (selectedSb?.scenes || []) as VidScene[];
                  const sbThumbnail = (selectedSb?.thumbnail_url || null) as string | null;
                  const sbConceptIdx = (selectedSb?.concept_index ?? 0) as number;
                  const sbConceptTitle = generatedConcepts[sbConceptIdx]?.title || `Concept ${sbConceptIdx + 1}`;

                  return (
                  <>
                    {/* Storyboard selector + summary */}
                    {storyboards.length > 0 && (
                      <div className="space-y-3">
                        {/* Selector (only if multiple) */}
                        {storyboards.length > 1 && (
                          <div className="max-w-xs">
                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Storyboard</div>
                            <Select value={String(selectedSbIdx)} onValueChange={(v) => updateStageSetting('video_generation', 'selected_storyboard', Number(v))}>
                              <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {storyboards.map((sb, i) => {
                                  const cIdx = (sb.concept_index ?? i) as number;
                                  const cTitle = generatedConcepts[cIdx]?.title || `Concept ${cIdx + 1}`;
                                  return <SelectItem key={i} value={String(i)}>{cTitle}</SelectItem>;
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {selectedSb && (
                          <>
                            {/* Storyline & stats */}
                            <div className="rounded-lg border border-border p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Storyline</span>
                                <span className="text-xs text-muted-foreground/50">&middot; {sbConceptTitle}</span>
                              </div>
                              <p className="text-sm text-foreground/80 leading-relaxed">{sbStoryline}</p>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-[8px] text-muted-foreground">{sbTotalCuts} cuts</span>
                                <span className="font-mono text-[8px] text-muted-foreground">{sbCharacters.length} characters</span>
                                <span className="font-mono text-[8px] text-muted-foreground">{sbScenes.length} scenes</span>
                                <span className="font-mono text-[8px] text-muted-foreground">
                                  {sbScenes.reduce((sum, s) => sum + (parseInt(String(s.duration_hint).replace('s', '')) || 0), 0)}s total
                                </span>
                              </div>
                            </div>

                            {/* Thumbnail */}
                            {sbThumbnail && (
                              <div>
                                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Thumbnail</div>
                                <div className="w-[160px] rounded border border-border overflow-hidden">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={sbThumbnail} alt="Thumbnail" className="w-full aspect-video object-cover" />
                                </div>
                              </div>
                            )}

                            {/* Characters */}
                            {sbCharacters.length > 0 && (
                              <div>
                                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Characters</div>
                                <div
                                  className="grid gap-2 items-stretch"
                                  style={{ gridTemplateColumns: sbCharacters.length <= 2 ? `repeat(${sbCharacters.length}, minmax(0, 160px))` : `repeat(${sbCharacters.length}, 1fr)`, maxWidth: sbCharacters.length <= 4 ? `${sbCharacters.length * 168}px` : undefined }}
                                >
                                  {sbCharacters.map((char) => (
                                    <div key={char.id} className="rounded border border-border overflow-hidden flex flex-col min-w-0">
                                      <div className="aspect-[3/4] bg-muted shrink-0">
                                        {char.image_url ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={char.image_url} alt={char.name} className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="flex h-full items-center justify-center"><UserIcon className="h-4 w-4 text-muted-foreground/20" /></div>
                                        )}
                                      </div>
                                      <div className="px-1.5 py-1 flex-1">
                                        <div className="text-xs font-medium truncate">{char.name}</div>
                                        <p className="text-[11px] text-muted-foreground leading-snug">{char.description}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Scenes + Generated Videos */}
                            {sbScenes.length > 0 && (() => {
                              const vidNode = nodes.find((n) => n.stage_key === 'video_generation');
                              const allVariations = (vidNode?.output_data?.variations || []) as Array<{ id: string; title: string; preview?: string; type: string; task_id?: string; scene_number?: number; model?: string }>;
                              const sceneVariations = allVariations.filter((v) => v.type === 'scene');
                              const taskIds = [...new Set(sceneVariations.map((v) => v.task_id || '').filter(Boolean))].reverse();
                              // Read aspect ratio from config
                              const outputFormat = (getSetting('video_generation', 'output_format') as string) || '';
                              const aspectMap: Record<string, string> = { 'reel_9_16': 'aspect-[9/16]', 'story_9_16': 'aspect-[9/16]', 'post_1_1': 'aspect-square', 'landscape_16_9': 'aspect-video' };
                              const videoAspect = aspectMap[outputFormat] || 'aspect-video';
                              return (
                              <div>
                                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Scenes</div>
                                <div
                                  className="grid gap-2 pb-1 items-stretch"
                                  style={{ gridTemplateColumns: sbScenes.length <= 2 ? `repeat(${sbScenes.length}, minmax(0, 280px))` : `repeat(${sbScenes.length}, 1fr)` }}
                                >
                                  {sbScenes.map((scene) => (
                                    <div key={scene.id} className="flex flex-col gap-1.5 min-w-0">
                                      {/* Scene image */}
                                      <div className="rounded border border-border overflow-hidden flex flex-col flex-1">
                                        <div className={`${videoAspect} bg-muted relative shrink-0`}>
                                          {scene.image_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={scene.image_url} alt={scene.title} className="h-full w-full object-cover" />
                                          ) : (
                                            <div className="flex h-full items-center justify-center"><ImageIcon className="h-3 w-3 text-muted-foreground/20" /></div>
                                          )}
                                          <div className="absolute top-0.5 left-0.5 flex gap-0.5">
                                            <input
                                              className="inline-flex items-center rounded-full bg-black/60 px-1 py-px font-mono text-[6px] text-white w-16 text-center border-none focus:outline-none focus:ring-1 focus:ring-white/40"
                                              defaultValue={scene.shot_type}
                                              onBlur={(e) => {
                                                if (e.target.value !== scene.shot_type) {
                                                  updateStoryboardScene(workflowId as string, selectedSbIdx, scene.id, { shot_type: e.target.value })
                                                    .then(() => loadWorkflow())
                                                    .catch(() => { e.target.value = scene.shot_type; });
                                                }
                                              }}
                                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                            />
                                            <input
                                              className="inline-flex items-center rounded-full bg-black/60 px-1 py-px font-mono text-[6px] text-white w-8 text-center border-none focus:outline-none focus:ring-1 focus:ring-white/40"
                                              defaultValue={scene.duration_hint}
                                              onBlur={(e) => {
                                                if (e.target.value !== scene.duration_hint) {
                                                  updateStoryboardScene(workflowId as string, selectedSbIdx, scene.id, { duration_hint: e.target.value })
                                                    .then(() => loadWorkflow())
                                                    .catch(() => { e.target.value = scene.duration_hint; });
                                                }
                                              }}
                                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                            />
                                          </div>
                                        </div>
                                        <div className="px-1.5 py-1 space-y-0.5 flex-1">
                                          <div className="flex items-center gap-1">
                                            <span className="font-mono text-[7px] text-muted-foreground/50">{scene.scene_number}.</span>
                                            <input
                                              className="text-[8px] font-medium truncate bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-full"
                                              defaultValue={scene.title}
                                              onBlur={(e) => {
                                                if (e.target.value !== scene.title) {
                                                  updateStoryboardScene(workflowId as string, selectedSbIdx, scene.id, { title: e.target.value })
                                                    .then(() => loadWorkflow())
                                                    .catch(() => { e.target.value = scene.title; });
                                                }
                                              }}
                                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                            />
                                          </div>
                                          <textarea
                                            className="text-[7px] text-muted-foreground leading-relaxed bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none w-full resize-none"
                                            defaultValue={scene.description}
                                            rows={2}
                                            onBlur={(e) => {
                                              if (e.target.value !== scene.description) {
                                                updateStoryboardScene(workflowId as string, selectedSbIdx, scene.id, { description: e.target.value })
                                                  .then(() => loadWorkflow())
                                                  .catch(() => { e.target.value = scene.description; });
                                              }
                                            }}
                                          />
                                          {scene.character_ids.length > 0 && (
                                            <div className="flex flex-wrap gap-0.5">
                                              {scene.character_ids.map((cid: string) => {
                                                const char = sbCharacters.find((c) => c.id === cid);
                                                return <span key={cid} className="inline-flex items-center rounded-full border border-border px-1 py-px font-mono text-[6px] text-muted-foreground">{char?.name || cid}</span>;
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {/* Generated videos for this scene — one per batch */}
                                      {taskIds.map((tid) => {
                                        const batchVideos = sceneVariations.filter((v) => v.task_id === tid);
                                        const vid = batchVideos.find((v) => v.scene_number === scene.scene_number || v.id.includes(`-scene${scene.scene_number}-`));
                                        const batchModel = batchVideos[0]?.model || '';
                                        return (
                                          <div key={tid} className="rounded border border-border overflow-hidden relative group/vid">
                                            {vid?.preview ? (
                                              <div className={`${videoAspect} bg-black relative`}>
                                                <video
                                                  src={vid.preview}
                                                  className="h-full w-full object-cover [&:fullscreen]:object-contain [&:fullscreen]:bg-black [&:fullscreen]:h-screen [&:fullscreen]:w-auto [&:fullscreen]:mx-auto"
                                                  controls
                                                  playsInline
                                                />
                                                <div className="absolute top-0.5 left-0.5">
                                                  <span className="inline-flex items-center rounded-full bg-green-600/80 px-1 py-px font-mono text-[6px] text-white">{batchModel}</span>
                                                </div>
                                                {vid.id && (
                                                  <button
                                                    className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white/70 hover:text-white hover:bg-red-600/80 opacity-0 group-hover/vid:opacity-100 transition-opacity flex items-center justify-center"
                                                    onClick={() => deleteVideoVariation(workflowId, vid.id).then(() => loadWorkflow()).catch(() => {})}
                                                  >
                                                    <X className="h-2.5 w-2.5" />
                                                  </button>
                                                )}
                                              </div>
                                            ) : (
                                              <div className={`${videoAspect} bg-muted/50 flex items-center justify-center`}>
                                                <span className="font-mono text-[8px] text-muted-foreground/40">rendering...</span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              );
                            })()}
                          </>
                        )}

                        {!selectedSb && (
                          <div className="text-center py-4 text-muted-foreground/50">
                            <p className="text-xs">No storyboard generated yet</p>
                          </div>
                        )}
                      </div>
                    )}

                    {storyboards.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground/50">
                        <p className="text-xs">Generate a storyboard first</p>
                      </div>
                    )}

                    {/* Generated Videos — stitched/full only */}
                    {(() => {
                      const vidNode = nodes.find((n) => n.stage_key === 'video_generation');
                      const vidVariations = ((vidNode?.output_data?.variations || []) as Array<{ id: string; title: string; preview?: string; type: string }>).filter((v) => v.type !== 'scene');
                      if (vidVariations.length === 0) return null;
                      const fmt2 = (getSetting('video_generation', 'output_format') as string) || '';
                      const fmtMap2: Record<string, string> = { 'reel_9_16': 'aspect-[9/16]', 'story_9_16': 'aspect-[9/16]', 'post_1_1': 'aspect-square', 'landscape_16_9': 'aspect-video' };
                      const vidAspect2 = fmtMap2[fmt2] || 'aspect-video';
                      return (
                        <div className="mb-4 border-b border-border pb-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Generated Videos</h4>
                          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            {vidVariations.map((v) => (
                              <div key={v.id} className="rounded-lg border border-border overflow-hidden bg-muted relative group/gv2">
                                <video
                                  src={v.preview}
                                  className={`w-full ${vidAspect2} object-cover [&:fullscreen]:object-contain [&:fullscreen]:bg-black [&:fullscreen]:h-screen [&:fullscreen]:w-auto [&:fullscreen]:mx-auto`}
                                  controls
                                  playsInline
                                />
                                <button
                                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white/70 hover:text-white hover:bg-red-600/80 opacity-0 group-hover/gv2:opacity-100 transition-opacity flex items-center justify-center"
                                  onClick={() => deleteVideoVariation(workflowId, v.id).then(() => loadWorkflow()).catch(() => {})}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                                <div className="p-1.5">
                                  <p className="text-[9px] font-medium truncate">{v.title}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Model allocations — all controls in one row */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{totalCreatives} creatives</div>
                        <button onClick={addVidRow} className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">+ Add Variation</button>
                      </div>
                      <div className="space-y-1.5">
                        {allocations.map((alloc, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex items-end gap-1.5">
                              <div className="shrink-0">
                                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Qty</div>
                                <Select value={String(alloc.count)} onValueChange={(v) => updateVidRow(idx, 'count', v)}>
                                  <SelectTrigger className="h-7 w-[52px] text-[10px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>{[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="shrink-0">
                                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Model</div>
                                <Select value={alloc.model} onValueChange={(v) => updateVidRow(idx, 'model', v)}>
                                  <SelectTrigger className="h-7 w-[180px] text-[10px]"><SelectValue placeholder="Select model" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="sora-2-pro">Sora 2 Pro — OpenAI</SelectItem>
                                    <SelectItem value="sora-2">Sora 2 — OpenAI</SelectItem>
                                    <SelectItem value="veo-3.1">Veo 3.1 — Google</SelectItem>
                                    <SelectItem value="veo-3.1-fast">Veo 3.1 Fast — Google</SelectItem>
                                    <SelectItem value="veo-3">Veo 3 — Google</SelectItem>
                                    <SelectItem value="veo-3-fast">Veo 3 Fast — Google</SelectItem>
                                    <SelectItem value="kwaivgi/kling-v2.6">Kling v2.6 — Kuaishou</SelectItem>
                                    <SelectItem value="kwaivgi/kling-v2.5-turbo-pro">Kling v2.5 Turbo — Kuaishou</SelectItem>
                                    <SelectItem value="minimax/hailuo-2.3">Hailuo 2.3 — MiniMax</SelectItem>
                                    <SelectItem value="minimax/hailuo-02">Hailuo 02 — MiniMax</SelectItem>
                                    <SelectItem value="pixverse/pixverse-v5">PixVerse v5</SelectItem>
                                    <SelectItem value="bytedance/seedance-1-pro">Seedance 1 Pro — ByteDance</SelectItem>
                                    <SelectItem value="luma/ray-2-720p">Ray 2 720p — Luma</SelectItem>
                                    <SelectItem value="wan-video/wan-2.5-t2v">Wan 2.5 T2V — Alibaba</SelectItem>
                                    <SelectItem value="wan-video/wan-2.5-i2v">Wan 2.5 I2V — Alibaba</SelectItem>
                                    <SelectItem value="wan-video/wan-2.2-t2v-fast">Wan 2.2 Fast — Alibaba</SelectItem>
                                    <SelectItem value="tencent/hunyuan-video">HunyuanVideo — Tencent</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="shrink-0">
                                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Format</div>
                                <Select value={(getSetting('video_generation', 'output_format') as string) || ''} onValueChange={(v) => updateStageSetting('video_generation', 'output_format', v)}>
                                  <SelectTrigger className="h-7 w-[95px] text-[10px]"><SelectValue placeholder="Format" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="reel_9_16">Reel 9:16</SelectItem>
                                    <SelectItem value="story_9_16">Story 9:16</SelectItem>
                                    <SelectItem value="post_1_1">Post 1:1</SelectItem>
                                    <SelectItem value="landscape_16_9">16:9</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="shrink-0">
                                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Res</div>
                                <Select value={(getSetting('video_generation', 'resolution') as string) || ''} onValueChange={(v) => updateStageSetting('video_generation', 'resolution', v)}>
                                  <SelectTrigger className="h-7 w-[70px] text-[10px]"><SelectValue placeholder="Res" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="720p">720p</SelectItem>
                                    <SelectItem value="1080p">1080p</SelectItem>
                                    <SelectItem value="4k">4K</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="shrink-0">
                                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Temp</div>
                                <Select value={(getSetting('video_generation', 'temperature') as string) || '0.7'} onValueChange={(v) => updateStageSetting('video_generation', 'temperature', v)}>
                                  <SelectTrigger className="h-7 w-[72px] text-[10px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0.3">0.3</SelectItem>
                                    <SelectItem value="0.5">0.5</SelectItem>
                                    <SelectItem value="0.7">0.7</SelectItem>
                                    <SelectItem value="0.9">0.9</SelectItem>
                                    <SelectItem value="1.0">1.0</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="shrink-0">
                                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Style</div>
                                <Select value={(getSetting('video_generation', 'style') as string) || ''} onValueChange={(v) => updateStageSetting('video_generation', 'style', v)}>
                                  <SelectTrigger className="h-7 w-[85px] text-[10px]"><SelectValue placeholder="Style" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="realistic">Realistic</SelectItem>
                                    <SelectItem value="animated">Animated</SelectItem>
                                    <SelectItem value="cinematic">Cinematic</SelectItem>
                                    <SelectItem value="documentary">Documentary</SelectItem>
                                    <SelectItem value="stop_motion">Stop Motion</SelectItem>
                                    <SelectItem value="3d_render">3D Render</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="shrink-0">
                                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Tone</div>
                                <Select value={(getSetting('video_generation', 'tone') as string) || ''} onValueChange={(v) => updateStageSetting('video_generation', 'tone', v)}>
                                  <SelectTrigger className="h-7 w-[85px] text-[10px]"><SelectValue placeholder="Tone" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="energetic">Energetic</SelectItem>
                                    <SelectItem value="calm">Calm</SelectItem>
                                    <SelectItem value="dramatic">Dramatic</SelectItem>
                                    <SelectItem value="playful">Playful</SelectItem>
                                    <SelectItem value="professional">Professional</SelectItem>
                                    <SelectItem value="luxury">Luxury</SelectItem>
                                    <SelectItem value="raw">Raw / Authentic</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="shrink-0 flex flex-col justify-end">
                                <div className="font-mono text-[8px] uppercase tracking-wider text-transparent mb-0.5 select-none">Go</div>
                                <button
                                  onClick={() => handleGenerateRow(idx)}
                                  disabled={!alloc.model || vidGeneratingRows.includes(idx) || storyboards.length === 0}
                                  className="h-8 px-4 rounded-md text-xs font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
                                >
                                  {vidGeneratingRows.includes(idx) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                                  Generate
                                </button>
                              </div>
                              {allocations.length > 1 && (
                                <div className="shrink-0">
                                  <div className="font-mono text-[8px] uppercase tracking-wider text-transparent mb-0.5 select-none">X</div>
                                  <button onClick={() => removeVidRow(idx)} className="h-7 inline-flex items-center justify-center rounded p-1 text-muted-foreground/40 hover:text-foreground transition-colors">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                            {vidRowErrors[idx] && (
                              <p className="text-[8px] text-destructive pl-[62px]">{vidRowErrors[idx]}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Video jobs list */}
                    {videoJobs.length > 0 && (
                      <div className="mt-3">
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Jobs</div>
                        <div className="space-y-1">
                          {videoJobs.map((job) => (
                            <div key={job.task_id} className="flex items-center gap-2 text-[10px] font-mono">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${job.status === 'completed' ? 'bg-green-500' : job.status === 'failed' || job.scenes_failed === job.scenes_total ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                              <span className="text-muted-foreground truncate">{job.model}</span>
                              <span className="text-muted-foreground/60">{job.scenes_done}/{job.scenes_total}</span>
                              {job.scenes_failed > 0 && <span className="text-red-500">{job.scenes_failed}✗</span>}
                              <span className="text-muted-foreground/40 truncate">{job.task_id.slice(0, 8)}</span>
                              <button
                                className="ml-auto shrink-0 h-4 w-4 rounded hover:bg-destructive/20 text-muted-foreground/40 hover:text-destructive flex items-center justify-center transition-colors"
                                onClick={() => deleteVideoJob(workflowId, job.task_id).then(() => loadWorkflow()).catch(() => {})}
                                title="Delete job"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
