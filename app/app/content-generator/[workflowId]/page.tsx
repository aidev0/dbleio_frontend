"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Play, ListChecks, GitBranch,
  CheckCircle2, Circle, Loader2, XCircle, Clock,
  MoreHorizontal, CalendarClock, Copy, Download, Star, Trash2,
  ChevronLeft, ChevronRight, Bot, User as UserIcon, Image as ImageIcon,
  Megaphone, Paperclip, Settings2, X, Pencil,
  Film, Music, Type as TypeIconLucide, Eye, Check, Plus, Upload,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
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
import { getBrandAssets, createBrandAsset, uploadBrandAsset, deleteBrandAsset, getStrategies } from '../../brands/lib/api';
import type { BrandAsset, Strategy } from '../../brands/lib/types';
import type { Brand } from '../../brands/lib/types';
import type { ContentWorkflow, ContentWorkflowNode, ContentTimelineEntry } from '../lib/types';
import { CONTENT_PIPELINE_STAGES, CONTENT_STAGE_LABELS } from '../lib/types';

type TabMode = 'overview' | 'steps' | 'graph' | 'content';

// Notion-style page icon
function NotionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 1.5h7l2 2v9a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

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
            <video src={variation.preview} className="h-full w-full object-contain bg-black" controls playsInline />
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

        if (!stage.available) {
          return (
            <div key={stage.key}>
              <div className="flex items-center gap-3 px-4 py-3 opacity-40 cursor-default">
                <span className="font-mono text-[10px] text-muted-foreground/30 w-5 shrink-0 text-right">{i + 1}</span>
                <Circle className="h-4 w-4 text-muted-foreground/20 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-muted-foreground">{stage.label}</span>
                  <span className="ml-2 inline-flex rounded-full border border-border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">
                    Coming Soon
                  </span>
                  <p className="text-xs text-muted-foreground/30 mt-0.5 line-clamp-1">{stage.description}</p>
                </div>
                <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/20" />
              </div>
            </div>
          );
        }

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
  const [tab, setTab] = useState<TabMode>('overview');
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
  const [storyboardVariationIdx, setStoryboardVariationIdx] = useState<number>(0);
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

  // Asset management (brands-style)
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('file');
  const [assetUrl, setAssetUrl] = useState('');
  const [assetDescription, setAssetDescription] = useState('');
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [assetCreating, setAssetCreating] = useState(false);
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);
  const [viewingAsset, setViewingAsset] = useState<BrandAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const selectedCampaignId = ((workflow?.config as Record<string, unknown> | undefined)?.campaign_id as string) || '';

  // Combined post time value (e.g. "9:00 AM") derived from individual settings
  const postTimeValue = (() => {
    const h = getSetting('scheduling', 'best_time_hour') as string;
    const m = getSetting('scheduling', 'best_time_minute') as string;
    const p = getSetting('scheduling', 'best_time_period') as string;
    if (!h) return '';
    return `${h}:${m || '00'} ${p || 'AM'}`;
  })();
  const handlePostTimeChange = (v: string) => {
    const match = v.match(/^(\d+):(\d+)\s(AM|PM)$/);
    if (!match) return;
    updateStageSetting('scheduling', 'best_time_hour', match[1]);
    updateStageSetting('scheduling', 'best_time_minute', match[2]);
    updateStageSetting('scheduling', 'best_time_period', match[3]);
  };

  // Campaign selection — persists to workflow.config.campaign_id and reloads strategies
  const handleSelectCampaign = async (campaignId: string) => {
    if (!workflow) return;
    try {
      await updateContentWorkflow(workflow._id, {
        config: { ...workflow.config, campaign_id: campaignId },
      } as Partial<ContentWorkflow>);
      // Reload strategies for new campaign
      const strats = await getStrategies(campaignId);
      setStrategies(strats);
      // Clear selected strategy if it doesn't belong to new campaign
      if (selectedStrategy && !strats.find((s) => s._id === selectedStrategy)) {
        updateStageSetting('strategy_assets', 'strategy', '');
      }
      await loadWorkflow();
    } catch (err) {
      console.error('Failed to update campaign:', err);
    }
  };

  // Asset type icon helper
  const assetTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Film className="h-3 w-3 shrink-0 text-muted-foreground/40" />;
      case 'image': case 'logo': return <ImageIcon className="h-3 w-3 shrink-0 text-muted-foreground/40" />;
      case 'audio': return <Music className="h-3 w-3 shrink-0 text-muted-foreground/40" />;
      case 'document': return <FileText className="h-3 w-3 shrink-0 text-muted-foreground/40" />;
      case 'font': return <TypeIconLucide className="h-3 w-3 shrink-0 text-muted-foreground/40" />;
      default: return <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground/40" />;
    }
  };

  // Asset create/upload handler
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflow?.brand_id) return;
    setAssetCreating(true);
    try {
      let newAsset: BrandAsset;
      if (assetFile) {
        setUploadProgress(0);
        newAsset = await uploadBrandAsset(
          assetFile,
          workflow.brand_id,
          assetName || undefined,
          assetDescription || undefined,
          assetType !== 'file' ? assetType : undefined,
          setUploadProgress,
        );
      } else {
        newAsset = await createBrandAsset({
          brand_id: workflow.brand_id,
          name: assetName,
          asset_type: assetType,
          url: assetUrl || undefined,
          description: assetDescription || undefined,
        });
      }
      // Auto-select the newly created asset
      handleToggleAsset(newAsset._id);
      // Refresh assets list
      const assets = await getBrandAssets(workflow.brand_id);
      setBrandAssets(assets);
      // Reset form
      setShowAddAsset(false);
      setAssetName('');
      setAssetType('file');
      setAssetUrl('');
      setAssetDescription('');
      setAssetFile(null);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Failed to create asset:', err);
    } finally {
      setAssetCreating(false);
      setUploadProgress(null);
    }
  };

  // Asset delete handler
  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Delete this asset?')) return;
    try {
      await deleteBrandAsset(assetId);
      // Deselect if selected
      if (selectedAssetIds.has(assetId)) {
        handleToggleAsset(assetId);
      }
      if (workflow?.brand_id) {
        const assets = await getBrandAssets(workflow.brand_id);
        setBrandAssets(assets);
      }
    } catch (err) {
      console.error('Failed to delete asset:', err);
    }
  };

  const handleCompleteStage = async (stageKey: string) => {
    if (!workflow) return;
    try {
      await submitStageInput(workflow._id, stageKey, { completed_by: 'user' });
      await loadWorkflow();
    } catch (err) {
      console.error('Failed to complete stage:', err);
    }
  };

  // Reusable brands-style asset list renderer
  const renderAssetList = () => (
    <>
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5"><Paperclip className="h-3 w-3" /> Assets ({selectedAssetIds.size} selected)</span>
        <button
          onClick={() => setShowAddAsset(true)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" /> Add Asset
        </button>
      </div>
      {brandAssets.length > 0 ? (
        <div className="rounded border border-border overflow-hidden">
          {brandAssets.map((a) => (
            <div
              key={a._id}
              className={`group flex items-center gap-3 px-3 py-2 transition-colors border-b border-border/30 last:border-b-0 cursor-pointer ${
                selectedAssetIds.has(a._id) ? 'bg-muted/50' : 'hover:bg-muted/30'
              }`}
              onClick={() => handleToggleAsset(a._id)}
            >
              <input
                type="checkbox"
                checked={selectedAssetIds.has(a._id)}
                onChange={() => handleToggleAsset(a._id)}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-border accent-foreground shrink-0"
              />
              {assetTypeIcon(a.asset_type)}
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium">{a.name}</span>
                {a.description && (
                  <p className="text-[11px] text-muted-foreground/60 line-clamp-1">{a.description}</p>
                )}
              </div>
              {a.url && (
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewingAsset(a); }}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
                    title="View"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <a
                    href={a.url}
                    download={a.file_name || a.name}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
                    title="Download"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="h-3 w-3" />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(a.url!);
                      setCopiedAssetId(a._id);
                      setTimeout(() => setCopiedAssetId(null), 2000);
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
                    title="Copy URL"
                  >
                    {copiedAssetId === a._id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteAsset(a._id); }}
                className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-destructive transition-all shrink-0"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground/50 mb-2">No assets yet</p>
          <button
            onClick={() => setShowAddAsset(true)}
            className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Upload className="h-3 w-3" /> Upload your first asset
          </button>
        </div>
      )}
    </>
  );

  // Add Asset dialog renderer (shared)
  const renderAddAssetDialog = () => (
    <Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base font-medium">New Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateAsset} className="space-y-4">
          <div>
            <Label htmlFor="wf-asset-file" className="text-xs">Upload File</Label>
            <input
              ref={fileInputRef}
              id="wf-asset-file"
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.svg,.ttf,.otf,.woff,.woff2"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setAssetFile(f);
                if (f && !assetName) setAssetName(f.name.replace(/\.[^.]+$/, ''));
              }}
              className="w-full mt-1 text-xs file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted/80 file:cursor-pointer"
            />
            {assetFile && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {assetFile.name} ({(assetFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="wf-asset-name" className="text-xs">Name</Label>
            <Input id="wf-asset-name" value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="e.g., Brand Logo, Product Photo" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="wf-asset-type" className="text-xs">Type</Label>
            <select
              id="wf-asset-type"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              className="w-full mt-1 h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="file">File</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="logo">Logo</option>
              <option value="document">Document</option>
              <option value="font">Font</option>
              <option value="color">Color</option>
            </select>
          </div>
          {!assetFile && (
            <div>
              <Label htmlFor="wf-asset-url" className="text-xs">URL (or upload file above)</Label>
              <Input id="wf-asset-url" value={assetUrl} onChange={(e) => setAssetUrl(e.target.value)} placeholder="https://..." className="mt-1" />
            </div>
          )}
          <div>
            <Label htmlFor="wf-asset-desc" className="text-xs">Description</Label>
            <Textarea id="wf-asset-desc" value={assetDescription} onChange={(e) => setAssetDescription(e.target.value)} placeholder="What is this asset?" rows={2} className="mt-1" />
          </div>
          {uploadProgress !== null && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Uploading...</span>
                <span className="font-mono text-[10px] text-muted-foreground">{uploadProgress}%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" disabled={(!assetName.trim() && !assetFile) || assetCreating}>
              {assetCreating ? 'Uploading...' : assetFile ? 'Upload' : 'Create'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddAsset(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  // Asset viewer dialog renderer
  const renderAssetViewerDialog = () => (
    viewingAsset && (
      <Dialog open={!!viewingAsset} onOpenChange={() => setViewingAsset(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">{viewingAsset.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {viewingAsset.url && (viewingAsset.content_type?.startsWith('video/') || viewingAsset.asset_type === 'video') ? (
              <video src={viewingAsset.url} controls className="w-full rounded" />
            ) : viewingAsset.url && (viewingAsset.content_type?.startsWith('image/') || ['image', 'logo'].includes(viewingAsset.asset_type)) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewingAsset.url} alt={viewingAsset.name} className="w-full rounded" />
            ) : viewingAsset.url ? (
              <div className="rounded border border-border p-4">
                <a href={viewingAsset.url} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground underline break-all">{viewingAsset.url}</a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No preview available</p>
            )}
            {viewingAsset.description && (
              <p className="mt-3 text-sm text-muted-foreground">{viewingAsset.description}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  );

  if (!roleLoaded || !workflow) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentStageDef = CONTENT_PIPELINE_STAGES.find((s) => s.key === workflow.current_stage);
  const showApproval = currentStageDef?.approvalRequired && currentStageDef?.stageType === 'human';

  const TAB_ITEMS: { mode: TabMode; icon: typeof ListChecks | null; label: string }[] = [
    { mode: 'overview', icon: null, label: 'Overview' },
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
              {TabIcon ? <TabIcon className="h-3.5 w-3.5" /> : <NotionIcon className="h-3.5 w-3.5" />}
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
        {/* Overview tab — Notion-style full-page inline view */}
        {tab === 'overview' && (() => {
          // Pre-compute shared data for inline sections
          const wfConfig = workflow.config as Record<string, unknown> | undefined;
          const oGeneratedConcepts = (getSetting('concepts', 'generated_concepts') as Array<{ title: string; hook: string; script: string; messaging: string[]; tone?: string }>) || [];
          const oStoryboardNode = nodes.find((n) => n.stage_key === 'storyboard');
          const oStoryboardOutput = (oStoryboardNode?.output_data || {}) as { storyboards?: Array<Record<string, unknown>> };
          const oStoryboards = oStoryboardOutput.storyboards || [];

          type SbChar = { id: string; name: string; description: string; image_prompt: string; image_url: string | null; gs_uri: string | null; image_model: string };
          type SbScene = { id: string; scene_number: number; title: string; description: string; shot_type: string; duration_hint: string; character_ids: string[]; image_prompt: string; image_url: string | null; gs_uri: string | null; image_model: string };
          const oConceptVariations = oStoryboards.filter((sb) => (sb.concept_index as number) === storyboardConceptIdx);
          const oCurrentSb = (oConceptVariations[storyboardVariationIdx] || oConceptVariations[0]) as Record<string, unknown> | undefined;
          const oCurrentSbFlatIdx = oCurrentSb ? oStoryboards.indexOf(oCurrentSb) : 0;
          const oNewChars = (getSetting('storyboard', `_new_characters_${storyboardConceptIdx}`) as SbChar[]) || [];
          const oNewScenes = (getSetting('storyboard', `_new_scenes_${storyboardConceptIdx}`) as SbScene[]) || [];
          const oCharacters = [...(oCurrentSb?.characters || []) as SbChar[], ...oNewChars];
          const oScenes = [...(oCurrentSb?.scenes || []) as SbScene[], ...oNewScenes];
          const oStoryline = (oCurrentSb?.storyline || '') as string;
          const oTotalCuts = (oCurrentSb?.total_cuts || 0) as number;

          // Video gen data
          const oVidSelectedSbIdx = (getSetting('video_generation', 'selected_storyboard') as number) ?? 0;
          const oVidSelectedSb = oStoryboards[oVidSelectedSbIdx] as Record<string, unknown> | undefined;
          const oVidStoryline = (oVidSelectedSb?.storyline || '') as string;
          const oVidTotalCuts = (oVidSelectedSb?.total_cuts || 0) as number;
          const oVidChars = (oVidSelectedSb?.characters || []) as SbChar[];
          const oVidScenes = (oVidSelectedSb?.scenes || []) as SbScene[];
          const oVidThumbnail = (oVidSelectedSb?.thumbnail_url || null) as string | null;
          const oVidConceptIdx = (oVidSelectedSb?.concept_index ?? 0) as number;
          const oVidConceptTitle = oGeneratedConcepts[oVidConceptIdx]?.title || `Concept ${oVidConceptIdx + 1}`;

          const oRawAlloc = getSetting('video_generation', 'creative_allocations') as Array<{ count: string | number; model: string }> | undefined;
          const oAllocations = (oRawAlloc && oRawAlloc.length > 0 ? oRawAlloc : [{ count: '1', model: '' }]).map(a => ({ ...a, count: String(a.count || '1') }));
          const oTotalCreatives = oAllocations.reduce((sum, a) => sum + (parseInt(a.count) || 0), 0);
          const oVidGeneratingRows = (getSetting('video_generation', '_generating_rows') as number[]) || [];
          const oVidRowErrors = (getSetting('video_generation', '_row_errors') as Record<number, string>) || {};

          const updateAllocations = (next: Array<{ count: string; model: string }>) => updateStageSetting('video_generation', 'creative_allocations', next);
          const updateVidRow = (idx: number, field: 'count' | 'model', value: string) => {
            const next = oAllocations.map((a, i) => i === idx ? { ...a, [field]: value } : a);
            updateAllocations(next.map(a => ({ count: String(a.count), model: a.model })));
          };
          const addVidRow = () => updateAllocations([...oAllocations.map(a => ({ count: String(a.count), model: a.model })), { count: '1', model: '' }]);
          const removeVidRow = (idx: number) => updateAllocations(oAllocations.filter((_, i) => i !== idx).map(a => ({ count: String(a.count), model: a.model })));

          const handleGenerateRowOverview = async (idx: number) => {
            const alloc = oAllocations[idx];
            if (!alloc.model) return;
            updateStageSetting('video_generation', '_generating_rows', [...oVidGeneratingRows, idx]);
            updateStageSetting('video_generation', '_row_errors', { ...oVidRowErrors, [idx]: '' });
            try {
              const outputFormat = (getSetting('video_generation', 'output_format') as string) || 'reel_9_16';
              const resolution = (getSetting('video_generation', 'resolution') as string) || undefined;
              const temperature = parseFloat((getSetting('video_generation', 'temperature') as string) || '0.7');
              const customPrompt = (getSetting('video_generation', 'custom_prompt') as string) || undefined;
              const { task_id } = await generateVideo(workflowId, oVidSelectedSbIdx, parseInt(alloc.count) || 1, alloc.model, outputFormat, resolution, temperature, customPrompt);
              const poll = setInterval(async () => {
                try {
                  const status = await getVideoStatus(workflowId, task_id);
                  if (status.status === 'completed' || status.status === 'failed') {
                    clearInterval(poll);
                    const cur = ((getSetting('video_generation', '_generating_rows') as number[]) || []).filter((r) => r !== idx);
                    updateStageSetting('video_generation', '_generating_rows', cur);
                    if (status.status === 'failed') {
                      updateStageSetting('video_generation', '_row_errors', { ...((getSetting('video_generation', '_row_errors') as Record<number, string>) || {}), [idx]: (status.error as string) || 'Generation failed' });
                    }
                    await loadWorkflow();
                  }
                } catch { clearInterval(poll); const cur = ((getSetting('video_generation', '_generating_rows') as number[]) || []).filter((r) => r !== idx); updateStageSetting('video_generation', '_generating_rows', cur); }
              }, 3000);
            } catch (err) {
              const cur = oVidGeneratingRows.filter((r) => r !== idx);
              updateStageSetting('video_generation', '_generating_rows', cur);
              updateStageSetting('video_generation', '_row_errors', { ...oVidRowErrors, [idx]: err instanceof Error ? err.message : 'Failed to start generation' });
            }
          };

          // Image gen rows
          type ImgGenRow = { conceptIdx: number; llm: string; imageModel: string };
          const oImgRows = (getSetting('image_generation', 'rows') as ImgGenRow[]) || [{ conceptIdx: 0, llm: 'gemini-pro-3', imageModel: '' }];
          const updateImgRows = (next: ImgGenRow[]) => updateStageSetting('image_generation', 'rows', next);
          const updateImgRow = (idx: number, field: keyof ImgGenRow, value: string | number) => { const next = oImgRows.map((r, i) => i === idx ? { ...r, [field]: value } : r); updateImgRows(next); };
          const addImgRow = () => updateImgRows([...oImgRows, { conceptIdx: 0, llm: 'gemini-pro-3', imageModel: '' }]);
          const removeImgRow = (idx: number) => updateImgRows(oImgRows.filter((_, i) => i !== idx));

          // Storyboard handlers
          const handleGenerateStoryboardOverview = async () => {
            if (oGeneratedConcepts.length === 0) return;
            setGeneratingStoryboard(true);
            setStoryboardError(null);
            try {
              await generateStoryboard(workflowId, storyboardConceptIdx, storyboardLlmModel || undefined, storyboardImageModel || undefined);
              await loadWorkflow();
              setStoryboardVariationIdx(oConceptVariations.length);
            } catch (err) {
              setStoryboardError(err instanceof Error ? err.message : 'Storyboard generation failed');
            } finally {
              setGeneratingStoryboard(false);
            }
          };

          const handleGenerateImageOverview = async (targetType: 'character' | 'scene', targetId: string, model?: string) => {
            setGeneratingImages((prev) => new Set(prev).add(targetId));
            setImageErrors((prev) => { const next = new Map(prev); next.delete(targetId); return next; });
            try {
              const { task_id } = await generateStoryboardImage(workflowId, storyboardConceptIdx, targetType, targetId, model || storyboardImageModel || undefined, storyboardVariationIdx);
              const interval = setInterval(async () => {
                try {
                  const status = await getStoryboardImageStatus(workflowId, task_id);
                  if (status.status === 'completed') { clearInterval(interval); pollingRef.current.delete(targetId); setGeneratingImages((prev) => { const next = new Set(prev); next.delete(targetId); return next; }); await loadWorkflow(); }
                  else if (status.status === 'failed') { clearInterval(interval); pollingRef.current.delete(targetId); setGeneratingImages((prev) => { const next = new Set(prev); next.delete(targetId); return next; }); setImageErrors((prev) => new Map(prev).set(targetId, (status.message as string) || (status.error as string) || 'Image generation failed')); }
                } catch { clearInterval(interval); pollingRef.current.delete(targetId); setGeneratingImages((prev) => { const next = new Set(prev); next.delete(targetId); return next; }); }
              }, 2000);
              pollingRef.current.set(targetId, interval);
            } catch (err) {
              setImageErrors((prev) => new Map(prev).set(targetId, err instanceof Error ? err.message : 'Failed to start image generation'));
              setGeneratingImages((prev) => { const next = new Set(prev); next.delete(targetId); return next; });
            }
          };

          const sceneCharsReadyOverview = (scene: SbScene) => scene.character_ids.every((cid) => { const c = oCharacters.find((ch) => ch.id === cid); return c && c.image_url; });

          const selAssetIds = new Set((stageSettings['strategy_assets']?.['asset_ids'] as string[] | undefined) || []);
          const selAssets = brandAssets.filter((a) => selAssetIds.has(a._id));

          return (
          <div className="h-full overflow-auto">
            <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 space-y-10">

              {CONTENT_PIPELINE_STAGES.map((stage, i) => {
                if (!stage.available) {
                  return (
                    <div key={stage.key} className="flex items-center gap-3 py-1.5 opacity-35">
                      <span className="font-mono text-[10px] text-muted-foreground/30 w-5 shrink-0 text-right">{i + 1}</span>
                      <span className="text-sm text-muted-foreground">{stage.label}</span>
                      <span className="inline-flex rounded-full border border-border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">Under Development</span>
                    </div>
                  );
                }

                // Section header for available stages
                const node = nodes.find((n) => n.stage_key === stage.key);
                const st = node?.status || 'pending';

                return (
                  <section key={stage.key}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-mono text-[10px] text-muted-foreground/40 w-5 shrink-0 text-right">{i + 1}</span>
                      <h2 className="text-lg font-medium">{stage.label}</h2>
                      {workflow.current_stage === stage.key && (
                        <span className="inline-flex rounded-full bg-foreground px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-background">current</span>
                      )}
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${st === 'completed' ? 'bg-foreground text-background' : st === 'running' ? 'bg-foreground text-background' : st === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>{st}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{stage.description}</p>
                    <div className="space-y-4">

                    {/* ── Strategy & Assets ── */}
                    {stage.key === 'strategy_assets' && (
                      <>
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5"><Megaphone className="h-3 w-3" /> Campaign</div>
                          {campaigns.length > 0 ? (
                            <Select value={selectedCampaignId || undefined} onValueChange={handleSelectCampaign}>
                              <SelectTrigger className="h-8 text-xs max-w-sm"><SelectValue placeholder="Select campaign" /></SelectTrigger>
                              <SelectContent>{campaigns.map((c) => (<SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>))}</SelectContent>
                            </Select>
                          ) : <p className="text-xs text-muted-foreground/50">No campaigns for this brand</p>}
                        </div>
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5"><Settings2 className="h-3 w-3" /> Strategy</div>
                          {strategies.length > 0 ? (
                            <Select value={selectedStrategy} onValueChange={handleSelectStrategy}>
                              <SelectTrigger className="h-8 text-xs max-w-sm"><SelectValue placeholder="Select strategy" /></SelectTrigger>
                              <SelectContent>{strategies.map((s) => (<SelectItem key={s._id} value={s._id}>{s.name}{s.budget_amount ? ` ($${s.budget_amount} ${s.budget_type || ''})` : ''}</SelectItem>))}</SelectContent>
                            </Select>
                          ) : <p className="text-xs text-muted-foreground/50">{selectedCampaignId ? 'No strategies for this campaign' : 'Select a campaign first'}</p>}
                        </div>
                        <div>
                          {renderAssetList()}
                        </div>
                      </>
                    )}

                    {/* ── Scheduling ── */}
                    {stage.key === 'scheduling' && (
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Frequency</div>
                          <Select value={(getSetting('scheduling', 'frequency') as string) || ''} onValueChange={(v) => updateStageSetting('scheduling', 'frequency', v)}><SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Frequency" /></SelectTrigger>
                            <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="3x_week">3x / week</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Start</div>
                          <input type="date" value={(getSetting('scheduling', 'start_date') as string) || ''} onChange={(e) => updateStageSetting('scheduling', 'start_date', e.target.value)} className="h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                        </div>
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">End</div>
                          <input type="date" value={(getSetting('scheduling', 'end_date') as string) || ''} onChange={(e) => updateStageSetting('scheduling', 'end_date', e.target.value)} className="h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                        </div>
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Post Time</div>
                          <Select value={postTimeValue || undefined} onValueChange={handlePostTimeChange}>
                            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Select time" /></SelectTrigger>
                            <SelectContent className="max-h-[240px]">
                              {['AM', 'PM'].flatMap((p) => [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].flatMap((h) => ['00', '15', '30', '45'].map((m) => {
                                const val = `${h}:${m} ${p}`;
                                return <SelectItem key={val} value={val}>{val}</SelectItem>;
                              })))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Timezone</div>
                          <Select value={(getSetting('scheduling', 'timezone') as string) || ''} onValueChange={(v) => updateStageSetting('scheduling', 'timezone', v)}>
                            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Timezone" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                              <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                              <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                              <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                              <SelectItem value="UTC">UTC</SelectItem>
                              <SelectItem value="Europe/London">London (GMT)</SelectItem>
                              <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                              <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                              <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                              <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* ── Concepts ── */}
                    {stage.key === 'concepts' && (() => {
                      const conceptRows = (getSetting('concepts', 'concept_allocations') as Array<{ num: string; tone: string; model?: string }>) || [{ num: '3', tone: '', model: '' }];
                      const totalConcepts = conceptRows.reduce((sum, r) => sum + (parseInt(r.num) || 0), 0);

                      const updateConceptRowsO = (next: Array<{ num: string; tone: string; model?: string }>) => {
                        updateStageSetting('concepts', 'concept_allocations', next);
                      };
                      const updateConceptRowO = (idx: number, field: 'num' | 'tone' | 'model', value: string) => {
                        updateConceptRowsO(conceptRows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
                      };
                      const addConceptRowO = () => updateConceptRowsO([...conceptRows, { num: '3', tone: '', model: '' }]);
                      const removeConceptRowO = (idx: number) => updateConceptRowsO(conceptRows.filter((_, i) => i !== idx));

                      const deleteConceptO = (idx: number) => {
                        updateStageSetting('concepts', 'generated_concepts', oGeneratedConcepts.filter((_, i) => i !== idx));
                        if (editingConceptIdx === idx) setEditingConceptIdx(null);
                      };
                      const updateConceptO = (idx: number, field: string, value: string) => {
                        const parsed = field === 'messaging' ? value.split('\n') : value;
                        updateStageSetting('concepts', 'generated_concepts', oGeneratedConcepts.map((c, i) => i === idx ? { ...c, [field]: parsed } : c));
                      };

                      const handleGenerateO = async (idx: number) => {
                        const row = conceptRows[idx];
                        if (!row.tone || !row.num) return;
                        setGeneratingRows((prev) => new Set(prev).add(idx));
                        try {
                          const result = await generateConcepts(workflowId, parseInt(row.num) || 3, row.tone);
                          const taggedConcepts = result.concepts.map((c) => ({ ...c, tone: row.tone }));
                          setStageSettings((prev) => {
                            const existing = (prev['concepts']?.['generated_concepts'] as Array<{ title: string; hook: string; script: string; messaging: string[]; tone?: string }>) || [];
                            const next = { ...prev, concepts: { ...prev['concepts'], generated_concepts: [...existing, ...taggedConcepts] } };
                            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                            saveTimeoutRef.current = setTimeout(async () => {
                              if (!workflow) return;
                              try {
                                await updateContentWorkflow(workflow._id, { config: { ...workflow.config, stage_settings: next } } as Partial<ContentWorkflow>);
                              } catch (err) { console.error('Failed to save settings:', err); }
                            }, 500);
                            return next;
                          });
                        } catch (err) { console.error('Concept generation failed:', err); }
                        finally { setGeneratingRows((prev) => { const next = new Set(prev); next.delete(idx); return next; }); }
                      };

                      return (
                        <>
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Generate &middot; {totalConcepts} total</div>
                              <button onClick={addConceptRowO} className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">+ Add Variation</button>
                            </div>
                            <div className="space-y-1.5">
                              {conceptRows.map((row, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <Input type="number" min={1} max={50} className="h-7 w-[48px] text-xs shrink-0 px-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" placeholder="#" value={row.num} onChange={(e) => updateConceptRowO(idx, 'num', e.target.value)} />
                                  <span className="text-muted-foreground text-[10px] shrink-0">&times;</span>
                                  <Combobox value={row.tone} onValueChange={(v) => updateConceptRowO(idx, 'tone', v)} placeholder="Tone" className="flex-1 min-w-0 h-7" options={[
                                    { value: 'casual', label: 'Casual' }, { value: 'professional', label: 'Professional' }, { value: 'bold', label: 'Bold' },
                                    { value: 'playful', label: 'Playful' }, { value: 'luxury', label: 'Luxury' }, { value: 'witty', label: 'Witty' },
                                    { value: 'authoritative', label: 'Authoritative' }, { value: 'warm', label: 'Warm' }, { value: 'edgy', label: 'Edgy' }, { value: 'minimalist', label: 'Minimalist' },
                                  ]} />
                                  <Select value={row.model || ''} onValueChange={(v) => updateConceptRowO(idx, 'model', v)}>
                                    <SelectTrigger className="h-7 w-[120px] text-[10px] shrink-0"><SelectValue placeholder="Model" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="claude-4.5-sonnet">Claude 4.5 Sonnet</SelectItem>
                                      <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
                                      <SelectItem value="gemini-pro-3">Gemini Pro 3</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <button onClick={() => handleGenerateO(idx)} disabled={generatingRows.has(idx) || !row.tone} className="shrink-0 rounded p-1 text-muted-foreground/60 hover:text-foreground disabled:opacity-30 transition-colors">
                                    {generatingRows.has(idx) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                                  </button>
                                  {conceptRows.length > 1 && (
                                    <button onClick={() => removeConceptRowO(idx)} className="shrink-0 rounded p-1 text-muted-foreground/40 hover:text-foreground transition-colors"><X className="h-3 w-3" /></button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {oGeneratedConcepts.length > 0 && (
                            <div>
                              <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Generated Concepts ({oGeneratedConcepts.length})</div>
                              <div className="space-y-2">
                                {oGeneratedConcepts.map((concept, idx) => (
                                  <div key={idx} className="relative group/card rounded border border-border p-3 space-y-2">
                                    <div className="absolute top-2 right-2 flex items-center gap-1">
                                      <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-foreground/70">{concept.tone || 'general'}</span>
                                      <button onClick={() => setEditingConceptIdx(editingConceptIdx === idx ? null : idx)} className="opacity-0 group-hover/card:opacity-100 rounded p-1 text-muted-foreground hover:text-foreground transition-all"><Pencil className="h-3 w-3" /></button>
                                      <button onClick={() => deleteConceptO(idx)} className="opacity-0 group-hover/card:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive transition-all"><Trash2 className="h-3 w-3" /></button>
                                    </div>
                                    {editingConceptIdx === idx ? (
                                      <>
                                        <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Title</div><input value={concept.title} onChange={(e) => updateConceptO(idx, 'title', e.target.value)} className="w-full h-7 rounded border border-border bg-background px-2 text-xs text-foreground" /></div>
                                        <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Hook</div><textarea value={concept.hook} onChange={(e) => updateConceptO(idx, 'hook', e.target.value)} rows={2} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /></div>
                                        <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Script</div><textarea value={typeof concept.script === 'string' ? concept.script : (concept.script as string[]).join('\n')} onChange={(e) => updateConceptO(idx, 'script', e.target.value)} rows={4} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /></div>
                                        <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Key Messaging (one per line)</div><textarea value={(concept.messaging || []).join('\n')} onChange={(e) => updateConceptO(idx, 'messaging', e.target.value)} rows={3} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /></div>
                                      </>
                                    ) : (
                                      <>
                                        <h4 className="text-xs font-semibold pr-28">{concept.title}</h4>
                                        <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Hook</div><p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{concept.hook}</p></div>
                                        <div>
                                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Script</div>
                                          {typeof concept.script === 'string' ? (
                                            <p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{concept.script}</p>
                                          ) : Array.isArray(concept.script) ? (
                                            <ul className="space-y-0.5">{(concept.script as string[]).map((line, li) => (<li key={li} className="text-[10px] text-muted-foreground flex items-start gap-1.5"><span className="text-muted-foreground/40 shrink-0">&#x2022;</span><span className="whitespace-pre-line">{line}</span></li>))}</ul>
                                          ) : null}
                                        </div>
                                        {concept.messaging && concept.messaging.length > 0 && (
                                          <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Key Messaging</div><ul className="space-y-0.5">{concept.messaging.map((msg, mi) => (<li key={mi} className="text-[10px] text-muted-foreground flex items-start gap-1.5"><span className="text-muted-foreground/40 shrink-0">&#x2022;</span><span className="whitespace-pre-line">{msg}</span></li>))}</ul></div>
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

                    {/* ── Image Generation ── */}
                    {stage.key === 'image_generation' && (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{oImgRows.length} variation{oImgRows.length !== 1 ? 's' : ''}</div>
                            <button onClick={addImgRow} className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">+ Add Variation</button>
                          </div>
                          <div className="space-y-1.5">
                            {oImgRows.map((row, idx) => (
                              <div key={idx} className="flex items-end gap-1.5">
                                <div className="flex-1 min-w-0">
                                  <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Concept</div>
                                  <Select value={String(row.conceptIdx)} onValueChange={(v) => updateImgRow(idx, 'conceptIdx', Number(v))}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Concept" /></SelectTrigger>
                                    <SelectContent>
                                      {oGeneratedConcepts.map((c, ci) => (<SelectItem key={ci} value={String(ci)}>{c.title}</SelectItem>))}
                                      {oGeneratedConcepts.length === 0 && <SelectItem value="0" disabled>No concepts yet</SelectItem>}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="shrink-0">
                                  <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">LLM</div>
                                  <Select value={row.llm} onValueChange={(v) => updateImgRow(idx, 'llm', v)}>
                                    <SelectTrigger className="h-7 w-[140px] text-[10px]"><SelectValue placeholder="LLM" /></SelectTrigger>
                                    <SelectContent><SelectItem value="gemini-pro-3">Gemini Pro 3</SelectItem><SelectItem value="claude-4.5-sonnet">Claude 4.5 Sonnet</SelectItem><SelectItem value="gpt-5.2">GPT-5.2</SelectItem></SelectContent>
                                  </Select>
                                </div>
                                <div className="shrink-0">
                                  <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Image Model</div>
                                  <Select value={row.imageModel} onValueChange={(v) => updateImgRow(idx, 'imageModel', v)}>
                                    <SelectTrigger className="h-7 w-[160px] text-[10px]"><SelectValue placeholder="Image model" /></SelectTrigger>
                                    <SelectContent>
                                      {imageModels.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                                      {imageModels.length === 0 && (<><SelectItem value="google/nano-banana-pro">Nano Banana Pro</SelectItem><SelectItem value="black-forest-labs/flux-schnell">Flux Schnell</SelectItem></>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="shrink-0 flex flex-col justify-end">
                                  <div className="font-mono text-[8px] uppercase tracking-wider text-transparent mb-0.5 select-none">Go</div>
                                  <button disabled={oGeneratedConcepts.length === 0} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Generate">
                                    <Bot className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                {oImgRows.length > 1 && (
                                  <div className="shrink-0"><div className="font-mono text-[8px] uppercase tracking-wider text-transparent mb-0.5 select-none">X</div><button onClick={() => removeImgRow(idx)} className="h-7 inline-flex items-center justify-center rounded p-1 text-muted-foreground/40 hover:text-foreground transition-colors"><X className="h-3 w-3" /></button></div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        {oGeneratedConcepts.length === 0 && <div className="text-center py-4 text-muted-foreground/50"><p className="text-xs">Generate concepts first in the Concepts stage</p></div>}
                      </>
                    )}

                    {/* ── Storyboard ── */}
                    {stage.key === 'storyboard' && (
                      <>
                        {(() => {
                          type SbRow = { conceptIdx: number; chars: string; scenes: string; duration: string; llm: string; imageModel: string };
                          const oSbRows = (getSetting('storyboard', 'storyboard_rows') as SbRow[]) || [{ conceptIdx: 0, chars: '3', scenes: '6', duration: '30s', llm: 'gemini-pro-3', imageModel: '' }];
                          const updateSbRows = (next: SbRow[]) => updateStageSetting('storyboard', 'storyboard_rows', next);
                          const updateSbRow = (idx: number, field: keyof SbRow, value: string | number) => updateSbRows(oSbRows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
                          const addSbRow = () => updateSbRows([...oSbRows, { conceptIdx: 0, chars: '3', scenes: '6', duration: '30s', llm: 'gemini-pro-3', imageModel: '' }]);
                          const removeSbRow = (idx: number) => updateSbRows(oSbRows.filter((_, i) => i !== idx));

                          return (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{oSbRows.length} variation{oSbRows.length !== 1 ? 's' : ''}</div>
                              <button onClick={addSbRow} className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">+ Add Variation</button>
                            </div>
                            <div className="space-y-1.5">
                              {oSbRows.map((row, idx) => (
                                <div key={idx} className="flex items-end gap-1.5">
                                  <div className="shrink-0">
                                    <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Concept</div>
                                    <Select value={String(row.conceptIdx)} onValueChange={(v) => updateSbRow(idx, 'conceptIdx', Number(v))}>
                                      <SelectTrigger className="h-7 text-xs w-auto max-w-[260px]"><SelectValue placeholder="Concept" /></SelectTrigger>
                                      <SelectContent>
                                        {oGeneratedConcepts.map((c, ci) => (<SelectItem key={ci} value={String(ci)}>{c.title}</SelectItem>))}
                                        {oGeneratedConcepts.length === 0 && <SelectItem value="0" disabled>No concepts yet</SelectItem>}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="shrink-0">
                                    <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Chars</div>
                                    <div className="flex items-center h-7 rounded-md border border-border overflow-hidden">
                                      <button className="h-full px-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => updateSbRow(idx, 'chars', String(Math.max(1, parseInt(row.chars || '3') - 1)))}>-</button>
                                      <span className="w-[24px] text-center text-[10px] font-medium tabular-nums">{row.chars || '3'}</span>
                                      <button className="h-full px-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => updateSbRow(idx, 'chars', String(Math.min(20, parseInt(row.chars || '3') + 1)))}>+</button>
                                    </div>
                                  </div>
                                  <div className="shrink-0">
                                    <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Scenes</div>
                                    <div className="flex items-center h-7 rounded-md border border-border overflow-hidden">
                                      <button className="h-full px-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => updateSbRow(idx, 'scenes', String(Math.max(1, parseInt(row.scenes || '6') - 1)))}>-</button>
                                      <span className="w-[24px] text-center text-[10px] font-medium tabular-nums">{row.scenes || '6'}</span>
                                      <button className="h-full px-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => updateSbRow(idx, 'scenes', String(Math.min(50, parseInt(row.scenes || '6') + 1)))}>+</button>
                                    </div>
                                  </div>
                                  <div className="shrink-0">
                                    <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Duration</div>
                                    <Select value={row.duration || '30s'} onValueChange={(v) => updateSbRow(idx, 'duration', v)}>
                                      <SelectTrigger className="h-7 w-[64px] text-[10px]"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="4s">4s</SelectItem><SelectItem value="8s">8s</SelectItem><SelectItem value="15s">15s</SelectItem><SelectItem value="30s">30s</SelectItem><SelectItem value="45s">45s</SelectItem><SelectItem value="60s">60s</SelectItem><SelectItem value="90s">90s</SelectItem><SelectItem value="120s">2m</SelectItem><SelectItem value="180s">3m</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="shrink-0">
                                    <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">LLM</div>
                                    <Select value={row.llm || 'gemini-pro-3'} onValueChange={(v) => updateSbRow(idx, 'llm', v)}>
                                      <SelectTrigger className="h-7 w-[120px] text-[10px]"><SelectValue /></SelectTrigger>
                                      <SelectContent><SelectItem value="gemini-pro-3">Gemini Pro 3</SelectItem><SelectItem value="claude-4.5-sonnet">Claude 4.5 Sonnet</SelectItem><SelectItem value="gpt-5.2">GPT-5.2</SelectItem></SelectContent>
                                    </Select>
                                  </div>
                                  <div className="shrink-0">
                                    <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Image Model</div>
                                    <Select value={row.imageModel} onValueChange={(v) => updateSbRow(idx, 'imageModel', v)}>
                                      <SelectTrigger className="h-7 w-[130px] text-[10px]"><SelectValue placeholder="Default" /></SelectTrigger>
                                      <SelectContent>
                                        {imageModels.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                                        {imageModels.length === 0 && (<><SelectItem value="google/nano-banana-pro">Nano Banana Pro</SelectItem><SelectItem value="black-forest-labs/flux-schnell">Flux Schnell</SelectItem></>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="shrink-0 flex flex-col justify-end">
                                    <div className="font-mono text-[8px] uppercase tracking-wider text-transparent mb-0.5 select-none">Go</div>
                                    <button
                                      onClick={() => {
                                        setStoryboardConceptIdx(row.conceptIdx);
                                        setStoryboardVariationIdx(oConceptVariations.length);
                                        handleGenerateStoryboardOverview();
                                      }}
                                      disabled={generatingStoryboard || oGeneratedConcepts.length === 0}
                                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                      title="Generate storyboard"
                                    >
                                      {generatingStoryboard ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                                    </button>
                                  </div>
                                  {oSbRows.length > 1 && (
                                    <div className="shrink-0"><div className="font-mono text-[8px] uppercase tracking-wider text-transparent mb-0.5 select-none">X</div><button onClick={() => removeSbRow(idx)} className="h-7 inline-flex items-center justify-center rounded p-1 text-muted-foreground/40 hover:text-foreground transition-colors"><X className="h-3 w-3" /></button></div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          );
                        })()}

                        {/* Additional prompt */}
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Additional Prompt <span className="text-muted-foreground/40 normal-case">(appended to the default storyboard prompt)</span></div>
                          <textarea
                            value={(getSetting('storyboard', 'custom_prompt') as string) || ''}
                            onChange={(e) => updateStageSetting('storyboard', 'custom_prompt', e.target.value)}
                            placeholder="e.g. Make the tone darker and more cinematic. Focus on close-up shots..."
                            rows={2}
                            className="w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground resize-none focus:border-foreground focus:outline-none"
                          />
                        </div>

                        {storyboardError && <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2"><p className="text-xs text-destructive">{storyboardError}</p></div>}

                        {oCurrentSb && (
                          <>
                            <div>
                              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Storyline</div>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                className="w-full text-sm text-foreground/80 leading-relaxed bg-transparent border border-border rounded hover:border-foreground/30 focus:border-primary focus:outline-none px-3 py-2 min-h-[60px]"
                                onBlur={(e) => {
                                  const val = e.currentTarget.innerText;
                                  if (val !== oStoryline) {
                                    updateStageSetting('storyboard', `storyline_${storyboardConceptIdx}`, val);
                                  }
                                }}
                                dangerouslySetInnerHTML={{ __html: ((getSetting('storyboard', `storyline_${storyboardConceptIdx}`) as string) || oStoryline).replace(/\n/g, '<br/>') }}
                              />
                              <div className="flex items-center gap-3 mt-1">
                                <span className="font-mono text-[9px] text-muted-foreground">{oTotalCuts} cuts</span>
                                <span className="font-mono text-[9px] text-muted-foreground">{oCharacters.length} characters</span>
                                <span className="font-mono text-[9px] text-muted-foreground">{oScenes.length} scenes</span>
                                <span className="font-mono text-[9px] text-muted-foreground">{oScenes.reduce((sum, s) => sum + (parseInt(String(s.duration_hint).replace('s', '')) || 0), 0)}s total</span>
                              </div>
                            </div>

                            {/* Characters */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Characters</div>
                                <button
                                  onClick={() => {
                                    const newChar = { id: `char_${Date.now()}`, name: 'New Character', description: '', image_prompt: '', image_url: null, gs_uri: null, image_model: '' };
                                    const sbKey = `_new_characters_${storyboardConceptIdx}`;
                                    const existing = (getSetting('storyboard', sbKey) as typeof oCharacters) || [];
                                    updateStageSetting('storyboard', sbKey, [...existing, newChar]);
                                  }}
                                  className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                >+ Add Character</button>
                              </div>
                              <div className="flex gap-3 flex-wrap">
                                {oCharacters.map((char) => (
                                  <div key={char.id} className="w-[140px] rounded-lg border border-border overflow-hidden bg-muted/20">
                                    <div className="relative aspect-[3/4] bg-muted">
                                      {char.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={char.image_url} alt={char.name} className="h-full w-full object-cover" />
                                      ) : (
                                        <div className="flex h-full items-center justify-center">{generatingImages.has(char.id) ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <UserIcon className="h-5 w-5 text-muted-foreground/20" />}</div>
                                      )}
                                    </div>
                                    <div className="p-2 space-y-1">
                                      <input className="text-[10px] font-medium truncate bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-full" defaultValue={char.name} onBlur={(e) => { if (e.target.value !== char.name) updateStoryboardScene(workflowId, oCurrentSbFlatIdx, char.id, { title: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = char.name; }); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                                      <textarea className="text-[8px] text-muted-foreground leading-relaxed bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none w-full resize-none" defaultValue={char.description} rows={2} onBlur={(e) => { if (e.target.value !== char.description) updateStoryboardScene(workflowId, oCurrentSbFlatIdx, char.id, { description: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = char.description; }); }} />
                                      {imageErrors.get(char.id) && <p className="text-[8px] text-destructive line-clamp-2">{imageErrors.get(char.id)}</p>}
                                      <Button size="sm" variant="outline" onClick={() => handleGenerateImageOverview('character', char.id)} disabled={generatingImages.has(char.id)} className="w-full h-5 text-[8px]">
                                        {generatingImages.has(char.id) ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : char.image_url ? 'Regenerate' : 'Generate'}
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Scenes — horizontal scroll, editable */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Scenes</div>
                                <button
                                  onClick={() => {
                                    const newScene = { id: `scene_${Date.now()}`, scene_number: oScenes.length + 1, title: 'New Scene', description: '', shot_type: 'medium', duration_hint: '5s', character_ids: [] as string[], image_prompt: '', image_url: null, gs_uri: null, image_model: '' };
                                    const sbKey = `_new_scenes_${storyboardConceptIdx}`;
                                    const existing = (getSetting('storyboard', sbKey) as typeof oScenes) || [];
                                    updateStageSetting('storyboard', sbKey, [...existing, newScene]);
                                  }}
                                  className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                >+ Add Scene</button>
                              </div>
                              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${oScenes.length}, 1fr)` }}>
                                {oScenes.map((scene) => {
                                  const charsReady = sceneCharsReadyOverview(scene);
                                  return (
                                    <div key={scene.id} className="min-w-0 rounded-lg border border-border overflow-hidden bg-muted/20 flex flex-col">
                                      <div className="relative aspect-[9/16] bg-muted shrink-0">
                                        {scene.image_url ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={scene.image_url} alt={scene.title} className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="flex h-full items-center justify-center">{generatingImages.has(scene.id) ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <ImageIcon className="h-5 w-5 text-muted-foreground/20" />}</div>
                                        )}
                                      </div>
                                      <div className="p-2 flex flex-col gap-1 flex-1">
                                        <div className="flex items-center gap-1">
                                          <span className="font-mono text-[8px] text-muted-foreground/50">{scene.scene_number}.</span>
                                          <input className="text-[10px] font-medium bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none flex-1 min-w-0" defaultValue={scene.title} onBlur={(e) => { if (e.target.value !== scene.title) updateStoryboardScene(workflowId, oCurrentSbFlatIdx, scene.id, { title: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = scene.title; }); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                                        </div>
                                        <textarea className="text-[8px] text-muted-foreground leading-relaxed bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none w-full resize-none" defaultValue={scene.description} rows={3} onBlur={(e) => { if (e.target.value !== scene.description) updateStoryboardScene(workflowId, oCurrentSbFlatIdx, scene.id, { description: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = scene.description; }); }} />
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <input className="font-mono text-[8px] bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-[60px]" defaultValue={scene.shot_type} onBlur={(e) => { if (e.target.value !== scene.shot_type) updateStoryboardScene(workflowId, oCurrentSbFlatIdx, scene.id, { shot_type: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = scene.shot_type; }); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                                          <div className="flex items-center gap-0 rounded border border-border overflow-hidden">
                                            <button className="h-4 px-1 text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => { const cur = parseInt(String(scene.duration_hint).replace('s', '')) || 5; const next = Math.max(1, cur - 1); updateStoryboardScene(workflowId, oCurrentSbFlatIdx, scene.id, { duration_hint: `${next}s` }).then(() => loadWorkflow()); }}>-</button>
                                            <span className="font-mono text-[8px] px-1 tabular-nums">{scene.duration_hint}</span>
                                            <button className="h-4 px-1 text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => { const cur = parseInt(String(scene.duration_hint).replace('s', '')) || 5; const next = Math.min(60, cur + 1); updateStoryboardScene(workflowId, oCurrentSbFlatIdx, scene.id, { duration_hint: `${next}s` }).then(() => loadWorkflow()); }}>+</button>
                                          </div>
                                        </div>
                                        {scene.character_ids.length > 0 && (
                                          <div className="flex flex-wrap gap-0.5">
                                            {scene.character_ids.map((cid) => { const c = oCharacters.find((ch) => ch.id === cid); return <span key={cid} className="inline-flex items-center rounded-full border border-border px-1 py-px font-mono text-[7px] text-muted-foreground">{c?.name || cid}</span>; })}
                                          </div>
                                        )}
                                        {imageErrors.get(scene.id) && <p className="text-[7px] text-destructive">{imageErrors.get(scene.id)}</p>}
                                        <Button size="sm" variant="outline" onClick={() => handleGenerateImageOverview('scene', scene.id)} disabled={generatingImages.has(scene.id) || !charsReady} title={!charsReady ? 'Generate character images first' : undefined} className="w-full h-5 text-[8px] mt-auto">
                                          {generatingImages.has(scene.id) ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : !charsReady ? 'Chars required' : scene.image_url ? 'Regenerate' : 'Generate'}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}

                        {!oCurrentSb && !generatingStoryboard && oGeneratedConcepts.length > 0 && (
                          <div className="text-center py-6 text-muted-foreground/50"><ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Select a concept and click &quot;Generate Storyboard&quot; to begin</p></div>
                        )}
                        {oGeneratedConcepts.length === 0 && <div className="text-center py-6 text-muted-foreground/50"><p className="text-xs">Generate concepts first in the Concepts stage</p></div>}
                      </>
                    )}

                    {/* ── Video Generation ── */}
                    {stage.key === 'video_generation' && (
                      <>
                        {/* Storyboard selector */}
                        {oStoryboards.length > 0 && (
                          <div className="space-y-3">
                            {oStoryboards.length > 1 && (
                              <div className="max-w-xs">
                                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Storyboard</div>
                                <Select value={String(oVidSelectedSbIdx)} onValueChange={(v) => updateStageSetting('video_generation', 'selected_storyboard', Number(v))}>
                                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>{oStoryboards.map((sb, si) => { const cIdx = (sb.concept_index ?? si) as number; const cTitle = oGeneratedConcepts[cIdx]?.title || `Concept ${cIdx + 1}`; return <SelectItem key={si} value={String(si)}>{cTitle}</SelectItem>; })}</SelectContent>
                                </Select>
                              </div>
                            )}

                            {oVidSelectedSb && (
                              <>
                                <div className="rounded-lg border border-border p-3 space-y-2">
                                  <div className="flex items-center gap-2"><span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Storyline</span><span className="text-xs text-muted-foreground/50">&middot; {oVidConceptTitle}</span></div>
                                  <p className="text-sm text-foreground/80 leading-relaxed">{oVidStoryline}</p>
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-[8px] text-muted-foreground">{oVidTotalCuts} cuts</span>
                                    <span className="font-mono text-[8px] text-muted-foreground">{oVidChars.length} characters</span>
                                    <span className="font-mono text-[8px] text-muted-foreground">{oVidScenes.length} scenes</span>
                                    <span className="font-mono text-[8px] text-muted-foreground">{oVidScenes.reduce((sum, s) => sum + (parseInt(String(s.duration_hint).replace('s', '')) || 0), 0)}s total</span>
                                  </div>
                                </div>

                                {/* Scenes + Generated Videos grid */}
                                {oVidScenes.length > 0 && (() => {
                                  const vidNode = nodes.find((n) => n.stage_key === 'video_generation');
                                  const allVars = (vidNode?.output_data?.variations || []) as Array<{ id: string; title: string; preview?: string; type: string; task_id?: string; scene_number?: number; model?: string }>;
                                  const sceneVars = allVars.filter((v) => v.type === 'scene');
                                  const taskIds = [...new Set(sceneVars.map((v) => v.task_id || '').filter(Boolean))].reverse();
                                  const oOutputFmt = (getSetting('video_generation', 'output_format') as string) || 'reel_9_16';
                                  const oAspectMap: Record<string, string> = { 'reel_9_16': 'aspect-[9/16]', 'story_9_16': 'aspect-[9/16]', 'post_1_1': 'aspect-square', 'landscape_16_9': 'aspect-video' };
                                  const oVideoAspect = oAspectMap[oOutputFmt] || 'aspect-[9/16]';
                                  return (
                                    <div>
                                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Scenes</div>
                                      <div className="grid gap-2 pb-1 items-stretch" style={{ gridTemplateColumns: oVidScenes.length <= 2 ? `repeat(${oVidScenes.length}, minmax(0, 280px))` : `repeat(${oVidScenes.length}, 1fr)` }}>
                                        {oVidScenes.map((scene) => (
                                          <div key={scene.id} className="flex flex-col gap-1.5 min-w-0">
                                            <div className="rounded border border-border overflow-hidden flex flex-col flex-1">
                                              <div className={`${oVideoAspect} bg-muted relative shrink-0`}>
                                                {scene.image_url ? (
                                                  // eslint-disable-next-line @next/next/no-img-element
                                                  <img src={scene.image_url} alt={scene.title} className="h-full w-full object-cover" />
                                                ) : (
                                                  <div className="flex h-full items-center justify-center"><ImageIcon className="h-3 w-3 text-muted-foreground/20" /></div>
                                                )}
                                                <div className="absolute top-0.5 left-0.5 flex gap-0.5">
                                                  <span className="inline-flex items-center rounded-full bg-black/60 px-1 py-px font-mono text-[6px] text-white">{scene.shot_type}</span>
                                                  <span className="inline-flex items-center rounded-full bg-black/60 px-1 py-px font-mono text-[6px] text-white">{scene.duration_hint}</span>
                                                </div>
                                              </div>
                                              <div className="px-1.5 py-1 space-y-0.5 flex-1">
                                                <div className="flex items-center gap-1"><span className="font-mono text-[7px] text-muted-foreground/50">{scene.scene_number}.</span><span className="text-[8px] font-medium truncate">{scene.title}</span></div>
                                                <p className="text-[7px] text-muted-foreground leading-relaxed line-clamp-2">{scene.description}</p>
                                              </div>
                                            </div>
                                            {/* Generated videos for this scene */}
                                            {taskIds.map((tid) => {
                                              const batchVideos = sceneVars.filter((v) => v.task_id === tid);
                                              const vid = batchVideos.find((v) => v.scene_number === scene.scene_number || v.id.includes(`-scene${scene.scene_number}-`));
                                              const batchModel = batchVideos[0]?.model || '';
                                              return (
                                                <div key={tid} className="rounded border border-border overflow-hidden relative group/vid">
                                                  {vid?.preview ? (
                                                    <div className={`${oVideoAspect} bg-black relative`}>
                                                      <video src={vid.preview} className="h-full w-full object-contain bg-black [&:fullscreen]:h-screen [&:fullscreen]:w-auto [&:fullscreen]:mx-auto" controls playsInline />
                                                      <div className="absolute top-0.5 left-0.5"><span className="inline-flex items-center rounded-full bg-green-600/80 px-1 py-px font-mono text-[6px] text-white">{batchModel}</span></div>
                                                      {vid.id && <button className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white/70 hover:text-white hover:bg-red-600/80 opacity-0 group-hover/vid:opacity-100 transition-opacity flex items-center justify-center" onClick={() => deleteVideoVariation(workflowId, vid.id).then(() => loadWorkflow()).catch(() => {})}><X className="h-2.5 w-2.5" /></button>}
                                                    </div>
                                                  ) : (
                                                    <div className={`${oVideoAspect} bg-muted/50 flex items-center justify-center`}><span className="font-mono text-[8px] text-muted-foreground/40">rendering...</span></div>
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

                                {/* Full/stitched videos */}
                                {(() => {
                                  const vidNode2 = nodes.find((n) => n.stage_key === 'video_generation');
                                  const fullVars = ((vidNode2?.output_data?.variations || []) as Array<{ id: string; title: string; preview?: string; type: string }>).filter((v) => v.type !== 'scene');
                                  if (fullVars.length === 0) return null;
                                  const fmt3 = (getSetting('video_generation', 'output_format') as string) || 'reel_9_16';
                                  const fmtMap3: Record<string, string> = { 'reel_9_16': 'aspect-[9/16]', 'story_9_16': 'aspect-[9/16]', 'post_1_1': 'aspect-square', 'landscape_16_9': 'aspect-video' };
                                  const va3 = fmtMap3[fmt3] || 'aspect-[9/16]';
                                  return (
                                    <div>
                                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Generated Videos</h4>
                                      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                                        {fullVars.map((v) => (
                                          <div key={v.id} className="rounded-lg border border-border overflow-hidden bg-muted relative group/gv3">
                                            <video src={v.preview} className={`w-full ${va3} object-contain bg-black [&:fullscreen]:h-screen [&:fullscreen]:w-auto [&:fullscreen]:mx-auto`} controls playsInline />
                                            <button className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white/70 hover:text-white hover:bg-red-600/80 opacity-0 group-hover/gv3:opacity-100 transition-opacity flex items-center justify-center" onClick={() => deleteVideoVariation(workflowId, v.id).then(() => loadWorkflow()).catch(() => {})}><X className="h-3 w-3" /></button>
                                            <div className="p-1.5"><p className="text-[9px] font-medium truncate">{v.title}</p></div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </>
                            )}

                            {!oVidSelectedSb && <div className="text-center py-4 text-muted-foreground/50"><p className="text-xs">No storyboard generated yet</p></div>}
                          </div>
                        )}

                        {oStoryboards.length === 0 && (
                          <div className="rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground/50"><p className="text-xs">Generate a storyboard first</p></div>
                        )}

                        {/* Additional Prompt */}
                        {oVidSelectedSb && (
                          <div>
                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Additional Prompt <span className="text-muted-foreground/40 normal-case">(appended to the default video generation prompt)</span></div>
                            <textarea className="w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground resize-none focus:border-foreground focus:outline-none" rows={2} placeholder="e.g. Use slow motion for dramatic scenes. Add lens flare effects..." value={(getSetting('video_generation', 'custom_prompt') as string) || ''} onChange={(e) => updateStageSetting('video_generation', 'custom_prompt', e.target.value)} />
                          </div>
                        )}

                        {/* Model allocations */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{oTotalCreatives} creatives</div>
                            <button onClick={addVidRow} className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">+ Add Variation</button>
                          </div>
                          <div className="space-y-1.5">
                            {oAllocations.map((alloc, idx) => (
                              <div key={idx} className="space-y-0.5">
                                <div className="flex items-end gap-1.5 flex-wrap">
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
                                        <SelectItem value="minimax/hailuo-2.3">Hailuo 2.3 — MiniMax</SelectItem>
                                        <SelectItem value="pixverse/pixverse-v5">PixVerse v5</SelectItem>
                                        <SelectItem value="bytedance/seedance-1-pro">Seedance 1 Pro — ByteDance</SelectItem>
                                        <SelectItem value="luma/ray-2-720p">Ray 2 720p — Luma</SelectItem>
                                        <SelectItem value="wan-video/wan-2.5-t2v">Wan 2.5 T2V — Alibaba</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="shrink-0">
                                    <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Format</div>
                                    <Select value={(getSetting('video_generation', 'output_format') as string) || 'reel_9_16'} onValueChange={(v) => updateStageSetting('video_generation', 'output_format', v)}>
                                      <SelectTrigger className="h-7 w-[95px] text-[10px]"><SelectValue placeholder="Format" /></SelectTrigger>
                                      <SelectContent><SelectItem value="reel_9_16">Reel 9:16</SelectItem><SelectItem value="story_9_16">Story 9:16</SelectItem><SelectItem value="post_1_1">Post 1:1</SelectItem><SelectItem value="landscape_16_9">16:9</SelectItem></SelectContent>
                                    </Select>
                                  </div>
                                  <div className="shrink-0">
                                    <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Res</div>
                                    <Select value={(getSetting('video_generation', 'resolution') as string) || ''} onValueChange={(v) => updateStageSetting('video_generation', 'resolution', v)}>
                                      <SelectTrigger className="h-7 w-[70px] text-[10px]"><SelectValue placeholder="Res" /></SelectTrigger>
                                      <SelectContent><SelectItem value="720p">720p</SelectItem><SelectItem value="1080p">1080p</SelectItem><SelectItem value="4k">4K</SelectItem></SelectContent>
                                    </Select>
                                  </div>
                                  <div className="shrink-0">
                                    <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Temp</div>
                                    <Select value={(getSetting('video_generation', 'temperature') as string) || '0.7'} onValueChange={(v) => updateStageSetting('video_generation', 'temperature', v)}>
                                      <SelectTrigger className="h-7 w-[60px] text-[10px]"><SelectValue /></SelectTrigger>
                                      <SelectContent><SelectItem value="0.3">0.3</SelectItem><SelectItem value="0.5">0.5</SelectItem><SelectItem value="0.7">0.7</SelectItem><SelectItem value="0.9">0.9</SelectItem><SelectItem value="1.0">1.0</SelectItem></SelectContent>
                                    </Select>
                                  </div>
                                  <div className="shrink-0 flex flex-col justify-end">
                                    <div className="font-mono text-[8px] uppercase tracking-wider text-transparent mb-0.5 select-none">Go</div>
                                    <button onClick={() => handleGenerateRowOverview(idx)} disabled={!alloc.model || oVidGeneratingRows.includes(idx) || oStoryboards.length === 0} className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Generate">
                                      {oVidGeneratingRows.includes(idx) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                                    </button>
                                  </div>
                                  {oAllocations.length > 1 && (
                                    <div className="shrink-0"><div className="font-mono text-[8px] uppercase tracking-wider text-transparent mb-0.5 select-none">X</div><button onClick={() => removeVidRow(idx)} className="h-7 inline-flex items-center justify-center rounded p-1 text-muted-foreground/40 hover:text-foreground transition-colors"><X className="h-3 w-3" /></button></div>
                                  )}
                                </div>
                                {oVidRowErrors[idx] && <p className="text-[8px] text-destructive pl-[62px]">{oVidRowErrors[idx]}</p>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Video jobs */}
                        {videoJobs.length > 0 && (
                          <div>
                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Jobs</div>
                            <div className="space-y-1">
                              {videoJobs.map((job) => (
                                <div key={job.task_id} className="flex items-center gap-2 text-[10px] font-mono">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${job.status === 'completed' ? 'bg-green-500' : job.status === 'failed' || job.scenes_failed === job.scenes_total ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                                  <span className="text-muted-foreground truncate">{job.model}</span>
                                  <span className="text-muted-foreground/60">{job.scenes_done}/{job.scenes_total}</span>
                                  {job.scenes_failed > 0 && <span className="text-red-500">{job.scenes_failed}&#x2717;</span>}
                                  <span className="text-muted-foreground/40 truncate">{job.task_id.slice(0, 8)}</span>
                                  <button className="ml-auto shrink-0 h-4 w-4 rounded hover:bg-destructive/20 text-muted-foreground/40 hover:text-destructive flex items-center justify-center transition-colors" onClick={() => deleteVideoJob(workflowId, job.task_id).then(() => loadWorkflow()).catch(() => {})} title="Delete job"><X className="h-2.5 w-2.5" /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    </div>
                    <div className="mt-6 border-b border-border" />
                  </section>
                );
              })}

            </div>
          </div>
          );
        })()}

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
                {openStageKey === 'strategy_assets' && (
                  <>
                    {/* Campaign selector */}
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Megaphone className="h-3 w-3" /> Campaign
                      </div>
                      {campaigns.length > 0 ? (
                        <Select value={selectedCampaignId || undefined} onValueChange={handleSelectCampaign}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select campaign" />
                          </SelectTrigger>
                          <SelectContent>
                            {campaigns.map((c) => (
                              <SelectItem key={c._id} value={c._id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : <p className="text-xs text-muted-foreground/50">No campaigns for this brand</p>}
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
                      ) : <p className="text-xs text-muted-foreground/50">{selectedCampaignId ? 'No strategies for this campaign' : 'Select a campaign first'}</p>}
                    </div>

                    {/* Assets — brands-style list */}
                    <div>
                      {renderAssetList()}
                    </div>
                  </>
                )}

                {/* ── Scheduling ── */}
                {openStageKey === 'scheduling' && (
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Frequency</div>
                      <Select value={(getSetting('scheduling', 'frequency') as string) || ''} onValueChange={(v) => updateStageSetting('scheduling', 'frequency', v)}><SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Frequency" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="3x_week">3x / week</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Start</div>
                      <input type="date" value={(getSetting('scheduling', 'start_date') as string) || ''} onChange={(e) => updateStageSetting('scheduling', 'start_date', e.target.value)} className="h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">End</div>
                      <input type="date" value={(getSetting('scheduling', 'end_date') as string) || ''} onChange={(e) => updateStageSetting('scheduling', 'end_date', e.target.value)} className="h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Post Time</div>
                      <Select value={postTimeValue || undefined} onValueChange={handlePostTimeChange}>
                        <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Select time" /></SelectTrigger>
                        <SelectContent className="max-h-[240px]">
                          {['AM', 'PM'].flatMap((p) => [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].flatMap((h) => ['00', '15', '30', '45'].map((m) => {
                            const val = `${h}:${m} ${p}`;
                            return <SelectItem key={val} value={val}>{val}</SelectItem>;
                          })))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Timezone</div>
                      <Select value={(getSetting('scheduling', 'timezone') as string) || ''} onValueChange={(v) => updateStageSetting('scheduling', 'timezone', v)}>
                        <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Timezone" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                          <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                          <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="Europe/London">London (GMT)</SelectItem>
                          <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                          <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                          <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
                        <button onClick={addConceptRow} className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">+ Add Variation</button>
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
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{rows.length} variation{rows.length !== 1 ? 's' : ''}</div>
                        <button onClick={addImgRow} className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">+ Add Variation</button>
                      </div>
                      <div className="space-y-1.5">
                        {rows.map((row, idx) => (
                          <div key={idx} className="flex items-end gap-1.5">
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Concept</div>
                              <Select value={String(row.conceptIdx)} onValueChange={(v) => updateImgRow(idx, 'conceptIdx', Number(v))}>
                                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Concept" /></SelectTrigger>
                                <SelectContent>
                                  {generatedConcepts.map((c, i) => (
                                    <SelectItem key={i} value={String(i)}>{c.title}</SelectItem>
                                  ))}
                                  {generatedConcepts.length === 0 && <SelectItem value="0" disabled>No concepts yet</SelectItem>}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="shrink-0">
                              <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">LLM</div>
                              <Select value={row.llm} onValueChange={(v) => updateImgRow(idx, 'llm', v)}>
                                <SelectTrigger className="h-7 w-[140px] text-[10px]"><SelectValue placeholder="LLM" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="gemini-pro-3">Gemini Pro 3</SelectItem>
                                  <SelectItem value="claude-4.5-sonnet">Claude 4.5 Sonnet</SelectItem>
                                  <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="shrink-0">
                              <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Image Model</div>
                              <Select value={row.imageModel} onValueChange={(v) => updateImgRow(idx, 'imageModel', v)}>
                                <SelectTrigger className="h-7 w-[160px] text-[10px]"><SelectValue placeholder="Image model" /></SelectTrigger>
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
                            <div className="shrink-0 flex flex-col justify-end">
                              <div className="font-mono text-[8px] uppercase tracking-wider text-transparent mb-0.5 select-none">Go</div>
                              <button disabled={generatedConcepts.length === 0} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Generate">
                                <Bot className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {rows.length > 1 && (
                              <div className="shrink-0"><div className="font-mono text-[8px] uppercase tracking-wider text-transparent mb-0.5 select-none">X</div><button onClick={() => removeImgRow(idx)} className="h-7 inline-flex items-center justify-center rounded p-1 text-muted-foreground/40 hover:text-foreground transition-colors"><X className="h-3 w-3" /></button></div>
                            )}
                          </div>
                        ))}
                      </div>
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
                  const conceptVariations = storyboards.filter((sb) => (sb.concept_index as number) === storyboardConceptIdx);
                  const currentStoryboard = conceptVariations[storyboardVariationIdx] || conceptVariations[0] as Record<string, unknown> | undefined;
                  const currentSbFlatIdx = currentStoryboard ? storyboards.indexOf(currentStoryboard) : 0;

                  type StoryboardCharacter = { id: string; name: string; description: string; image_prompt: string; image_url: string | null; gs_uri: string | null; image_model: string };
                  type StoryboardScene = { id: string; scene_number: number; title: string; description: string; shot_type: string; duration_hint: string; character_ids: string[]; image_prompt: string; image_url: string | null; gs_uri: string | null; image_model: string };

                  const newChars = (getSetting('storyboard', `_new_characters_${storyboardConceptIdx}`) as StoryboardCharacter[]) || [];
                  const newScenes = (getSetting('storyboard', `_new_scenes_${storyboardConceptIdx}`) as StoryboardScene[]) || [];
                  const characters = [...(currentStoryboard?.characters || []) as StoryboardCharacter[], ...newChars];
                  const scenes = [...(currentStoryboard?.scenes || []) as StoryboardScene[], ...newScenes];
                  const storyline = (currentStoryboard?.storyline || '') as string;
                  const totalCuts = (currentStoryboard?.total_cuts || 0) as number;

                  const handleGenerateStoryboard = async () => {
                    if (generatedConcepts.length === 0) return;
                    setGeneratingStoryboard(true);
                    setStoryboardError(null);
                    try {
                      await generateStoryboard(workflowId, storyboardConceptIdx, storyboardLlmModel || undefined, storyboardImageModel || undefined);
                      await loadWorkflow();
                      // Select the newly created variation (it will be appended at the end)
                      setStoryboardVariationIdx(conceptVariations.length);
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
                      const { task_id } = await generateStoryboardImage(workflowId, storyboardConceptIdx, targetType, targetId, model || storyboardImageModel || undefined, storyboardVariationIdx);
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
                    {/* Concept row */}
                    <div>
                      <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Concept</div>
                      <Select value={String(storyboardConceptIdx)} onValueChange={(v) => { setStoryboardConceptIdx(Number(v)); setStoryboardVariationIdx(0); }}>
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

                    {/* Variation header + Settings row */}
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{conceptVariations.length} storyline{conceptVariations.length !== 1 ? 's' : ''}</div>
                      <button onClick={handleGenerateStoryboard} disabled={generatingStoryboard || generatedConcepts.length === 0} className="font-mono text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1">
                        {generatingStoryboard && <Loader2 className="h-3 w-3 animate-spin" />}
                        + Add Variation
                      </button>
                    </div>
                    <div className="flex flex-wrap items-end gap-1.5">
                      {conceptVariations.length > 0 && (
                        <div>
                          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Storyline</div>
                          <Select value={String(storyboardVariationIdx)} onValueChange={(v) => setStoryboardVariationIdx(Number(v))}>
                            <SelectTrigger className="h-7 w-[120px] text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {conceptVariations.map((_, i) => (
                                <SelectItem key={i} value={String(i)}>Variation {i + 1}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                        <div>
                          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Characters</div>
                          <div className="flex items-center h-7 rounded-md border border-border overflow-hidden">
                            <button className="h-full px-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => { const v = Math.max(1, parseInt((getSetting('storyboard', 'num_characters') as string) || '3') - 1); updateStageSetting('storyboard', 'num_characters', String(v)); }}>-</button>
                            <span className="w-[28px] text-center text-[10px] font-medium tabular-nums">{(getSetting('storyboard', 'num_characters') as string) || '3'}</span>
                            <button className="h-full px-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => { const v = Math.min(20, parseInt((getSetting('storyboard', 'num_characters') as string) || '3') + 1); updateStageSetting('storyboard', 'num_characters', String(v)); }}>+</button>
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Scenes</div>
                          <div className="flex items-center h-7 rounded-md border border-border overflow-hidden">
                            <button className="h-full px-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => { const v = Math.max(1, parseInt((getSetting('storyboard', 'num_scenes') as string) || '6') - 1); updateStageSetting('storyboard', 'num_scenes', String(v)); }}>-</button>
                            <span className="w-[28px] text-center text-[10px] font-medium tabular-nums">{(getSetting('storyboard', 'num_scenes') as string) || '6'}</span>
                            <button className="h-full px-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => { const v = Math.min(50, parseInt((getSetting('storyboard', 'num_scenes') as string) || '6') + 1); updateStageSetting('storyboard', 'num_scenes', String(v)); }}>+</button>
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Duration</div>
                          <Select value={(getSetting('storyboard', 'target_duration') as string) || '30s'} onValueChange={(v) => updateStageSetting('storyboard', 'target_duration', v)}>
                            <SelectTrigger className="h-7 w-[72px] text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="4s">4s</SelectItem>
                              <SelectItem value="8s">8s</SelectItem>
                              <SelectItem value="15s">15s</SelectItem>
                              <SelectItem value="30s">30s</SelectItem>
                              <SelectItem value="45s">45s</SelectItem>
                              <SelectItem value="60s">60s</SelectItem>
                              <SelectItem value="90s">90s</SelectItem>
                              <SelectItem value="120s">2m</SelectItem>
                              <SelectItem value="180s">3m</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="shrink-0">
                          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">LLM</div>
                          <Select value={storyboardLlmModel} onValueChange={setStoryboardLlmModel}>
                            <SelectTrigger className="h-7 w-[120px] text-[10px]"><SelectValue placeholder="LLM" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gemini-pro-3">Gemini Pro 3</SelectItem>
                              <SelectItem value="claude-4.5-sonnet">Claude 4.5 Sonnet</SelectItem>
                              <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="shrink-0">
                          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Image Model</div>
                          <Select value={storyboardImageModel} onValueChange={setStoryboardImageModel}>
                            <SelectTrigger className="h-7 w-[120px] text-[10px]"><SelectValue placeholder="Default" /></SelectTrigger>
                            <SelectContent>
                              {imageModels.map((m) => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                              ))}
                              {imageModels.length === 0 && (
                                <>
                                  <SelectItem value="google/nano-banana-pro">Nano Banana Pro</SelectItem>
                                  <SelectItem value="black-forest-labs/flux-schnell">Flux Schnell</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                    {/* Additional prompt */}
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Additional Prompt <span className="text-muted-foreground/40 normal-case">(appended to the default storyboard prompt)</span></div>
                      <textarea
                        value={(getSetting('storyboard', 'custom_prompt') as string) || ''}
                        onChange={(e) => updateStageSetting('storyboard', 'custom_prompt', e.target.value)}
                        placeholder="e.g. Make the tone darker and more cinematic. Focus on close-up shots..."
                        rows={2}
                        className="w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground resize-none focus:border-foreground focus:outline-none"
                      />
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
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            className="w-full text-sm text-foreground/80 leading-relaxed bg-transparent border border-border rounded hover:border-foreground/30 focus:border-primary focus:outline-none px-3 py-2 min-h-[60px]"
                            onBlur={(e) => {
                              const val = e.currentTarget.innerText;
                              if (val !== storyline) {
                                updateStageSetting('storyboard', `storyline_${storyboardConceptIdx}`, val);
                              }
                            }}
                            dangerouslySetInnerHTML={{ __html: ((getSetting('storyboard', `storyline_${storyboardConceptIdx}`) as string) || storyline).replace(/\n/g, '<br/>') }}
                          />
                          <div className="flex items-center gap-3 mt-1">
                            <span className="font-mono text-[9px] text-muted-foreground">{totalCuts} cuts</span>
                            <span className="font-mono text-[9px] text-muted-foreground">{characters.length} characters</span>
                            <span className="font-mono text-[9px] text-muted-foreground">{scenes.length} scenes</span>
                            <span className="font-mono text-[9px] text-muted-foreground">{scenes.reduce((sum, s) => sum + (parseInt(String(s.duration_hint).replace('s', '')) || 0), 0)}s total</span>
                          </div>
                        </div>

                        {/* Characters */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                              Characters <span className="text-muted-foreground/40">(generate these first for visual consistency)</span>
                            </div>
                            <button
                              onClick={() => {
                                const newChar = { id: `char_${Date.now()}`, name: 'New Character', description: '', image_prompt: '', image_url: null, gs_uri: null, image_model: '' };
                                const sbKey = `_new_characters_${storyboardConceptIdx}`;
                                const existing = (getSetting('storyboard', sbKey) as typeof characters) || [];
                                updateStageSetting('storyboard', sbKey, [...existing, newChar]);
                              }}
                              className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >+ Add Character</button>
                          </div>
                          <div className="flex gap-3 flex-wrap">
                            {characters.map((char) => (
                              <div key={char.id} className="w-[140px] rounded-lg border border-border overflow-hidden bg-muted/20">
                                <div className="relative aspect-[3/4] bg-muted">
                                  {char.image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={char.image_url} alt={char.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full items-center justify-center">
                                      {generatingImages.has(char.id) ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <UserIcon className="h-6 w-6 text-muted-foreground/20" />}
                                    </div>
                                  )}
                                </div>
                                <div className="p-2 space-y-1">
                                  <input className="text-[10px] font-medium truncate bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-full" defaultValue={char.name} onBlur={(e) => { if (e.target.value !== char.name) updateStoryboardScene(workflowId as string, currentSbFlatIdx, char.id, { title: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = char.name; }); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                                  <textarea className="text-[8px] text-muted-foreground leading-relaxed bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none w-full resize-none" defaultValue={char.description} rows={2} onBlur={(e) => { if (e.target.value !== char.description) updateStoryboardScene(workflowId as string, currentSbFlatIdx, char.id, { description: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = char.description; }); }} />
                                  {imageErrors.get(char.id) && <p className="text-[8px] text-destructive line-clamp-2">{imageErrors.get(char.id)}</p>}
                                  <Button size="sm" variant="outline" onClick={() => handleGenerateImage('character', char.id)} disabled={generatingImages.has(char.id)} className="w-full h-6 text-[9px]">
                                    {generatingImages.has(char.id) ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : char.image_url ? 'Regenerate' : 'Generate'}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Scenes — horizontal scroll, editable */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Scenes</div>
                            <button
                              onClick={() => {
                                const newScene = { id: `scene_${Date.now()}`, scene_number: scenes.length + 1, title: 'New Scene', description: '', shot_type: 'medium', duration_hint: '5s', character_ids: [] as string[], image_prompt: '', image_url: null, gs_uri: null, image_model: '' };
                                const sbKey = `_new_scenes_${storyboardConceptIdx}`;
                                const existing = (getSetting('storyboard', sbKey) as typeof scenes) || [];
                                updateStageSetting('storyboard', sbKey, [...existing, newScene]);
                              }}
                              className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >+ Add Scene</button>
                          </div>
                          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${scenes.length}, 1fr)` }}>
                            {scenes.map((scene) => {
                              const charsReady = sceneCharsReady(scene);
                              return (
                                <div key={scene.id} className="min-w-0 rounded-lg border border-border overflow-hidden bg-muted/20 flex flex-col">
                                  <div className="relative aspect-[9/16] bg-muted shrink-0">
                                    {scene.image_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={scene.image_url} alt={scene.title} className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="flex h-full items-center justify-center">{generatingImages.has(scene.id) ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <ImageIcon className="h-5 w-5 text-muted-foreground/20" />}</div>
                                    )}
                                  </div>
                                  <div className="p-2 flex flex-col gap-1 flex-1">
                                    <div className="flex items-center gap-1">
                                      <span className="font-mono text-[8px] text-muted-foreground/50">{scene.scene_number}.</span>
                                      <input className="text-[10px] font-medium bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none flex-1 min-w-0" defaultValue={scene.title} onBlur={(e) => { if (e.target.value !== scene.title) updateStoryboardScene(workflowId as string, currentSbFlatIdx, scene.id, { title: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = scene.title; }); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                                    </div>
                                    <textarea className="text-[8px] text-muted-foreground leading-relaxed bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none w-full resize-none" defaultValue={scene.description} rows={3} onBlur={(e) => { if (e.target.value !== scene.description) updateStoryboardScene(workflowId as string, currentSbFlatIdx, scene.id, { description: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = scene.description; }); }} />
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <input className="font-mono text-[8px] bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-[60px]" defaultValue={scene.shot_type} onBlur={(e) => { if (e.target.value !== scene.shot_type) updateStoryboardScene(workflowId as string, currentSbFlatIdx, scene.id, { shot_type: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = scene.shot_type; }); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                                      <div className="flex items-center gap-0 rounded border border-border overflow-hidden">
                                        <button className="h-4 px-1 text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => { const cur = parseInt(String(scene.duration_hint).replace('s', '')) || 5; const next = Math.max(1, cur - 1); updateStoryboardScene(workflowId as string, currentSbFlatIdx, scene.id, { duration_hint: `${next}s` }).then(() => loadWorkflow()); }}>-</button>
                                        <span className="font-mono text-[8px] px-1 tabular-nums">{scene.duration_hint}</span>
                                        <button className="h-4 px-1 text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => { const cur = parseInt(String(scene.duration_hint).replace('s', '')) || 5; const next = Math.min(60, cur + 1); updateStoryboardScene(workflowId as string, currentSbFlatIdx, scene.id, { duration_hint: `${next}s` }).then(() => loadWorkflow()); }}>+</button>
                                      </div>
                                    </div>
                                    {scene.character_ids.length > 0 && (
                                      <div className="flex flex-wrap gap-0.5">
                                        {scene.character_ids.map((cid) => { const char = characters.find((c) => c.id === cid); return <span key={cid} className="inline-flex items-center rounded-full border border-border px-1 py-px font-mono text-[7px] text-muted-foreground">{char?.name || cid}</span>; })}
                                      </div>
                                    )}
                                    {imageErrors.get(scene.id) && <p className="text-[7px] text-destructive">{imageErrors.get(scene.id)}</p>}
                                    <Button size="sm" variant="outline" onClick={() => handleGenerateImage('scene', scene.id)} disabled={generatingImages.has(scene.id) || !charsReady} title={!charsReady ? 'Generate character images first' : undefined} className="w-full h-5 text-[8px] mt-auto">
                                      {generatingImages.has(scene.id) ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : !charsReady ? 'Chars required' : scene.image_url ? 'Regenerate' : 'Generate'}
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
                      const outputFormat = (getSetting('video_generation', 'output_format') as string) || 'reel_9_16';
                      const resolution = (getSetting('video_generation', 'resolution') as string) || undefined;
                      const temperature = parseFloat((getSetting('video_generation', 'temperature') as string) || '0.7');

                      const customPrompt = (getSetting('video_generation', 'custom_prompt') as string) || undefined;

                      const { task_id } = await generateVideo(
                        workflowId,
                        selectedSbIdx,
                        parseInt(alloc.count) || 1,
                        alloc.model,
                        outputFormat,
                        resolution,
                        temperature,
                        customPrompt,
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
                          <div className="max-w-sm">
                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Storyboard</div>
                            <Select value={String(selectedSbIdx)} onValueChange={(v) => updateStageSetting('video_generation', 'selected_storyboard', Number(v))}>
                              <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {storyboards.map((sb, i) => {
                                  const cIdx = (sb.concept_index ?? i) as number;
                                  const vIdx = (sb.variation_index ?? 0) as number;
                                  const cTitle = generatedConcepts[cIdx]?.title || `Concept ${cIdx + 1}`;
                                  const hasVariations = storyboards.filter((s) => (s.concept_index as number) === cIdx).length > 1;
                                  const label = hasVariations ? `${cTitle} — Storyline ${vIdx + 1}` : cTitle;
                                  return <SelectItem key={i} value={String(i)}>{label}</SelectItem>;
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
                              const outputFormat = (getSetting('video_generation', 'output_format') as string) || 'reel_9_16';
                              const aspectMap: Record<string, string> = { 'reel_9_16': 'aspect-[9/16]', 'story_9_16': 'aspect-[9/16]', 'post_1_1': 'aspect-square', 'landscape_16_9': 'aspect-video' };
                              const videoAspect = aspectMap[outputFormat] || 'aspect-[9/16]';
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
                                                  className="h-full w-full object-contain bg-black [&:fullscreen]:h-screen [&:fullscreen]:w-auto [&:fullscreen]:mx-auto"
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
                      const fmt2 = (getSetting('video_generation', 'output_format') as string) || 'reel_9_16';
                      const fmtMap2: Record<string, string> = { 'reel_9_16': 'aspect-[9/16]', 'story_9_16': 'aspect-[9/16]', 'post_1_1': 'aspect-square', 'landscape_16_9': 'aspect-video' };
                      const vidAspect2 = fmtMap2[fmt2] || 'aspect-[9/16]';
                      return (
                        <div className="mb-4 border-b border-border pb-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Generated Videos</h4>
                          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            {vidVariations.map((v) => (
                              <div key={v.id} className="rounded-lg border border-border overflow-hidden bg-muted relative group/gv2">
                                <video
                                  src={v.preview}
                                  className={`w-full ${vidAspect2} object-contain bg-black [&:fullscreen]:h-screen [&:fullscreen]:w-auto [&:fullscreen]:mx-auto`}
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

                    {/* Additional Prompt */}
                    {selectedSb && (
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Additional Prompt <span className="text-muted-foreground/40 normal-case">(appended to the default video generation prompt)</span></div>
                        <textarea
                          className="w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground resize-none focus:border-foreground focus:outline-none"
                          rows={2}
                          placeholder="e.g. Use slow motion for dramatic scenes. Add lens flare effects..."
                          value={(getSetting('video_generation', 'custom_prompt') as string) || ''}
                          onChange={(e) => updateStageSetting('video_generation', 'custom_prompt', e.target.value)}
                        />
                      </div>
                    )}

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
                                <Select value={(getSetting('video_generation', 'output_format') as string) || 'reel_9_16'} onValueChange={(v) => updateStageSetting('video_generation', 'output_format', v)}>
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
                                  className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Generate"
                                >
                                  {vidGeneratingRows.includes(idx) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
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

      {/* Asset management dialogs */}
      {renderAddAssetDialog()}
      {renderAssetViewerDialog()}
    </div>
  );
}
