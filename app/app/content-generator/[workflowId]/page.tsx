"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Play, ListChecks, GitBranch,
  CheckCircle2, Circle, Loader2, XCircle, Clock,
  MoreHorizontal, CalendarClock, Copy, Download, Star, Trash2,
  ChevronLeft, ChevronRight, ChevronDown, Bot, User as UserIcon, Image as ImageIcon,
  Megaphone, Paperclip, Settings2, X, Pencil,
  Film, Music, Type as TypeIconLucide, Eye, Check, Plus, Upload,
  FileText, BarChart2, Globe, ExternalLink, Layers, CircleDot, Clapperboard, RefreshCw,
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
import ResearchStagePanel from '../components/ResearchStagePanel';
import FeedbackBar from '../components/FeedbackBar';
import NavMenu from '@/components/NavMenu';
import {
  getContentWorkflow,
  getContentWorkflows,
  getContentNodes,
  runContentPipeline,
  approveContentStage,
  advanceContentStage,
  submitStageInput,
  resetStage,
  getUserMe,
  getContentTimeline,
  createContentTimelineEntry,
  updateContentWorkflow,
  createContentWorkflow,
  deleteContentWorkflow,
  getCampaigns,
  getBrands,
  createBrand,
  getOrganizations,
  createOrganization,
  generateConcepts,
  getImageModels,
  generateConceptImage,
  pollConceptImageStatus,
  generateStoryboard,
  deleteStoryboard,
  generateStoryboardImage,
  getStoryboardImageStatus,
  generateVideo,
  getVideoStatus,
  updateStoryboardScene,
  getVideoJobs,
  deleteVideoJob,
  deleteVideoVariation,
  runContentSimulation,
  getPersonas,
  runPredictiveModeling,
  runContentRanking,
  listCalendarItems,
  createCalendarItem,
  updateCalendarItem,
  deleteCalendarItem,
  migrateCalendar,
} from '../lib/api';
import type { VideoJob, SimulationResult, Persona, PredictionResult, PredictionBenchmarks, RankingResult } from '../lib/api';
import type { Campaign } from '../lib/api';
import { getBrandAssets, createBrandAsset, uploadBrandAsset, deleteBrandAsset, getStrategies, updateBrand } from '../../brands/lib/api';
import type { BrandAsset, Strategy } from '../../brands/lib/types';
import type { Brand } from '../../brands/lib/types';
import type { ContentWorkflow, ContentWorkflowNode, ContentTimelineEntry } from '../lib/types';
import { CONTENT_PIPELINE_STAGES, CONTENT_STAGE_LABELS } from '../lib/types';

type TabMode = 'overview' | 'steps' | 'graph' | 'content';

// Platform → Content Type options
const PLATFORM_OPTIONS = [
  { id: 'instagram', label: 'Instagram' },
] as const;

const CONTENT_TYPE_OPTIONS: Record<string, { id: string; label: string }[]> = {
  instagram: [{ id: 'reel', label: 'Reel' }, { id: 'carousel', label: 'Carousel' }, { id: 'story', label: 'Story' }, { id: 'post', label: 'Post' }],
};

interface ContentEntry {
  id: string; // stable UUID — survives reorder / delete
  platform: string;
  content_type: string;
  frequency?: string;
  days?: number[]; // 0=Sun,1=Mon,...6=Sat
  start_date?: string;
  end_date?: string;
  post_time?: string;
  timezone?: string;
}

/** First-class calendar item — individually movable, editable, deletable. */
interface ContentItem {
  content_id: string;  // crypto.randomUUID() — stable forever
  date: string;        // "YYYY-MM-DD" — editable (move)
  platform: string;
  content_type: string;
  post_time?: string;
  timezone?: string;
}

/** Group content items by day-of-month for the given month. */
function getContentItemsByDate(items: ContentItem[], year: number, month: number): Map<number, ContentItem[]> {
  const map = new Map<number, ContentItem[]>();
  for (const item of items) {
    const d = new Date(item.date + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      map.set(day, [...(map.get(day) || []), item]);
    }
  }
  return map;
}

/** Expand a scheduling rule into individual ContentItem objects. */
function materializeItems(entry: ContentEntry): ContentItem[] {
  const items: ContentItem[] = [];
  if (!entry.start_date) return items;
  const start = new Date(entry.start_date + 'T00:00:00');
  const end = entry.end_date ? new Date(entry.end_date + 'T00:00:00') : start;
  const freq = entry.frequency || 'once';
  const selectedDays = entry.days && entry.days.length > 0 ? entry.days : null;
  const base = { platform: entry.platform, content_type: entry.content_type, post_time: entry.post_time, timezone: entry.timezone };
  if (freq === 'once') {
    items.push({ ...base, content_id: crypto.randomUUID(), date: entry.start_date });
    return items;
  }
  const cur = new Date(start);
  while (cur <= end) {
    let include = false;
    if (freq === 'daily') {
      include = selectedDays ? selectedDays.includes(cur.getDay()) : true;
    } else if (freq === 'weekly') {
      include = selectedDays ? selectedDays.includes(cur.getDay()) : cur.getDay() === start.getDay();
    } else if (freq === '3x_week') {
      include = selectedDays ? selectedDays.includes(cur.getDay()) : [1, 3, 5].includes(cur.getDay());
    } else if (freq === 'custom') {
      include = selectedDays ? selectedDays.includes(cur.getDay()) : false;
    }
    if (include) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      items.push({ ...base, content_id: crypto.randomUUID(), date: `${y}-${m}-${d}` });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return items;
}

/** Migrate old content_entries into content_items (one-time backfill). */
function migrateEntriesToItems(entries: ContentEntry[]): ContentItem[] {
  const items: ContentItem[] = [];
  for (const entry of entries) {
    items.push(...materializeItems(entry));
  }
  return items;
}

// Content-type-specific concept interfaces
interface ReelConcept { content_type: 'reel'; title: string; hook: string; script: string | string[]; audio_cues?: string; duration?: string; tone?: string; }
interface CarouselConcept { content_type: 'carousel'; title: string; slides: Array<{ image_description: string; caption: string }>; messaging?: string[]; tone?: string; }
interface PostConcept { content_type: 'post'; title: string; image_description: string; caption: string; messaging?: string[]; tone?: string; }
interface StoryConcept { content_type: 'story'; title: string; frame_description: string; caption: string; cta?: string; tone?: string; }
type GeneratedConcept = ReelConcept | CarouselConcept | PostConcept | StoryConcept | { content_type?: string; title: string; hook: string; script: string | string[]; messaging?: string[]; tone?: string };

const FREQUENCY_LABELS: Record<string, string> = { once: 'Once', daily: 'Daily', '3x_week': '3x / week', weekly: 'Weekly', custom: 'Custom' };
const DAY_LABELS = [
  { id: 0, short: 'S', label: 'Sun' },
  { id: 1, short: 'M', label: 'Mon' },
  { id: 2, short: 'T', label: 'Tue' },
  { id: 3, short: 'W', label: 'Wed' },
  { id: 4, short: 'T', label: 'Thu' },
  { id: 5, short: 'F', label: 'Fri' },
  { id: 6, short: 'S', label: 'Sat' },
] as const;
const TIMEZONE_LABELS: Record<string, string> = {
  'America/New_York': 'Eastern (ET)', 'America/Chicago': 'Central (CT)', 'America/Denver': 'Mountain (MT)',
  'America/Los_Angeles': 'Pacific (PT)', 'UTC': 'UTC', 'Europe/London': 'London (GMT)',
  'Europe/Paris': 'Paris (CET)', 'Asia/Tokyo': 'Tokyo (JST)', 'Asia/Dubai': 'Dubai (GST)', 'Australia/Sydney': 'Sydney (AEST)',
};

function getPlatformLabel(id: string) { return PLATFORM_OPTIONS.find((p) => p.id === id)?.label || id; }
function getContentTypeLabel(platform: string, ct: string) { return CONTENT_TYPE_OPTIONS[platform]?.find((t) => t.id === ct)?.label || ct; }

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500',
};

// Content type colors for calendar entries
const CONTENT_TYPE_COLORS: Record<string, string> = {
  reel: 'bg-purple-500/15', carousel: 'bg-amber-500/15', story: 'bg-rose-400/15', post: 'bg-emerald-500/15',
  video: 'bg-indigo-500/15', short: 'bg-red-400/15', thread: 'bg-slate-400/15', article: 'bg-teal-500/15',
};
const CONTENT_TYPE_COLORS_TEXT: Record<string, string> = {
  reel: 'text-purple-600', carousel: 'text-amber-600', story: 'text-rose-500', post: 'text-emerald-600',
  video: 'text-indigo-600', short: 'text-red-500', thread: 'text-slate-500', article: 'text-teal-600',
};
const CONTENT_TYPE_BORDER: Record<string, string> = {
  reel: 'border-purple-400/40', carousel: 'border-amber-400/40', story: 'border-rose-300/40', post: 'border-emerald-400/40',
  video: 'border-indigo-400/40', short: 'border-red-300/40', thread: 'border-slate-300/40', article: 'border-teal-400/40',
};
const CONTENT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  reel: Film, carousel: Layers, story: CircleDot, post: ImageIcon,
  video: Clapperboard, short: Film, thread: FileText, article: FileText,
};


function getShortPlatformLabel(id: string) {
  const m: Record<string, string> = { instagram: 'IG' };
  return m[id] || id.substring(0, 2).toUpperCase();
}


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
          variation.type === 'video' || variation.type === 'scene' || variation.type === 'stitched' ? (
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
  onClickStage?: (stageKey: string, status: string) => void;
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
        const TypeIcon = stage.stageType === 'agent' ? Bot : stage.stageType === 'both' ? Bot : UserIcon;
        const canToggle = (status === 'pending' || status === 'running' || status === 'completed') && !stage.approvalRequired;

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
                {stage.stageType === 'both' ? (
                  <span className="flex items-center gap-0.5 shrink-0">
                    <UserIcon className="h-3 w-3 text-muted-foreground/20" />
                    <Bot className="h-3 w-3 text-muted-foreground/20" />
                  </span>
                ) : (
                  <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/20" />
                )}
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
                onClick={(e) => { e.stopPropagation(); canToggle && onClickStage?.(stage.key, status); }}
                disabled={!canToggle}
                className={`shrink-0 ${canToggle ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
                title={canToggle ? (status === 'completed' ? 'Click to undo' : 'Click to complete') : undefined}
              >
                <Icon className={`h-4 w-4 ${
                  status === 'running' ? 'animate-spin text-foreground' : ''
                } ${status === 'completed' ? 'text-foreground hover:text-muted-foreground/50' : ''
                } ${status === 'failed' ? 'text-destructive' : ''
                } ${status === 'waiting_approval' ? 'text-yellow-500' : ''
                } ${status === 'pending' && canToggle ? 'text-muted-foreground/50 hover:text-foreground' : ''
                } ${status === 'pending' && !canToggle ? 'text-muted-foreground/30' : ''}`} />
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
              {stage.stageType === 'both' ? (
                <span className="flex items-center gap-0.5 shrink-0">
                  <UserIcon className="h-3 w-3 text-muted-foreground/30" />
                  <Bot className="h-3 w-3 text-muted-foreground/30" />
                </span>
              ) : (
                <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
              )}
            </div>

            {/* Campaign & Strategy readiness indicators */}
            {stage.key === 'campaign_strategy' && isCurrent && (
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


// --- CircleScore (SVG circular progress) ---
function CircleScore({ score, size = 48, label }: { score: number; size?: number; label?: string }) {
  const r = size * 0.4;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : score >= 25 ? '#f97316' : '#ef4444';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={size * 0.06} className="text-border" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={size * 0.06} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x={cx} y={label ? cx - size * 0.08 : cx} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={size * 0.23} fontWeight="700" fontFamily="monospace">{score}</text>
      {label && <text x={cx} y={cx + size * 0.13} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={size * 0.14} fontWeight="600" fontFamily="monospace" opacity="0.7">{label}</text>}
    </svg>
  );
}

// --- LLM model options for simulation (same models used across the app) ---
const SIM_LLM_MODELS = [
  { label: 'Gemini Pro 3 — Google', value: 'gemini-pro-3' },
  { label: 'Claude 4.5 Sonnet — Anthropic', value: 'claude-4.5-sonnet' },
  { label: 'GPT-5.2 — OpenAI', value: 'gpt-5.2' },
];

const SIM_AGE_RANGES = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const SIM_GENDERS = ['Male', 'Female'];

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
  const [editingContentIdx, setEditingContentIdx] = useState<number | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  // Image generation
  const [imgGenLoading, setImgGenLoading] = useState<Set<number>>(new Set());

  // Selected content piece for calendar-driven pipeline
  const [selectedContentPiece, setSelectedContentPiece] = useState<ContentItem | null>(null);

  // Storyboard state
  const [imageModels, setImageModels] = useState<{ id: string; name: string; provider: string }[]>([]);
  const [storyboardConceptIdx, setStoryboardConceptIdx] = useState<number>(0);
  const [storyboardVariationIdx, setStoryboardVariationIdx] = useState<number>(0);
  const [storyboardLlmModel, setStoryboardLlmModel] = useState<string>('gemini-pro-3');
  const [storyboardImageModel, setStoryboardImageModel] = useState<string>('google/nano-banana');
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);
  const [storyboardError, setStoryboardError] = useState<string | null>(null);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Map<string, string>>(new Map());
  const [collapsedStoryboards, setCollapsedStoryboards] = useState<Set<number>>(new Set());
  const pollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Brand context
  const [brand, setBrand] = useState<Brand | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);

  // Simulation state
  const [simRunning, setSimRunning] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simResults, setSimResults] = useState<SimulationResult[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [expandedScoreKey, setExpandedScoreKey] = useState<string | null>(null);

  // Predictive modeling state
  const [predResults, setPredResults] = useState<PredictionResult[]>([]);
  const [predBenchmarks, setPredBenchmarks] = useState<PredictionBenchmarks>({});
  const [predRunning, setPredRunning] = useState(false);
  const [predError, setPredError] = useState<string | null>(null);

  // Content ranking state
  const [rankResults, setRankResults] = useState<RankingResult[]>([]);
  const [rankRunning, setRankRunning] = useState(false);
  const [rankError, setRankError] = useState<string | null>(null);

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
    currentStageKey?: string;
    onNodeClick?: (node: ContentWorkflowNode) => void;
  }> | null>(null);

  // Stage detail modal
  const [openStageKey, setOpenStageKey] = useState<string | null>(null);

  // All stage settings (persisted to workflow.config.stage_settings)
  const [stageSettings, setStageSettings] = useState<Record<string, Record<string, unknown>>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Workflow selector & creation
  const [allWorkflows, setAllWorkflows] = useState<ContentWorkflow[]>([]);
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [newWfTitle, setNewWfTitle] = useState('');
  const [newWfDescription, setNewWfDescription] = useState('');
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);

  // Brand creation
  const [showCreateBrand, setShowCreateBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandUrl, setNewBrandUrl] = useState('');
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);

  const isFDM = isTeamMember;
  const isActive = workflow && workflow.status === 'running';

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

  // Load all workflows for the selector
  useEffect(() => {
    getContentWorkflows().then(setAllWorkflows).catch(() => {});
  }, [workflowId]);

  // Load all brands for brand creation context
  useEffect(() => {
    getBrands().then(setAllBrands).catch(() => {});
  }, []);

  // Create new workflow
  const handleCreateWorkflow = async () => {
    if (!newWfTitle.trim()) return;
    setCreatingWorkflow(true);
    try {
      const brandId = brand?._id || allBrands[0]?._id;
      if (!brandId) { setCreatingWorkflow(false); return; }
      const wf = await createContentWorkflow({
        brand_id: brandId,
        title: newWfTitle.trim(),
        description: newWfDescription.trim() || undefined,
        config: {},
      });
      setShowCreateWorkflow(false);
      setNewWfTitle('');
      setNewWfDescription('');
      router.push(`/app/content-generator/${wf._id}`);
    } catch (err) {
      console.error('Failed to create workflow:', err);
    } finally {
      setCreatingWorkflow(false);
    }
  };

  // Delete current workflow
  const handleDeleteWorkflow = async () => {
    if (!workflow || !confirm('Delete this workflow?')) return;
    try {
      await deleteContentWorkflow(workflow._id);
      const remaining = allWorkflows.filter((w) => w._id !== workflow._id);
      if (remaining.length > 0) {
        router.replace(`/app/content-generator/${remaining[0]._id}`);
      } else {
        router.replace('/app/content-generator');
      }
    } catch (err) {
      console.error('Failed to delete workflow:', err);
    }
  };

  // Create new brand
  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    setCreatingBrand(true);
    try {
      const orgs = await getOrganizations();
      const orgId = orgs[0]?._id;
      if (!orgId) {
        const newOrg = await createOrganization({ name: 'Default', slug: 'default' });
        const b = await createBrand({ organization_id: newOrg._id, name: newBrandName.trim() });
        setAllBrands((prev) => [...prev, b]);
        setBrand(b);
      } else {
        const b = await createBrand({ organization_id: orgId, name: newBrandName.trim() });
        setAllBrands((prev) => [...prev, b]);
        setBrand(b);
      }
      setShowCreateBrand(false);
      setNewBrandName('');
      setNewBrandUrl('');
    } catch (err) {
      console.error('Failed to create brand:', err);
    } finally {
      setCreatingBrand(false);
    }
  };

  // Load workflow + nodes
  const loadWorkflow = useCallback(async () => {
    try {
      const [wf, nodeList] = await Promise.all([
        getContentWorkflow(workflowId),
        getContentNodes(workflowId),
      ]);
      // Only update state when data actually changed to avoid re-rendering videos
      setWorkflow((prev) => JSON.stringify(prev) === JSON.stringify(wf) ? prev : wf);
      setNodes((prev) => JSON.stringify(prev) === JSON.stringify(nodeList) ? prev : nodeList);

      // Init stage settings from workflow config (skip if a debounced save is pending)
      if (wf?.config?.stage_settings && !saveTimeoutRef.current) {
        const ss = { ...(wf.config.stage_settings as Record<string, Record<string, unknown>>) };
        // Clear stuck generating state on load
        if (ss.video_generation) {
          ss.video_generation = { ...ss.video_generation, _generating_rows: [], _row_errors: {} };
        }
        setStageSettings((prev) => JSON.stringify(prev) === JSON.stringify(ss) ? prev : ss);
      }

      // Extract variations from video_generation node output
      const genNode = nodeList.find((n) => n.stage_key === 'video_generation');
      if (genNode?.output_data) {
        const raw = (genNode.output_data.variations || genNode.output_data.content || []) as ContentVariation[];
        if (Array.isArray(raw) && raw.length > 0) {
          const nextVars = raw.map((v, i) => ({
            id: v.id || `var-${i}`,
            title: v.title || `Variation ${i + 1}`,
            preview: v.preview,
            type: v.type || 'image',
            score: v.score,
            scheduled_at: v.scheduled_at,
            status: v.status || 'draft',
          }));
          setVariations((prev) => JSON.stringify(prev) === JSON.stringify(nextVars) ? prev : nextVars);
        }
      }

      // Load video jobs
      getVideoJobs(workflowId).then((jobs) => setVideoJobs((prev) => JSON.stringify(prev) === JSON.stringify(jobs) ? prev : jobs)).catch(() => {});

      // Recover simulation results from node output_data
      const simNode = nodeList.find((n) => n.stage_key === 'simulation_testing');
      if (simNode?.output_data?.results) {
        setSimResults((prev) => JSON.stringify(prev) === JSON.stringify(simNode.output_data.results) ? prev : simNode.output_data.results as SimulationResult[]);
      }

      // Recover predictive modeling results
      const predNode = nodeList.find((n) => n.stage_key === 'predictive_modeling');
      if (predNode?.output_data?.predictions) {
        setPredResults((prev) => JSON.stringify(prev) === JSON.stringify(predNode.output_data.predictions) ? prev : predNode.output_data.predictions as PredictionResult[]);
        if (predNode.output_data.benchmarks) {
          setPredBenchmarks((prev) => JSON.stringify(prev) === JSON.stringify(predNode.output_data.benchmarks) ? prev : predNode.output_data.benchmarks as PredictionBenchmarks);
        }
      }

      // Recover content ranking results
      const rankNode = nodeList.find((n) => n.stage_key === 'content_ranking');
      if (rankNode?.output_data?.rankings) {
        setRankResults((prev) => JSON.stringify(prev) === JSON.stringify(rankNode.output_data.rankings) ? prev : rankNode.output_data.rankings as RankingResult[]);
      }

      // Load brand context if available (only on first load or when brand changes)
      if (wf?.brand_id) {
        setBrand((prevBrand) => {
          if (prevBrand?._id === wf.brand_id) return prevBrand; // already loaded
          // Kick off brand loading asynchronously
          const campaignId = (wf.config as Record<string, unknown>)?.campaign_id as string | undefined;
          Promise.all([
            getBrands(),
            getCampaigns(wf.brand_id),
            getBrandAssets(wf.brand_id),
            campaignId ? getStrategies(campaignId) : Promise.resolve([]),
            campaignId ? getPersonas(campaignId) : Promise.resolve([]),
          ]).then(([brs, camps, assets, strats, pers]) => {
            const b = brs.find((br: Brand) => br._id === wf.brand_id) || null;
            setBrand(b);
            setCampaigns(camps);
            setBrandAssets(assets);
            setStrategies(strats);
            setPersonas(pers);
          }).catch(() => {});
          return prevBrand;
        });
      }
    } catch (err) {
      console.error('Failed to load content workflow:', err);
    }
  }, [workflowId]);

  useEffect(() => { loadWorkflow(); }, [loadWorkflow]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(loadWorkflow, 15000);
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

  // Content piece scoped helpers (calendar-driven pipeline)
  const contentPieceKey = selectedContentPiece?.content_id || null;

  const getPieceSetting = (stage: string, field: string) => {
    if (!contentPieceKey) return undefined;
    const pieces = getSetting(stage, 'pieces') as Record<string, Record<string, unknown>> | undefined;
    return pieces?.[contentPieceKey]?.[field];
  };
  const updatePieceSetting = (stage: string, field: string, value: unknown) => {
    if (!contentPieceKey) return;
    const pieces = (getSetting(stage, 'pieces') as Record<string, Record<string, unknown>>) || {};
    const entry = pieces[contentPieceKey] || {};
    updateStageSetting(stage, 'pieces', { ...pieces, [contentPieceKey]: { ...entry, [field]: value } });
  };

  // Derived settings from stage settings (persisted)
  const selectedAssetIds = new Set((stageSettings['campaign_strategy']?.['asset_ids'] as string[] | undefined) || []);
  const handleToggleAsset = (id: string) => toggleArrayItem('campaign_strategy', 'asset_ids', id);
  const selectedStrategy = (getSetting('campaign_strategy', 'strategy') as string) || '';
  const handleSelectStrategy = (v: string) => updateStageSetting('campaign_strategy', 'strategy', v);
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
        updateStageSetting('campaign_strategy', 'strategy', '');
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

  const handleToggleStage = async (stageKey: string, currentStatus: string) => {
    if (!workflow) return;
    try {
      if (currentStatus === 'completed') {
        await resetStage(workflow._id, stageKey);
      } else {
        await submitStageInput(workflow._id, stageKey, { completed_by: 'user' });
      }
      await loadWorkflow();
    } catch (err) {
      console.error('Failed to toggle stage:', err);
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
        {/* Pipeline dropdown */}
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-0.5">Pipeline</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 h-7 min-w-[140px] max-w-[220px] rounded-md border border-border px-2.5 text-xs text-left hover:bg-muted transition-colors">
                <span className="flex-1 truncate">{workflow.title}</span>
                <ChevronLeft className="h-3 w-3 text-muted-foreground/50 -rotate-90 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {allWorkflows.map((wf) => (
                <DropdownMenuItem
                  key={wf._id}
                  onClick={() => { if (wf._id !== workflowId) router.push(`/app/content-generator/${wf._id}`); }}
                  className={wf._id === workflowId ? 'bg-muted' : ''}
                >
                  <span className="truncate">{wf.title}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowCreateWorkflow(true)}>
                <Plus className="h-3.5 w-3.5" />
                <span>New Pipeline</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Brand dropdown */}
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-0.5">Brand</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 h-7 min-w-[100px] max-w-[160px] rounded-md border border-border px-2.5 text-xs text-left hover:bg-muted transition-colors">
                <span className="flex-1 truncate">{brand?.name || 'No brand'}</span>
                <ChevronLeft className="h-3 w-3 text-muted-foreground/50 -rotate-90 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {allBrands.map((b) => (
                <DropdownMenuItem
                  key={b._id}
                  onClick={() => { if (b._id !== brand?._id) setBrand(b); }}
                  className={b._id === brand?._id ? 'bg-muted' : ''}
                >
                  <span className="truncate">{b.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowCreateBrand(true)}>
                <Plus className="h-3.5 w-3.5" />
                <span>New Brand</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1" />

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

        {/* Workflow actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="shrink-0 flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {isFDM && (workflow.status === 'pending' || workflow.status === 'failed') && (
              <DropdownMenuItem onClick={handleRun}>
                <Play className="h-3.5 w-3.5" />
                <span>Run Pipeline</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onClick={handleDeleteWorkflow}>
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Pipeline</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <NavMenu />
      </div>

      {/* Create Workflow Dialog */}
      <Dialog open={showCreateWorkflow} onOpenChange={setShowCreateWorkflow}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Content Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={newWfTitle}
                onChange={(e) => setNewWfTitle(e.target.value)}
                placeholder="e.g. Summer campaign video series"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Description <span className="text-muted-foreground/50">(optional)</span></Label>
              <Textarea
                value={newWfDescription}
                onChange={(e) => setNewWfDescription(e.target.value)}
                placeholder="Brief description..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreateWorkflow} disabled={!newWfTitle.trim() || creatingWorkflow} size="sm">
                {creatingWorkflow && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Brand Dialog */}
      <Dialog open={showCreateBrand} onOpenChange={setShowCreateBrand}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Brand Name</Label>
              <Input
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="e.g. DBLE"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Website URL <span className="text-muted-foreground/50">(optional)</span></Label>
              <Input
                value={newBrandUrl}
                onChange={(e) => setNewBrandUrl(e.target.value)}
                placeholder="https://example.com"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreateBrand} disabled={!newBrandName.trim() || creatingBrand} size="sm">
                {creatingBrand && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Create Brand
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Overview tab — Notion-style full-page inline view */}
        {tab === 'overview' && (() => {
          // Pre-compute shared data for inline sections
          const wfConfig = workflow.config as Record<string, unknown> | undefined;
          const oGeneratedConcepts = ((getPieceSetting('concepts', 'generated_concepts') || getSetting('concepts', 'generated_concepts')) as Array<{ title: string; hook: string; script: string; messaging: string[]; tone?: string }>) || [];
          const oStoryboardNode = nodes.find((n) => n.stage_key === 'storyboard');
          const oStoryboardOutput = (oStoryboardNode?.output_data || {}) as { storyboards?: Array<Record<string, unknown>> };
          const oStoryboards = oStoryboardOutput.storyboards || [];

          type SbChar = { id: string; name: string; description: string; image_prompt: string; image_url: string | null; gs_uri: string | null; image_model: string };
          type SbScene = { id: string; scene_number: number; title: string; description: string; shot_type: string; duration_hint: string; character_ids: string[]; image_prompt: string; image_url: string | null; gs_uri: string | null; image_model: string; dialog?: string; lighting?: string; time_of_day?: string; camera_move?: string; character_descriptions?: Array<{ character_id: string; appearance_in_scene: string }> };
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
              }, 10000);
            } catch (err) {
              const cur = oVidGeneratingRows.filter((r) => r !== idx);
              updateStageSetting('video_generation', '_generating_rows', cur);
              updateStageSetting('video_generation', '_row_errors', { ...oVidRowErrors, [idx]: err instanceof Error ? err.message : 'Failed to start generation' });
            }
          };

          // Image gen rows
          type ImgGenRow = { conceptIdx: number; llm: string; imageModel: string };
          const oImgRows = (getSetting('image_generation', 'rows') as ImgGenRow[]) || [{ conceptIdx: 0, llm: 'gemini-pro-3', imageModel: 'google/nano-banana' }];
          const updateImgRows = (next: ImgGenRow[]) => updateStageSetting('image_generation', 'rows', next);
          const updateImgRow = (idx: number, field: keyof ImgGenRow, value: string | number) => { const next = oImgRows.map((r, i) => i === idx ? { ...r, [field]: value } : r); updateImgRows(next); };
          const addImgRow = () => updateImgRows([...oImgRows, { conceptIdx: 0, llm: 'gemini-pro-3', imageModel: 'google/nano-banana' }]);
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
              }, 5000);
              pollingRef.current.set(targetId, interval);
            } catch (err) {
              setImageErrors((prev) => new Map(prev).set(targetId, err instanceof Error ? err.message : 'Failed to start image generation'));
              setGeneratingImages((prev) => { const next = new Set(prev); next.delete(targetId); return next; });
            }
          };

          const sceneCharsReadyOverview = (scene: SbScene) => (scene.character_ids || []).every((cid) => { const c = oCharacters.find((ch) => ch.id === cid); return c && c.image_url; });

          const selAssetIds = new Set((stageSettings['campaign_strategy']?.['asset_ids'] as string[] | undefined) || []);
          const selAssets = brandAssets.filter((a) => selAssetIds.has(a._id));

          return (
          <div className="h-full overflow-auto">
            <div className="w-full px-[5%] py-6 space-y-10">

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
                const StIcon = st === 'completed' ? CheckCircle2 : st === 'running' ? Loader2 : st === 'failed' ? XCircle : st === 'waiting_approval' ? Clock : Circle;
                const canToggle = (st === 'pending' || st === 'running' || st === 'completed') && !stage.approvalRequired;

                return (
                  <section key={stage.key}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-mono text-[10px] text-muted-foreground/40 w-5 shrink-0 text-right">{i + 1}</span>
                      <button
                        onClick={() => canToggle && handleToggleStage(stage.key, st)}
                        disabled={!canToggle}
                        className={`shrink-0 ${canToggle ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
                        title={canToggle ? (st === 'completed' ? 'Click to undo' : 'Click to mark done') : undefined}
                      >
                        <StIcon className={`h-5 w-5 ${
                          st === 'running' ? 'animate-spin text-foreground' : ''
                        } ${st === 'completed' ? 'text-foreground hover:text-muted-foreground/50' : ''
                        } ${st === 'failed' ? 'text-destructive' : ''
                        } ${st === 'waiting_approval' ? 'text-yellow-500' : ''
                        } ${st === 'pending' && canToggle ? 'text-muted-foreground/30 hover:text-foreground' : ''
                        } ${st === 'pending' && !canToggle ? 'text-muted-foreground/20' : ''}`} />
                      </button>
                      <h2 className="text-lg font-medium">{stage.label}</h2>
                      {/* Stage type badge */}
                      {stage.stageType === 'human' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                          <UserIcon className="h-2.5 w-2.5" /> FDM
                        </span>
                      )}
                      {stage.stageType === 'agent' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                          <Bot className="h-2.5 w-2.5" /> Agent
                        </span>
                      )}
                      {stage.stageType === 'both' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                          <UserIcon className="h-2.5 w-2.5" /> FDM
                          <span className="text-muted-foreground/30">+</span>
                          <Bot className="h-2.5 w-2.5" /> Agent
                        </span>
                      )}
                      {workflow.current_stage === stage.key && (
                        <span className="inline-flex rounded-full bg-foreground px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-background">current</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{stage.description}</p>
                    <div className="space-y-4">

                    {/* ── Brand ── */}
                    {stage.key === 'brand' && (() => {
                      const saveBrandField = async (field: string, value: unknown) => {
                        if (!brand) return;
                        try {
                          const updated = await updateBrand(brand._id, { [field]: value } as Partial<typeof brand>);
                          setBrand(updated);
                        } catch (err) { console.error('Failed to save brand:', err); }
                      };
                      const socialUrls = brand?.social_urls || {};
                      const SOCIAL_PLATFORMS = [
                        { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
                      ];
                      return brand ? (
                        <div className="rounded-lg border border-border p-4 space-y-4">
                          <div className="flex items-start gap-4">
                            {brand.logo_url ? (
                              <img src={brand.logo_url} alt={brand.name} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <span className="text-xl font-bold text-muted-foreground">{brand.name.charAt(0)}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold truncate">{brand.name}</h3>
                                {brand.industry && <span className="inline-flex rounded-full border border-border px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">{brand.industry}</span>}
                              </div>
                              {brand.product_name && <p className="text-xs text-muted-foreground">{brand.product_name}</p>}
                              {brand.description && <p className="text-xs text-muted-foreground/70 leading-relaxed">{brand.description}</p>}
                            </div>
                          </div>

                          {/* Website URL */}
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 flex items-center gap-1.5 w-24 shrink-0">
                              <Globe className="h-3 w-3" /> Website
                            </div>
                            <input
                              type="url"
                              defaultValue={brand.url || ''}
                              placeholder="https://example.com"
                              onBlur={(e) => { if (e.target.value !== (brand.url || '')) saveBrandField('url', e.target.value || null); }}
                              className="flex-1 h-8 rounded border border-border bg-background px-3 text-xs text-foreground"
                            />
                            {brand.url && (
                              <a href={brand.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-foreground transition-colors shrink-0">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>

                          {/* Social Platform URLs */}
                          {SOCIAL_PLATFORMS.map((sp) => (
                            <div key={sp.id} className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 w-24 shrink-0">
                                <svg className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">{sp.label}</span>
                              </div>
                              <input
                                type="url"
                                defaultValue={socialUrls[sp.id] || ''}
                                placeholder={sp.placeholder}
                                onBlur={(e) => {
                                  const newUrls = { ...socialUrls, [sp.id]: e.target.value || undefined };
                                  Object.keys(newUrls).forEach((k) => { if (!newUrls[k]) delete newUrls[k]; });
                                  saveBrandField('social_urls', newUrls);
                                }}
                                className="flex-1 h-8 rounded border border-border bg-background px-3 text-xs text-foreground"
                              />
                              {socialUrls[sp.id] && (
                                <a href={socialUrls[sp.id]} target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-foreground transition-colors shrink-0">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/50">No brand selected</p>
                      );
                    })()}

                    {/* ── Campaign & Strategy ── */}
                    {stage.key === 'campaign_strategy' && (
                      <>
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5"><Megaphone className="h-3 w-3" /> Campaign</div>
                          {campaigns.length > 0 ? (
                            <Select value={selectedCampaignId || undefined} onValueChange={handleSelectCampaign}>
                              <SelectTrigger className="h-8 text-xs max-w-sm"><SelectValue placeholder="Select campaign" /></SelectTrigger>
                              <SelectContent>{campaigns.map((c) => (<SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>))}</SelectContent>
                            </Select>
                          ) : <p className="text-xs text-muted-foreground/50">No campaigns for this brand</p>}

                          {/* Campaign details */}
                          {(() => {
                            const camp = campaigns.find((c) => c._id === selectedCampaignId);
                            if (!camp) return null;
                            return (
                              <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                                {camp.description && (
                                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{camp.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {camp.platform && (
                                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] uppercase text-muted-foreground/60">{camp.platform}</span>
                                  )}
                                  {camp.campaign_goal && (
                                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] uppercase text-muted-foreground/60">{camp.campaign_goal}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5"><Settings2 className="h-3 w-3" /> Strategy</div>
                          {strategies.length > 0 ? (
                            <Select value={selectedStrategy} onValueChange={handleSelectStrategy}>
                              <SelectTrigger className="h-8 text-xs max-w-sm"><SelectValue placeholder="Select strategy" /></SelectTrigger>
                              <SelectContent>{strategies.map((s) => (<SelectItem key={s._id} value={s._id}>{s.name}{s.budget_amount ? ` ($${s.budget_amount} ${s.budget_type || ''})` : ''}</SelectItem>))}</SelectContent>
                            </Select>
                          ) : <p className="text-xs text-muted-foreground/50">{selectedCampaignId ? 'No strategies for this campaign' : 'Select a campaign first'}</p>}

                          {/* Strategy details */}
                          {(() => {
                            const strat = strategies.find((s) => s._id === selectedStrategy);
                            if (!strat) return null;
                            return (
                              <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {strat.budget_amount != null && (
                                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground/60">
                                      ${strat.budget_amount.toLocaleString()}{strat.budget_type ? `/${strat.budget_type}` : ''}
                                    </span>
                                  )}
                                  {strat.performance_objective?.kpi && (
                                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] uppercase text-muted-foreground/60">
                                      {strat.performance_objective.kpi}{strat.performance_objective.value != null ? `: ${strat.performance_objective.value}` : ''}
                                    </span>
                                  )}
                                </div>
                                {strat.audience_control?.location && strat.audience_control.location.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-mono text-[8px] text-muted-foreground/40">Locations:</span>
                                    {strat.audience_control.location.map((l) => (
                                      <span key={l} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground/60">{l}</span>
                                    ))}
                                  </div>
                                )}
                                {strat.audience_control?.in_market_interests && strat.audience_control.in_market_interests.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-mono text-[8px] text-muted-foreground/40">Interests:</span>
                                    {strat.audience_control.in_market_interests.map((i) => (
                                      <span key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground/60">{i}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div>
                          {renderAssetList()}
                        </div>
                      </>
                    )}

                    {/* ── Scheduling ── */}
                    {stage.key === 'scheduling' && (() => {
                      const contentEntries = (getSetting('scheduling', 'content_entries') as ContentEntry[] | undefined) || [];
                      // Content items: migrate from old content_entries if needed
                      let calendarItems = (getSetting('scheduling', 'content_items') as ContentItem[] | undefined) || [];
                      if (calendarItems.length === 0 && contentEntries.length > 0) {
                        calendarItems = migrateEntriesToItems(contentEntries);
                        updateStageSetting('scheduling', 'content_items', calendarItems);
                      }
                      const addPlatform = (getSetting('scheduling', 'add_platform') as string) || '';
                      const addContentType = (getSetting('scheduling', 'add_content_type') as string) || '';
                      const addFrequency = (getSetting('scheduling', 'add_frequency') as string) || '';
                      const addDays = (getSetting('scheduling', 'add_days') as number[] | undefined) || [];
                      const addStartDate = (getSetting('scheduling', 'add_start_date') as string) || '';
                      const addEndDate = (getSetting('scheduling', 'add_end_date') as string) || '';
                      const addPostTime = (getSetting('scheduling', 'add_post_time') as string) || '';
                      const addTimezone = (getSetting('scheduling', 'add_timezone') as string) || '';
                      const toggleAddDay = (dayId: number) => {
                        const next = addDays.includes(dayId) ? addDays.filter((d) => d !== dayId) : [...addDays, dayId].sort();
                        updateStageSetting('scheduling', 'add_days', next.length > 0 ? next : []);
                      };
                      const addEntry = () => {
                        if (!addPlatform || !addContentType) return;
                        const newRule: ContentEntry = {
                          id: crypto.randomUUID(),
                          platform: addPlatform, content_type: addContentType,
                          frequency: addFrequency || undefined, days: addDays.length > 0 ? addDays : undefined,
                          start_date: addStartDate || undefined,
                          end_date: addEndDate || undefined, post_time: addPostTime || undefined,
                          timezone: addTimezone || undefined,
                        };
                        updateStageSetting('scheduling', 'content_entries', [...contentEntries, newRule]);
                        // Materialize individual content items
                        const newItems = materializeItems(newRule);
                        updateStageSetting('scheduling', 'content_items', [...calendarItems, ...newItems]);
                        updateStageSetting('scheduling', 'add_platform', '');
                        updateStageSetting('scheduling', 'add_content_type', '');
                        updateStageSetting('scheduling', 'add_frequency', '');
                        updateStageSetting('scheduling', 'add_days', []);
                        updateStageSetting('scheduling', 'add_start_date', '');
                        updateStageSetting('scheduling', 'add_end_date', '');
                        updateStageSetting('scheduling', 'add_post_time', '');
                        updateStageSetting('scheduling', 'add_timezone', '');
                      };
                      const removeEntry = (idx: number) => {
                        updateStageSetting('scheduling', 'content_entries', contentEntries.filter((_, i) => i !== idx));
                        if (editingContentIdx === idx) setEditingContentIdx(null);
                      };
                      const updateEntry = (idx: number, field: keyof ContentEntry, value: string | number[] | undefined) => {
                        const next = contentEntries.map((e, i) => i === idx ? { ...e, [field]: value || undefined } : e);
                        if (field === 'platform') {
                          next[idx] = { ...next[idx], content_type: '' };
                        }
                        updateStageSetting('scheduling', 'content_entries', next);
                      };
                      const toggleEntryDay = (idx: number, dayId: number) => {
                        const current = contentEntries[idx].days || [];
                        const next = current.includes(dayId) ? current.filter((d) => d !== dayId) : [...current, dayId].sort();
                        updateEntry(idx, 'days', next.length > 0 ? next : undefined);
                      };
                      const formatDate = (d?: string) => { if (!d) return ''; try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; } };
                      const showDayPicker = (freq?: string) => freq && freq !== 'once';
                      const deleteContentItem = (itemId: string) => {
                        updateStageSetting('scheduling', 'content_items', calendarItems.filter((i) => i.content_id !== itemId));
                        if (selectedContentPiece?.content_id === itemId) setSelectedContentPiece(null);
                      };
                      const moveContentItem = (itemId: string, newDate: string) => {
                        updateStageSetting('scheduling', 'content_items', calendarItems.map((i) => i.content_id === itemId ? { ...i, date: newDate } : i));
                        if (selectedContentPiece?.content_id === itemId) setSelectedContentPiece({ ...selectedContentPiece, date: newDate });
                      };
                      const updateContentItem = (itemId: string, field: keyof ContentItem, value: string | undefined) => {
                        updateStageSetting('scheduling', 'content_items', calendarItems.map((i) => i.content_id === itemId ? { ...i, [field]: value } : i));
                        if (selectedContentPiece?.content_id === itemId) setSelectedContentPiece({ ...selectedContentPiece, [field]: value });
                      };
                      return (
                      <div className="space-y-4">
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><Globe className="h-3 w-3" /> Content</div>

                          {/* Existing entries */}
                          {contentEntries.length > 0 && (
                            <div className="space-y-2 mb-4">
                              {contentEntries.map((entry, idx) => {
                                const isEditing = editingContentIdx === idx;
                                return (
                                <div key={idx} className={`rounded-lg border bg-muted/20 px-4 py-3 space-y-2 ${isEditing ? 'border-foreground/40' : 'border-border'}`}>
                                  <div className="flex items-center gap-2">
                                    <span className="rounded bg-foreground px-2 py-0.5 font-mono text-[9px] uppercase text-background">{getPlatformLabel(entry.platform)}</span>
                                    <span className="text-xs font-semibold">{getContentTypeLabel(entry.platform, entry.content_type)}</span>
                                    <div className="ml-auto flex items-center gap-1">
                                      <button onClick={() => setEditingContentIdx(isEditing ? null : idx)} className={`transition-colors ${isEditing ? 'text-foreground' : 'text-muted-foreground/30 hover:text-foreground'}`}><Pencil className="h-3 w-3" /></button>
                                      <button onClick={() => removeEntry(idx)} className="text-muted-foreground/30 hover:text-destructive transition-colors"><X className="h-3.5 w-3.5" /></button>
                                    </div>
                                  </div>

                                  {isEditing ? (
                                    <div className="space-y-2 pt-1">
                                      <div className="flex flex-wrap items-end gap-2">
                                        <div>
                                          <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Platform</div>
                                          <Select value={entry.platform || undefined} onValueChange={(v) => updateEntry(idx, 'platform', v)}>
                                            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
                                            <SelectContent>{PLATFORM_OPTIONS.map((p) => (<SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>))}</SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Content Type</div>
                                          <Select value={entry.content_type || undefined} onValueChange={(v) => updateEntry(idx, 'content_type', v)} disabled={!entry.platform}>
                                            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                                            <SelectContent>{(CONTENT_TYPE_OPTIONS[entry.platform] || []).map((t) => (<SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>))}</SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Frequency</div>
                                          <Select value={entry.frequency || undefined} onValueChange={(v) => updateEntry(idx, 'frequency', v)}>
                                            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Frequency" /></SelectTrigger>
                                            <SelectContent><SelectItem value="once">Once</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="3x_week">3x / week</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      {showDayPicker(entry.frequency) && (
                                        <div>
                                          <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Days</div>
                                          <div className="flex gap-1">
                                            {DAY_LABELS.map((d) => {
                                              const selected = (entry.days || []).includes(d.id);
                                              return (
                                                <button key={d.id} type="button" onClick={() => toggleEntryDay(idx, d.id)}
                                                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium transition-colors ${selected ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:border-foreground/40'}`}
                                                  title={d.label}
                                                >{d.short}</button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex flex-wrap items-end gap-2">
                                        <div>
                                          <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Start</div>
                                          <input type="date" value={entry.start_date || ''} onChange={(e) => updateEntry(idx, 'start_date', e.target.value)} className="h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                                        </div>
                                        <div>
                                          <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">End</div>
                                          <input type="date" value={entry.end_date || ''} onChange={(e) => updateEntry(idx, 'end_date', e.target.value)} className="h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                                        </div>
                                        <div>
                                          <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Post Time</div>
                                          <Select value={entry.post_time || undefined} onValueChange={(v) => updateEntry(idx, 'post_time', v)}>
                                            <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue placeholder="Time" /></SelectTrigger>
                                            <SelectContent className="max-h-[240px]">
                                              {['AM', 'PM'].flatMap((p) => [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].flatMap((h) => ['00', '15', '30', '45'].map((m) => {
                                                const val = `${h}:${m} ${p}`;
                                                return <SelectItem key={val} value={val}>{val}</SelectItem>;
                                              })))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Timezone</div>
                                          <Select value={entry.timezone || undefined} onValueChange={(v) => updateEntry(idx, 'timezone', v)}>
                                            <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Timezone" /></SelectTrigger>
                                            <SelectContent>{Object.entries(TIMEZONE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      <button onClick={() => setEditingContentIdx(null)} className="text-xs font-medium text-foreground hover:underline mt-1">Done</button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 cursor-pointer" onClick={() => setEditingContentIdx(idx)}>
                                      {entry.frequency && (
                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <span className="font-mono text-[8px] uppercase text-muted-foreground/50">Freq</span> {FREQUENCY_LABELS[entry.frequency] || entry.frequency}
                                        </span>
                                      )}
                                      {entry.days && entry.days.length > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <span className="font-mono text-[8px] uppercase text-muted-foreground/50">Days</span> {entry.days.map((d) => DAY_LABELS[d]?.label).join(', ')}
                                        </span>
                                      )}
                                      {entry.start_date && (
                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <span className="font-mono text-[8px] uppercase text-muted-foreground/50">Start</span> {formatDate(entry.start_date)}
                                        </span>
                                      )}
                                      {entry.end_date && (
                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <span className="font-mono text-[8px] uppercase text-muted-foreground/50">End</span> {formatDate(entry.end_date)}
                                        </span>
                                      )}
                                      {entry.post_time && (
                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <span className="font-mono text-[8px] uppercase text-muted-foreground/50">Time</span> {entry.post_time}
                                        </span>
                                      )}
                                      {entry.timezone && (
                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <span className="font-mono text-[8px] uppercase text-muted-foreground/50">TZ</span> {TIMEZONE_LABELS[entry.timezone] || entry.timezone}
                                        </span>
                                      )}
                                      {!entry.frequency && !entry.start_date && !entry.post_time && (
                                        <span className="text-[10px] text-muted-foreground/40">Click to edit schedule</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Add new entry */}
                          <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">Add Content</div>
                            <div className="flex flex-wrap items-end gap-2">
                              <div>
                                <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Platform</div>
                                <Select value={addPlatform || undefined} onValueChange={(v) => { updateStageSetting('scheduling', 'add_platform', v); updateStageSetting('scheduling', 'add_content_type', ''); }}>
                                  <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
                                  <SelectContent>{PLATFORM_OPTIONS.map((p) => (<SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>))}</SelectContent>
                                </Select>
                              </div>
                              <div>
                                <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Content Type</div>
                                <Select value={addContentType || undefined} onValueChange={(v) => updateStageSetting('scheduling', 'add_content_type', v)} disabled={!addPlatform}>
                                  <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                                  <SelectContent>{(CONTENT_TYPE_OPTIONS[addPlatform] || []).map((t) => (<SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>))}</SelectContent>
                                </Select>
                              </div>
                              <div>
                                <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Frequency</div>
                                <Select value={addFrequency || undefined} onValueChange={(v) => updateStageSetting('scheduling', 'add_frequency', v)}>
                                  <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Frequency" /></SelectTrigger>
                                  <SelectContent><SelectItem value="once">Once</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="3x_week">3x / week</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
                                </Select>
                              </div>
                            </div>
                            {showDayPicker(addFrequency) && (
                              <div>
                                <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Days</div>
                                <div className="flex gap-1">
                                  {DAY_LABELS.map((d) => {
                                    const selected = addDays.includes(d.id);
                                    return (
                                      <button key={d.id} type="button" onClick={() => toggleAddDay(d.id)}
                                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium transition-colors ${selected ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:border-foreground/40'}`}
                                        title={d.label}
                                      >{d.short}</button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <div className="flex flex-wrap items-end gap-2">
                              <div>
                                <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Start</div>
                                <input type="date" value={addStartDate} onChange={(e) => updateStageSetting('scheduling', 'add_start_date', e.target.value)} className="h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                              </div>
                              <div>
                                <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">End</div>
                                <input type="date" value={addEndDate} onChange={(e) => updateStageSetting('scheduling', 'add_end_date', e.target.value)} className="h-8 rounded border border-border bg-background px-3 text-xs text-foreground" />
                              </div>
                              <div>
                                <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Post Time</div>
                                <Select value={addPostTime || undefined} onValueChange={(v) => updateStageSetting('scheduling', 'add_post_time', v)}>
                                  <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue placeholder="Time" /></SelectTrigger>
                                  <SelectContent className="max-h-[240px]">
                                    {['AM', 'PM'].flatMap((p) => [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].flatMap((h) => ['00', '15', '30', '45'].map((m) => {
                                      const val = `${h}:${m} ${p}`;
                                      return <SelectItem key={val} value={val}>{val}</SelectItem>;
                                    })))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Timezone</div>
                                <Select value={addTimezone || undefined} onValueChange={(v) => updateStageSetting('scheduling', 'add_timezone', v)}>
                                  <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Timezone" /></SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(TIMEZONE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <button onClick={addEntry} disabled={!addPlatform || !addContentType} className="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-30 transition-colors">
                                <Plus className="h-3.5 w-3.5" /> Add
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* ── Calendar View ── */}
                        {calendarItems.length > 0 && (() => {
                          const yr = calendarMonth.getFullYear();
                          const mo = calendarMonth.getMonth();
                          const daysInMonth = new Date(yr, mo + 1, 0).getDate();
                          const firstDayOfWeek = new Date(yr, mo, 1).getDay();
                          const itemsByDate = getContentItemsByDate(calendarItems, yr, mo);
                          const today = new Date();
                          const isToday = (d: number) => today.getFullYear() === yr && today.getMonth() === mo && today.getDate() === d;
                          const weeks: (number | null)[][] = [];
                          let week: (number | null)[] = Array(firstDayOfWeek).fill(null);
                          for (let d = 1; d <= daysInMonth; d++) {
                            week.push(d);
                            if (week.length === 7) { weeks.push(week); week = []; }
                          }
                          if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }
                          return (
                            <div className="mt-6">
                              <div className="flex items-center justify-between mb-3">
                                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                  <CalendarClock className="h-3 w-3" /> Content Calendar
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setCalendarMonth(new Date(yr, mo - 1, 1))} className="rounded p-1 hover:bg-muted transition-colors"><ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" /></button>
                                  <span className="text-xs font-medium min-w-[120px] text-center">
                                    {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                  </span>
                                  <button onClick={() => setCalendarMonth(new Date(yr, mo + 1, 1))} className="rounded p-1 hover:bg-muted transition-colors"><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></button>
                                </div>
                              </div>
                              <div className="rounded-lg border border-border overflow-hidden">
                                <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                                    <div key={d} className="px-1 py-1.5 text-center font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">{d}</div>
                                  ))}
                                </div>
                                {weeks.map((w, wi) => (
                                  <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
                                    {w.map((day, di) => {
                                      const dayItems = day ? itemsByDate.get(day) || [] : [];
                                      const dateStr = day ? `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                                      return (
                                        <div
                                          key={di}
                                          onDragOver={day ? (ev) => { ev.preventDefault(); ev.currentTarget.classList.add('ring-2', 'ring-inset', 'ring-foreground/40'); } : undefined}
                                          onDragLeave={day ? (ev) => { ev.currentTarget.classList.remove('ring-2', 'ring-inset', 'ring-foreground/40'); } : undefined}
                                          onDrop={day ? (ev) => { ev.preventDefault(); ev.currentTarget.classList.remove('ring-2', 'ring-inset', 'ring-foreground/40'); const id = ev.dataTransfer.getData('text/plain'); if (id) moveContentItem(id, dateStr); } : undefined}
                                          className={`min-h-[96px] px-0.5 py-1 border-r border-border last:border-r-0 ${day ? 'bg-background' : 'bg-muted/10'} ${isToday(day || 0) ? 'ring-1 ring-inset ring-foreground/20' : ''}`}
                                        >
                                          {day && (
                                            <>
                                              <div className="flex items-center justify-between px-0.5 mb-0.5">
                                                <span className={`text-[10px] ${isToday(day) ? 'font-bold text-foreground' : 'text-muted-foreground/60'}`}>{day}</span>
                                                <button
                                                  onClick={() => {
                                                    const newItem: ContentItem = { content_id: crypto.randomUUID(), date: dateStr, platform: 'instagram', content_type: 'reel' };
                                                    updateStageSetting('scheduling', 'content_items', [...calendarItems, newItem]);
                                                  }}
                                                  className="opacity-0 group-hover:opacity-100 hover:!opacity-100 text-muted-foreground/30 hover:text-foreground transition-opacity"
                                                  title="Add content item"
                                                >
                                                  <Plus className="h-2.5 w-2.5" />
                                                </button>
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                {dayItems.slice(0, 3).map((item) => {
                                                  const isSelected = selectedContentPiece?.content_id === item.content_id;
                                                  return (
                                                  <div
                                                    key={item.content_id}
                                                    draggable
                                                    onDragStart={(ev) => { ev.dataTransfer.setData('text/plain', item.content_id); ev.dataTransfer.effectAllowed = 'move'; }}
                                                    onClick={() => setSelectedContentPiece(item)}
                                                    className={`group/item rounded-md border px-1.5 py-1 cursor-pointer hover:ring-1 hover:ring-foreground/30 transition-all ${isSelected ? 'ring-2 ring-foreground' : ''} ${CONTENT_TYPE_COLORS[item.content_type] || 'bg-muted/50'} ${CONTENT_TYPE_BORDER[item.content_type] || 'border-border'} flex items-center gap-1`}
                                                  >
                                                    {(() => { const Icon = CONTENT_TYPE_ICONS[item.content_type]; return Icon ? <Icon className={`h-3 w-3 shrink-0 ${CONTENT_TYPE_COLORS_TEXT[item.content_type] || 'text-muted-foreground'}`} /> : null; })()}
                                                    <span className={`text-[9px] font-medium leading-tight truncate flex-1 ${CONTENT_TYPE_COLORS_TEXT[item.content_type] || 'text-muted-foreground'}`}>
                                                      {getContentTypeLabel(item.platform, item.content_type)}
                                                    </span>
                                                    <button
                                                      onClick={(ev) => { ev.stopPropagation(); deleteContentItem(item.content_id); }}
                                                      className="opacity-0 group-hover/item:opacity-100 text-muted-foreground/50 hover:text-destructive shrink-0"
                                                    >
                                                      <X className="h-2.5 w-2.5" />
                                                    </button>
                                                  </div>
                                                  );
                                                })}
                                                {dayItems.length > 3 && (
                                                  <span className="text-[7px] text-muted-foreground/50 px-1">+{dayItems.length - 3} more</span>
                                                )}
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                              {/* Legend */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5">
                                {(() => {
                                  const seen = new Set<string>();
                                  return calendarItems.map((e) => {
                                    const key = `${e.platform}_${e.content_type}`;
                                    if (seen.has(key)) return null;
                                    seen.add(key);
                                    return (
                                      <div key={key} className="flex items-center gap-1.5">
                                        {(() => { const Icon = CONTENT_TYPE_ICONS[e.content_type]; return Icon ? <Icon className={`h-2.5 w-2.5 ${CONTENT_TYPE_COLORS_TEXT[e.content_type] || 'text-muted-foreground'}`} /> : <div className={`h-2 w-2 rounded-sm ${CONTENT_TYPE_COLORS[e.content_type] || 'bg-muted-foreground'}`} />; })()}
                                        <span className="text-[10px] text-muted-foreground">{getPlatformLabel(e.platform)} {getContentTypeLabel(e.platform, e.content_type)}</span>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>

                              {/* Selected content piece header */}
                              {selectedContentPiece && (
                                <div className="mt-4 rounded-lg border-2 border-foreground/20 bg-muted/30 p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <div className="text-lg font-bold">
                                          {new Date(selectedContentPiece.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                          {selectedContentPiece.post_time && ` · ${selectedContentPiece.post_time}`}
                                        </div>
                                        <input
                                          type="date"
                                          value={selectedContentPiece.date}
                                          onChange={(ev) => moveContentItem(selectedContentPiece.content_id, ev.target.value)}
                                          className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground"
                                          title="Move to date"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                                          <span className={`h-2.5 w-2.5 rounded-sm shrink-0 ${CONTENT_TYPE_COLORS[selectedContentPiece.content_type] || 'bg-muted-foreground'}`} />
                                          {getPlatformLabel(selectedContentPiece.platform)} {getContentTypeLabel(selectedContentPiece.platform, selectedContentPiece.content_type)}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-end gap-2 mt-2">
                                        <div>
                                          <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-0.5">Platform</div>
                                          <Select value={selectedContentPiece.platform} onValueChange={(v) => updateContentItem(selectedContentPiece.content_id, 'platform', v)}>
                                            <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>{PLATFORM_OPTIONS.map((p) => (<SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>))}</SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-0.5">Type</div>
                                          <Select value={selectedContentPiece.content_type} onValueChange={(v) => updateContentItem(selectedContentPiece.content_id, 'content_type', v)}>
                                            <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>{(CONTENT_TYPE_OPTIONS[selectedContentPiece.platform] || []).map((t) => (<SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>))}</SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                      <button onClick={() => deleteContentItem(selectedContentPiece.content_id)} className="text-muted-foreground hover:text-destructive" title="Delete item">
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                      <button onClick={() => setSelectedContentPiece(null)} className="text-muted-foreground hover:text-foreground">
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      );
                    })()}

                    {/* ── Research ── */}
                    {stage.key === 'research' && (
                      <ResearchStagePanel
                        workflowId={workflowId}
                        getSetting={getSetting}
                        updateStageSetting={updateStageSetting}
                      />
                    )}

                    {/* ── Concepts ── */}
                    {stage.key === 'concepts' && (() => {
                      if (!selectedContentPiece) {
                        return <div className="text-center py-8 text-muted-foreground/50"><CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Select a content piece from the calendar to generate concepts</p></div>;
                      }
                      const conceptRows = (getSetting('concepts', 'concept_allocations') as Array<{ num: string; tone: string; model?: string }>) || [{ num: '3', tone: '', model: '' }];
                      const totalConcepts = conceptRows.reduce((sum, r) => sum + (parseInt(r.num) || 0), 0);
                      const pieceConcepts = ((getPieceSetting('concepts', 'generated_concepts') as GeneratedConcept[]) || []) as GeneratedConcept[];

                      const updateConceptRowsO = (next: Array<{ num: string; tone: string; model?: string }>) => {
                        updateStageSetting('concepts', 'concept_allocations', next);
                      };
                      const updateConceptRowO = (idx: number, field: 'num' | 'tone' | 'model', value: string) => {
                        updateConceptRowsO(conceptRows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
                      };
                      const addConceptRowO = () => updateConceptRowsO([...conceptRows, { num: '3', tone: '', model: '' }]);
                      const removeConceptRowO = (idx: number) => updateConceptRowsO(conceptRows.filter((_, i) => i !== idx));

                      const deleteConceptO = (idx: number) => {
                        updatePieceSetting('concepts', 'generated_concepts', pieceConcepts.filter((_, i) => i !== idx));
                        if (editingConceptIdx === idx) setEditingConceptIdx(null);
                      };
                      const updateConceptO = (idx: number, field: string, value: unknown) => {
                        updatePieceSetting('concepts', 'generated_concepts', pieceConcepts.map((c, i) => i === idx ? { ...c, [field]: value } : c));
                      };

                      const handleGenerateO = async (idx: number) => {
                        const row = conceptRows[idx];
                        if (!selectedContentPiece) return;
                        const num = parseInt(row.num) || 3;
                        const tone = row.tone || 'engaging';
                        setGeneratingRows((prev) => new Set(prev).add(idx));
                        try {
                          const result = await generateConcepts(workflowId, num, tone, selectedContentPiece.content_type);
                          const taggedConcepts = result.concepts.map((c: Record<string, unknown>) => ({ ...c, tone: row.tone, content_type: selectedContentPiece.content_type }));
                          const existing = pieceConcepts;
                          updatePieceSetting('concepts', 'generated_concepts', [...existing, ...taggedConcepts]);
                        } catch (err) { console.error('Concept generation failed:', err); }
                        finally { setGeneratingRows((prev) => { const next = new Set(prev); next.delete(idx); return next; }); }
                      };

                      // Type-specific concept card renderer
                      const renderConceptCard = (concept: GeneratedConcept, idx: number) => {
                        const ct = (concept as Record<string, unknown>).content_type as string | undefined;
                        const isEditing = editingConceptIdx === idx;
                        return (
                          <div key={idx} className="relative group/card rounded border border-border p-3 space-y-2">
                            <div className="absolute top-2 right-2 flex items-center gap-1">
                              <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-foreground/70">{(concept as Record<string, unknown>).tone as string || 'general'}</span>
                              {ct && <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-foreground/70">{ct}</span>}
                              <button onClick={() => setEditingConceptIdx(isEditing ? null : idx)} className="opacity-0 group-hover/card:opacity-100 rounded p-1 text-muted-foreground hover:text-foreground transition-all"><Pencil className="h-3 w-3" /></button>
                              <button onClick={() => deleteConceptO(idx)} className="opacity-0 group-hover/card:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive transition-all"><Trash2 className="h-3 w-3" /></button>
                            </div>
                            <h4 className="text-xs font-semibold pr-28">{concept.title}</h4>

                            {/* Reel layout */}
                            {ct === 'reel' && (() => {
                              const rc = concept as ReelConcept;
                              if (isEditing) return (<>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Hook</div><textarea value={rc.hook} onChange={(e) => updateConceptO(idx, 'hook', e.target.value)} rows={2} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /></div>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Script</div><textarea value={typeof rc.script === 'string' ? rc.script : (rc.script as string[]).join('\n')} onChange={(e) => updateConceptO(idx, 'script', e.target.value.split('\n'))} rows={4} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /></div>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Audio Cues</div><input value={rc.audio_cues || ''} onChange={(e) => updateConceptO(idx, 'audio_cues', e.target.value)} className="w-full h-7 rounded border border-border bg-background px-2 text-xs text-foreground" /></div>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Duration</div><input value={rc.duration || ''} onChange={(e) => updateConceptO(idx, 'duration', e.target.value)} className="w-full h-7 rounded border border-border bg-background px-2 text-xs text-foreground" /></div>
                              </>);
                              return (<>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Hook</div><p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{rc.hook}</p></div>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Script</div>
                                  {Array.isArray(rc.script) ? <ul className="space-y-0.5">{rc.script.map((line, li) => (<li key={li} className="text-[10px] text-muted-foreground flex items-start gap-1.5"><span className="text-muted-foreground/40 shrink-0">&#x2022;</span><span className="whitespace-pre-line">{line}</span></li>))}</ul>
                                  : <p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{rc.script}</p>}
                                </div>
                                {rc.audio_cues && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Audio Cues</div><p className="text-[10px] text-muted-foreground">{rc.audio_cues}</p></div>}
                                {rc.duration && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Duration</div><p className="text-[10px] text-muted-foreground">{rc.duration}</p></div>}
                              </>);
                            })()}

                            {/* Carousel layout */}
                            {ct === 'carousel' && (() => {
                              const cc = concept as CarouselConcept;
                              if (isEditing) return (<>
                                {(cc.slides || []).map((slide, si) => (
                                  <div key={si} className="border-l-2 border-border pl-2 space-y-1">
                                    <div className="font-mono text-[8px] uppercase text-muted-foreground/40">Slide {si + 1}</div>
                                    <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Image Description</div><textarea value={slide.image_description} onChange={(e) => { const slides = [...cc.slides]; slides[si] = { ...slides[si], image_description: e.target.value }; updateConceptO(idx, 'slides', slides); }} rows={2} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /></div>
                                    <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Caption</div><textarea value={slide.caption} onChange={(e) => { const slides = [...cc.slides]; slides[si] = { ...slides[si], caption: e.target.value }; updateConceptO(idx, 'slides', slides); }} rows={2} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /></div>
                                  </div>
                                ))}
                              </>);
                              return (<>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Slides ({(cc.slides || []).length})</div>
                                  {(cc.slides || []).map((slide, si) => (
                                    <div key={si} className="border-l-2 border-border pl-2 py-1 space-y-0.5">
                                      <div className="font-mono text-[8px] uppercase text-muted-foreground/40">Slide {si + 1}</div>
                                      <p className="text-[10px] text-muted-foreground"><span className="font-medium">Image:</span> {slide.image_description}</p>
                                      <p className="text-[10px] text-muted-foreground"><span className="font-medium">Caption:</span> {slide.caption}</p>
                                    </div>
                                  ))}
                                </div>
                                {cc.messaging && cc.messaging.length > 0 && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Key Messaging</div><ul className="space-y-0.5">{cc.messaging.map((msg, mi) => (<li key={mi} className="text-[10px] text-muted-foreground flex items-start gap-1.5"><span className="text-muted-foreground/40 shrink-0">&#x2022;</span><span>{msg}</span></li>))}</ul></div>}
                              </>);
                            })()}

                            {/* Post layout */}
                            {ct === 'post' && (() => {
                              const pc = concept as PostConcept;
                              if (isEditing) return (<>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Image Description</div><textarea value={pc.image_description} onChange={(e) => updateConceptO(idx, 'image_description', e.target.value)} rows={3} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /></div>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Caption</div><textarea value={pc.caption} onChange={(e) => updateConceptO(idx, 'caption', e.target.value)} rows={3} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /></div>
                              </>);
                              return (<>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Image Description</div><p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{pc.image_description}</p></div>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Caption</div><p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{pc.caption}</p></div>
                                {pc.messaging && pc.messaging.length > 0 && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Key Messaging</div><ul className="space-y-0.5">{pc.messaging.map((msg, mi) => (<li key={mi} className="text-[10px] text-muted-foreground flex items-start gap-1.5"><span className="text-muted-foreground/40 shrink-0">&#x2022;</span><span>{msg}</span></li>))}</ul></div>}
                              </>);
                            })()}

                            {/* Story layout */}
                            {ct === 'story' && (() => {
                              const sc = concept as StoryConcept;
                              if (isEditing) return (<>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Frame Description</div><textarea value={sc.frame_description} onChange={(e) => updateConceptO(idx, 'frame_description', e.target.value)} rows={3} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /></div>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Caption</div><textarea value={sc.caption} onChange={(e) => updateConceptO(idx, 'caption', e.target.value)} rows={2} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /></div>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">CTA</div><input value={sc.cta || ''} onChange={(e) => updateConceptO(idx, 'cta', e.target.value)} className="w-full h-7 rounded border border-border bg-background px-2 text-xs text-foreground" /></div>
                              </>);
                              return (<>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Frame Description</div><p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{sc.frame_description}</p></div>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Caption</div><p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{sc.caption}</p></div>
                                {sc.cta && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">CTA</div><p className="text-[10px] text-muted-foreground font-medium">{sc.cta}</p></div>}
                              </>);
                            })()}

                            {/* Fallback for legacy/unknown content types */}
                            {(!ct || !['reel', 'carousel', 'post', 'story'].includes(ct)) && (() => {
                              const fc = concept as { hook?: string; script?: string | string[]; messaging?: string[] };
                              if (isEditing) return (<>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Hook</div><textarea value={fc.hook || ''} onChange={(e) => updateConceptO(idx, 'hook', e.target.value)} rows={2} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /></div>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Script</div><textarea value={typeof fc.script === 'string' ? fc.script : (fc.script as string[] || []).join('\n')} onChange={(e) => updateConceptO(idx, 'script', e.target.value)} rows={4} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /></div>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Key Messaging (one per line)</div><textarea value={(fc.messaging || []).join('\n')} onChange={(e) => updateConceptO(idx, 'messaging', e.target.value.split('\n'))} rows={3} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /></div>
                              </>);
                              return (<>
                                {fc.hook && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Hook</div><p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{fc.hook}</p></div>}
                                {fc.script && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Script</div>{typeof fc.script === 'string' ? <p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{fc.script}</p> : <ul className="space-y-0.5">{(fc.script as string[]).map((line, li) => (<li key={li} className="text-[10px] text-muted-foreground flex items-start gap-1.5"><span className="text-muted-foreground/40 shrink-0">&#x2022;</span><span className="whitespace-pre-line">{line}</span></li>))}</ul>}</div>}
                                {fc.messaging && fc.messaging.length > 0 && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Key Messaging</div><ul className="space-y-0.5">{fc.messaging.map((msg, mi) => (<li key={mi} className="text-[10px] text-muted-foreground flex items-start gap-1.5"><span className="text-muted-foreground/40 shrink-0">&#x2022;</span><span className="whitespace-pre-line">{msg}</span></li>))}</ul></div>}
                              </>);
                            })()}
                            {/* WS8: Feedback bar */}
                            <div className="pt-2 border-t border-border mt-2">
                              <FeedbackBar
                                workflowId={workflowId}
                                contentId={selectedContentPiece?.content_id}
                                stageKey="concepts"
                                itemType="concept"
                                itemId={`concept_${idx}`}
                                onRegenerate={() => handleGenerateO(0)}
                              />
                            </div>
                          </div>
                        );
                      };

                      return (
                        <>
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Generate &middot; {totalConcepts} total</div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={async () => { for (let i = 0; i < conceptRows.length; i++) { await handleGenerateO(i); } }}
                                  disabled={generatingRows.size > 0}
                                  className="font-mono text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors inline-flex items-center gap-1"
                                >
                                  {generatingRows.size > 0 ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                                  Generate All
                                </button>
                                <button onClick={addConceptRowO} className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">+ Add Variation</button>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              {conceptRows.map((row, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <Input type="number" min={1} max={50} className="h-7 w-[48px] text-xs shrink-0 px-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" placeholder="#" value={row.num} onChange={(e) => updateConceptRowO(idx, 'num', e.target.value)} />
                                  <span className="text-muted-foreground text-[10px] shrink-0">&times;</span>
                                  <Combobox value={row.tone} onValueChange={(v) => updateConceptRowO(idx, 'tone', v)} placeholder="Tone" className="w-[140px] shrink-0 h-7" options={[
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
                                  <button onClick={() => handleGenerateO(idx)} disabled={generatingRows.has(idx)} className="shrink-0 rounded p-1 text-muted-foreground/60 hover:text-foreground disabled:opacity-30 transition-colors">
                                    {generatingRows.has(idx) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                                  </button>
                                  {conceptRows.length > 1 && (
                                    <button onClick={() => removeConceptRowO(idx)} className="shrink-0 rounded p-1 text-muted-foreground/40 hover:text-foreground transition-colors"><X className="h-3 w-3" /></button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {pieceConcepts.length > 0 && (
                            <div>
                              <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Generated Concepts ({pieceConcepts.length})</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {pieceConcepts.map((concept, idx) => renderConceptCard(concept, idx))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* ── Image Generation ── */}
                    {stage.key === 'image_generation' && (() => {
                      if (!selectedContentPiece) {
                        return <div className="text-center py-8 text-muted-foreground/50"><CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Select a content piece from the calendar first</p></div>;
                      }
                      const pieceConcepts = ((getPieceSetting('concepts', 'generated_concepts') as GeneratedConcept[]) || []) as GeneratedConcept[];
                      return (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{oImgRows.length} variation{oImgRows.length !== 1 ? 's' : ''}</div>
                            <button onClick={addImgRow} className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">+ Add Variation</button>
                          </div>
                          <div className="space-y-1.5">
                            {oImgRows.map((row, idx) => (
                              <div key={idx} className="flex items-end gap-1.5">
                                <div className="shrink-0">
                                  <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Concept</div>
                                  <Select value={String(row.conceptIdx)} onValueChange={(v) => updateImgRow(idx, 'conceptIdx', Number(v))}>
                                    <SelectTrigger className="h-7 w-[280px] text-xs"><SelectValue placeholder="Concept" /></SelectTrigger>
                                    <SelectContent>
                                      {pieceConcepts.map((c, ci) => (<SelectItem key={ci} value={String(ci)}>{c.title}</SelectItem>))}
                                      {pieceConcepts.length === 0 && <SelectItem value="0" disabled>No concepts yet</SelectItem>}
                                    </SelectContent>
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
                                  <button
                                    disabled={pieceConcepts.length === 0 || !row.imageModel}
                                    onClick={async () => {
                                      if (!row.imageModel || pieceConcepts.length === 0) return;
                                      setImgGenLoading(prev => new Set(prev).add(idx));
                                      try {
                                        const { task_id } = await generateConceptImage(
                                          workflowId,
                                          row.conceptIdx,
                                          row.imageModel,
                                          undefined,
                                          selectedContentPiece?.content_id,
                                        );
                                        // Poll until done
                                        for (let p = 0; p < 120; p++) {
                                          await new Promise(r => setTimeout(r, 3000));
                                          try {
                                            const st = await pollConceptImageStatus(workflowId, task_id);
                                            if (st.status === 'completed') {
                                              await loadWorkflow();
                                              break;
                                            }
                                            if (st.status === 'failed') {
                                              console.error('Image gen failed:', st.message);
                                              break;
                                            }
                                          } catch { break; }
                                        }
                                      } catch (err) {
                                        console.error('Image generation failed:', err);
                                      } finally {
                                        setImgGenLoading(prev => { const n = new Set(prev); n.delete(idx); return n; });
                                      }
                                    }}
                                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Generate"
                                  >
                                    {imgGenLoading.has(idx) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                                {oImgRows.length > 1 && (
                                  <div className="shrink-0"><div className="font-mono text-[8px] uppercase tracking-wider text-transparent mb-0.5 select-none">X</div><button onClick={() => removeImgRow(idx)} className="h-7 inline-flex items-center justify-center rounded p-1 text-muted-foreground/40 hover:text-foreground transition-colors"><X className="h-3 w-3" /></button></div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Generated images gallery */}
                        {(() => {
                          const genImages = (getPieceSetting('image_generation', 'generated_images') as Array<{ concept_index: number; slide_index: number | null; image_url: string; image_model: string }>) || [];
                          if (genImages.length === 0) return null;
                          return (
                            <div className="mt-3">
                              <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Generated Images</div>
                              <div className="grid grid-cols-3 gap-1.5">
                                {genImages.map((img, gi) => (
                                  <div key={gi} className="relative group">
                                    <img src={img.image_url} alt={`Concept ${img.concept_index}`} className="w-full aspect-square rounded object-cover border border-border" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 py-0.5 rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
                                      {pieceConcepts[img.concept_index]?.title?.slice(0, 20) || `Concept ${img.concept_index}`} · {img.image_model.split('/').pop()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        {pieceConcepts.length === 0 && <div className="text-center py-4 text-muted-foreground/50"><p className="text-xs">Generate concepts first in the Concepts stage</p></div>}
                      </>
                      );
                    })()}

                    {/* ── Storyboard ── */}
                    {stage.key === 'storyboard' && (() => {
                      if (!selectedContentPiece) {
                        return <div className="text-center py-8 text-muted-foreground/50"><CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Select a content piece from the calendar first</p></div>;
                      }
                      return (
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

                        {/* Storyboard list — collapsible cards */}
                        {oConceptVariations.length > 0 && (
                          <div className="space-y-3">
                            {oConceptVariations.map((sbRaw, vi) => {
                              const sbFlatIdx = oStoryboards.indexOf(sbRaw);
                              const sbChars = [...(sbRaw.characters || []) as SbChar[]];
                              const sbScenes = [...(sbRaw.scenes || []) as SbScene[]];
                              const sbStoryline = (sbRaw.storyline || '') as string;
                              const sbTotalCuts = (sbRaw.total_cuts || 0) as number;
                              const isCollapsed = collapsedStoryboards.has(sbFlatIdx);
                              const totalDuration = sbScenes.reduce((sum, s) => sum + (parseInt(String(s.duration_hint).replace('s', '')) || 0), 0);
                              const conceptTitle = (sbRaw.concept_title || oGeneratedConcepts[storyboardConceptIdx]?.title || `Concept ${storyboardConceptIdx + 1}`) as string;

                              return (
                                <div key={sbFlatIdx} className="rounded-lg border border-border bg-card overflow-hidden">
                                  {/* Card header */}
                                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border">
                                    <button
                                      onClick={() => setCollapsedStoryboards(prev => { const next = new Set(prev); if (next.has(sbFlatIdx)) next.delete(sbFlatIdx); else next.add(sbFlatIdx); return next; })}
                                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium truncate">{conceptTitle} — v{vi + 1}</span>
                                        <span className="font-mono text-[9px] text-muted-foreground">{sbTotalCuts} cuts</span>
                                        <span className="font-mono text-[9px] text-muted-foreground">{sbChars.length} chars</span>
                                        <span className="font-mono text-[9px] text-muted-foreground">{sbScenes.length} scenes</span>
                                        <span className="font-mono text-[9px] text-muted-foreground">{totalDuration}s</span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => { if (confirm('Delete this storyboard?')) deleteStoryboard(workflowId, sbFlatIdx).then(() => loadWorkflow()).catch(() => {}); }}
                                      className="shrink-0 h-6 w-6 rounded flex items-center justify-center text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                      title="Delete storyboard"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>

                                  {/* Collapsible body */}
                                  {!isCollapsed && (
                                    <div className="p-3 space-y-4">
                                      {/* Storyline */}
                                      <div>
                                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Storyline</div>
                                        <div
                                          contentEditable
                                          suppressContentEditableWarning
                                          className="w-full text-sm text-foreground/80 leading-relaxed bg-transparent border border-border rounded hover:border-foreground/30 focus:border-primary focus:outline-none px-3 py-2 min-h-[40px]"
                                          onBlur={(e) => {
                                            const val = e.currentTarget.innerText;
                                            if (val !== sbStoryline) {
                                              updateStageSetting('storyboard', `storyline_${storyboardConceptIdx}_v${vi}`, val);
                                            }
                                          }}
                                          dangerouslySetInnerHTML={{ __html: ((getSetting('storyboard', `storyline_${storyboardConceptIdx}_v${vi}`) as string) || sbStoryline).replace(/\n/g, '<br/>') }}
                                        />
                                      </div>

                                      {/* Characters */}
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Characters</div>
                                          <button
                                            onClick={() => {
                                              const newChar = { id: `char_${Date.now()}`, name: 'New Character', description: '', image_prompt: '', image_url: null, gs_uri: null, image_model: '' };
                                              const sbKey = `_new_characters_${storyboardConceptIdx}`;
                                              const existing = (getSetting('storyboard', sbKey) as typeof sbChars) || [];
                                              updateStageSetting('storyboard', sbKey, [...existing, newChar]);
                                            }}
                                            className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                          >+ Add Character</button>
                                        </div>
                                        <div className="flex gap-3 flex-wrap">
                                          {sbChars.map((char) => (
                                            <div key={char.id} className="w-[200px] rounded-lg border border-border overflow-hidden bg-muted/20">
                                              <div className="relative aspect-[3/4] bg-muted">
                                                {char.image_url ? (
                                                  // eslint-disable-next-line @next/next/no-img-element
                                                  <img src={char.image_url} alt={char.name} className="h-full w-full object-cover" />
                                                ) : (
                                                  <div className="flex h-full items-center justify-center">{generatingImages.has(char.id) ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <UserIcon className="h-5 w-5 text-muted-foreground/20" />}</div>
                                                )}
                                              </div>
                                              <div className="p-2 space-y-1">
                                                <input className="text-[10px] font-medium truncate bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-full" defaultValue={char.name} onBlur={(e) => { if (e.target.value !== char.name) updateStoryboardScene(workflowId, sbFlatIdx, char.id, { title: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = char.name; }); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                                                <textarea className="text-[8px] text-muted-foreground leading-relaxed bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none w-full resize-none" defaultValue={char.description} rows={2} onBlur={(e) => { if (e.target.value !== char.description) updateStoryboardScene(workflowId, sbFlatIdx, char.id, { description: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = char.description; }); }} />
                                                {imageErrors.get(char.id) && <p className="text-[8px] text-destructive line-clamp-2">{imageErrors.get(char.id)}</p>}
                                                <Button size="sm" variant="outline" onClick={() => handleGenerateImageOverview('character', char.id)} disabled={generatingImages.has(char.id)} className="w-full h-5 text-[8px]">
                                                  {generatingImages.has(char.id) ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : char.image_url ? 'Regenerate' : 'Generate'}
                                                </Button>
                                                <FeedbackBar workflowId={workflowId} contentId={selectedContentPiece?.content_id} stageKey="storyboard" itemType="character" itemId={char.id} />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Scenes */}
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Scenes</div>
                                          <button
                                            onClick={() => {
                                              const newScene = { id: `scene_${Date.now()}`, scene_number: sbScenes.length + 1, title: 'New Scene', description: '', shot_type: 'medium', duration_hint: '5s', character_ids: [] as string[], image_prompt: '', image_url: null, gs_uri: null, image_model: '' };
                                              const sbKey = `_new_scenes_${storyboardConceptIdx}`;
                                              const existing = (getSetting('storyboard', sbKey) as typeof sbScenes) || [];
                                              updateStageSetting('storyboard', sbKey, [...existing, newScene]);
                                            }}
                                            className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                          >+ Add Scene</button>
                                        </div>
                                        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sbScenes.length}, 1fr)` }}>
                                          {sbScenes.map((scene) => {
                                            const charsReady = (scene.character_ids || []).every((cid) => { const c = sbChars.find((ch) => ch.id === cid); return c && c.image_url; });
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
                                                    <input className="text-[10px] font-medium bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none flex-1 min-w-0" defaultValue={scene.title} onBlur={(e) => { if (e.target.value !== scene.title) updateStoryboardScene(workflowId, sbFlatIdx, scene.id, { title: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = scene.title; }); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                                                  </div>
                                                  <textarea className="text-[8px] text-muted-foreground leading-relaxed bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none w-full resize-none" defaultValue={scene.description} rows={3} onBlur={(e) => { if (e.target.value !== scene.description) updateStoryboardScene(workflowId, sbFlatIdx, scene.id, { description: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = scene.description; }); }} />
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    <input className="font-mono text-[8px] bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-[60px]" defaultValue={scene.shot_type} onBlur={(e) => { if (e.target.value !== scene.shot_type) updateStoryboardScene(workflowId, sbFlatIdx, scene.id, { shot_type: e.target.value }).then(() => loadWorkflow()).catch(() => { e.target.value = scene.shot_type; }); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                                                    <div className="flex items-center gap-0 rounded border border-border overflow-hidden">
                                                      <button className="h-4 px-1 text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => { const cur = parseInt(String(scene.duration_hint).replace('s', '')) || 5; const next = Math.max(1, cur - 1); updateStoryboardScene(workflowId, sbFlatIdx, scene.id, { duration_hint: `${next}s` }).then(() => loadWorkflow()); }}>-</button>
                                                      <span className="font-mono text-[8px] px-1 tabular-nums">{scene.duration_hint}</span>
                                                      <button className="h-4 px-1 text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => { const cur = parseInt(String(scene.duration_hint).replace('s', '')) || 5; const next = Math.min(60, cur + 1); updateStoryboardScene(workflowId, sbFlatIdx, scene.id, { duration_hint: `${next}s` }).then(() => loadWorkflow()); }}>+</button>
                                                    </div>
                                                  </div>
                                                  {(scene.character_ids || []).length > 0 && (
                                                    <div className="flex flex-wrap gap-0.5">
                                                      {(scene.character_ids || []).map((cid) => { const c = sbChars.find((ch) => ch.id === cid); return <span key={cid} className="inline-flex items-center rounded-full border border-border px-1 py-px font-mono text-[7px] text-muted-foreground">{c?.name || cid}</span>; })}
                                                    </div>
                                                  )}
                                                  {imageErrors.get(scene.id) && <p className="text-[7px] text-destructive">{imageErrors.get(scene.id)}</p>}
                                                  <Button size="sm" variant="outline" onClick={() => handleGenerateImageOverview('scene', scene.id)} disabled={generatingImages.has(scene.id) || !charsReady} title={!charsReady ? 'Generate character images first' : undefined} className="w-full h-5 text-[8px] mt-auto">
                                                    {generatingImages.has(scene.id) ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : !charsReady ? 'Chars required' : scene.image_url ? 'Regenerate' : 'Generate'}
                                                  </Button>
                                                  {scene.dialog && <div><div className="font-mono text-[7px] uppercase text-muted-foreground/50">Dialog</div><p className="text-[8px] text-muted-foreground">{scene.dialog}</p></div>}
                                                  {scene.lighting && <div><div className="font-mono text-[7px] uppercase text-muted-foreground/50">Lighting</div><p className="text-[8px] text-muted-foreground">{scene.lighting}</p></div>}
                                                  {scene.time_of_day && <div><div className="font-mono text-[7px] uppercase text-muted-foreground/50">Time</div><p className="text-[8px] text-muted-foreground">{scene.time_of_day}</p></div>}
                                                  {scene.camera_move && <div><div className="font-mono text-[7px] uppercase text-muted-foreground/50">Camera</div><p className="text-[8px] text-muted-foreground">{scene.camera_move}</p></div>}
                                                  <div className="pt-1 border-t border-border mt-1">
                                                    <FeedbackBar workflowId={workflowId} contentId={selectedContentPiece?.content_id} stageKey="storyboard" itemType="scene" itemId={scene.id} />
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Storyboard-level feedback — always visible at bottom of card */}
                                  <div className="px-3 py-2 border-t border-border">
                                    <FeedbackBar workflowId={workflowId} contentId={selectedContentPiece?.content_id} stageKey="storyboard" itemType="storyboard" itemId={`sb_${sbFlatIdx}`} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {oConceptVariations.length === 0 && !generatingStoryboard && oGeneratedConcepts.length > 0 && (
                          <div className="text-center py-6 text-muted-foreground/50"><ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Select a concept and click &quot;Generate Storyboard&quot; to begin</p></div>
                        )}
                        {oGeneratedConcepts.length === 0 && <div className="text-center py-6 text-muted-foreground/50"><p className="text-xs">Generate concepts first in the Concepts stage</p></div>}
                      </>
                      );
                    })()}

                    {/* ── Video Generation ── */}
                    {stage.key === 'video_generation' && (() => {
                      if (!selectedContentPiece) {
                        return <div className="text-center py-8 text-muted-foreground/50"><CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Select a content piece from the calendar first</p></div>;
                      }
                      return (
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
                                  const oGridCols = oVidScenes.length <= 2 ? `repeat(${oVidScenes.length}, minmax(0, 280px))` : `repeat(${oVidScenes.length}, 1fr)`;
                                  return (
                                    <div className="space-y-3">
                                      {/* Scenes row — storyboard images */}
                                      <div>
                                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Scenes</div>
                                        <div className="grid gap-2 pb-1 items-stretch" style={{ gridTemplateColumns: oGridCols }}>
                                          {oVidScenes.map((scene) => (
                                            <div key={scene.id} className="rounded border border-border overflow-hidden flex flex-col">
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
                                                <FeedbackBar workflowId={workflowId} contentId={selectedContentPiece?.content_id} stageKey="video_generation" itemType="scene" itemId={scene.id} />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Generated video rows — one row per variation/task */}
                                      {taskIds.map((tid) => {
                                        const batchVideos = sceneVars.filter((v) => v.task_id === tid);
                                        const batchModel = batchVideos[0]?.model || '?';
                                        return (
                                          <div key={tid}>
                                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">{batchModel}</div>
                                            <div className="grid gap-2 items-stretch" style={{ gridTemplateColumns: oGridCols }}>
                                              {oVidScenes.map((scene) => {
                                                const vid = batchVideos.find((v) => v.scene_number === scene.scene_number || v.id.includes(`-scene${scene.scene_number}-`));
                                                return (
                                                  <div key={scene.id} className="rounded border border-border overflow-hidden relative group/vid">
                                                    {vid?.preview ? (
                                                      <div className={`${oVideoAspect} bg-black`}>
                                                        <video src={vid.preview} className="h-full w-full object-contain bg-black [&:fullscreen]:h-screen [&:fullscreen]:w-auto [&:fullscreen]:mx-auto" controls playsInline />
                                                        {vid.id && <button className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white/70 hover:text-white hover:bg-red-600/80 opacity-0 group-hover/vid:opacity-100 transition-opacity flex items-center justify-center" onClick={() => deleteVideoVariation(workflowId, vid.id).then(() => loadWorkflow()).catch(() => {})}><X className="h-2.5 w-2.5" /></button>}
                                                      </div>
                                                    ) : (
                                                      <div className={`${oVideoAspect} bg-muted/50 flex items-center justify-center`}><span className="font-mono text-[8px] text-muted-foreground/40">rendering...</span></div>
                                                    )}
                                                    <div className="px-1.5 py-1">
                                                      <FeedbackBar workflowId={workflowId} contentId={selectedContentPiece?.content_id} stageKey="video_generation" itemType="video" itemId={vid?.id || `scene-${scene.scene_number}`} />
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
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
                                            <div className="p-1.5">
                                              <p className="text-[9px] font-medium truncate">{v.title}</p>
                                              {/* WS8: FeedbackBar */}
                                              <FeedbackBar workflowId={workflowId} contentId={selectedContentPiece?.content_id} stageKey="video_generation" itemType="video" itemId={v.id} />
                                            </div>
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
                      );
                    })()}

                    {/* ── Simulation & Testing ── */}
                    {stage.key === 'simulation_testing' && (() => {
                      if (!selectedContentPiece) {
                        return <div className="text-center py-8 text-muted-foreground/50"><CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Select a content piece from the calendar first</p></div>;
                      }
                      type SimTest = { id: string; persona_ids: string[]; genders: string[]; ages: string[]; llm: string; video_ids: string[]; results?: SimulationResult[]; error?: string; running?: boolean };
                      const simNode = nodes.find((n) => n.stage_key === 'simulation_testing');
                      const savedTests = ((simNode?.output_data?.tests || []) as SimTest[]);
                      // If top-level results exist but no tests, create a synthetic test to display them
                      const topLevelResults = (simNode?.output_data?.results || []) as SimulationResult[];
                      const fallbackTests: SimTest[] = savedTests.length === 0 && topLevelResults.length > 0
                        ? [{ id: 'legacy', persona_ids: [], genders: [...new Set(topLevelResults.map(r => r.gender))], ages: [...new Set(topLevelResults.map(r => r.age))], llm: (simNode?.output_data?.config as Record<string, unknown>)?.model_name as string || 'gemini-pro-3', video_ids: [], results: topLevelResults }]
                        : savedTests;
                      const tests = ((getSetting('simulation_testing', 'tests') as SimTest[]) || fallbackTests).map((t: SimTest) => ({ ...t, video_ids: t.video_ids || [] }));

                      // Get full videos for selection (stitched + video types, not individual scenes)
                      const vidNode = nodes.find((n) => n.stage_key === 'video_generation');
                      const allVars = (vidNode?.output_data?.variations || []) as Array<{ id: string; title?: string; preview?: string; type: string; model?: string; scene_number?: number; task_id?: string }>;
                      const stitchedVars = allVars.filter((v) => v.preview && (v.type === 'stitched' || v.type === 'video'));
                      const firstVideo = stitchedVars[0];

                      const updateTests = (next: SimTest[]) => updateStageSetting('simulation_testing', 'tests', next);
                      const addTest = () => {
                        const newTest: SimTest = { id: `t${Date.now()}`, persona_ids: [], genders: ['Male', 'Female'], ages: ['18-24', '25-34'], llm: 'gemini-pro-3', video_ids: [] };
                        updateTests([...tests, newTest]);
                      };
                      const removeTest = (id: string) => updateTests(tests.filter((t) => t.id !== id));
                      const updateTest = (id: string, field: string, value: unknown) => {
                        updateTests(tests.map((t) => t.id === id ? { ...t, [field]: value } : t));
                      };
                      const toggleTestArray = (id: string, field: string, item: string) => {
                        const test = tests.find((t) => t.id === id);
                        if (!test) return;
                        const arr = (test[field as keyof SimTest] as string[]) || [];
                        const next = arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
                        updateTest(id, field, next);
                      };

                      const runTest = async (testId: string) => {
                        const test = tests.find((t) => t.id === testId);
                        if (!test) return;
                        updateTests(tests.map((t) => t.id === testId ? { ...t, running: true, error: undefined } : t));
                        try {
                          const res = await runContentSimulation(workflowId, {
                            genders: test.genders,
                            ages: test.ages,
                            model_provider: '',
                            model_name: test.llm,
                            persona_ids: test.persona_ids.length > 0 ? test.persona_ids : undefined,
                            video_ids: test.video_ids.length > 0 ? test.video_ids : undefined,
                          });
                          updateTests(tests.map((t) => t.id === testId ? { ...t, results: res.results, running: false } : t));
                          loadWorkflow();
                        } catch (err) {
                          updateTests(tests.map((t) => t.id === testId ? { ...t, error: err instanceof Error ? err.message : 'Failed', running: false } : t));
                        }
                      };

                      return (
                        <div className="space-y-4">
                          {/* Header + Add Test */}
                          <div className="flex items-center justify-between">
                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{tests.length} test{tests.length !== 1 ? 's' : ''}</div>
                            <button onClick={addTest} className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                              <Plus className="h-3 w-3" /> Add Test
                            </button>
                          </div>

                          {/* Test Cards */}
                          {tests.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
                              <BarChart2 className="h-10 w-10 mb-3 opacity-30" />
                              <p className="text-sm font-medium text-muted-foreground/70">No tests yet</p>
                              <p className="text-xs mt-1 mb-3">Add a test to score content against demographic segments</p>
                              <Button size="sm" variant="outline" className="h-8 font-mono text-[10px] uppercase tracking-wider" onClick={addTest}>
                                <Plus className="h-3 w-3 mr-1.5" /> Add Test
                              </Button>
                            </div>
                          )}

                          <div className="space-y-4">
                            {tests.map((test, tIdx) => {
                              const tCombos = test.genders.length * test.ages.length;
                              const tResults = test.results || [];
                              const tGenders = [...new Set(tResults.map((r) => r.gender))];
                              const tAges = [...new Set(tResults.map((r) => r.age))];
                              const tPersonaNames = test.persona_ids.map((pid) => personas.find((p) => p.id === pid)?.name).filter(Boolean);

                              return (
                                <div key={test.id} className="rounded-lg border border-border overflow-hidden">
                                  {/* Card header */}
                                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[10px] font-semibold">Test {tIdx + 1}</span>
                                      {tResults.length > 0 && <span className="inline-flex rounded-full bg-foreground/10 px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground">{tResults.length} results</span>}
                                      {test.running && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                    </div>
                                    <button onClick={() => removeTest(test.id)} className="rounded p-1 text-muted-foreground/40 hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
                                  </div>

                                  <div className="p-4 space-y-4">
                                    {/* Config row */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                      {/* Personas */}
                                      {personas.length > 0 && (
                                        <div className="space-y-1.5">
                                          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">Personas</div>
                                          <div className="space-y-1">
                                            {personas.map((p) => (
                                              <label key={p.id} className={`flex items-center gap-2 text-xs cursor-pointer rounded px-1.5 py-1 transition-colors ${test.persona_ids.includes(p.id) ? 'bg-muted/80' : 'hover:bg-muted/30'}`}>
                                                <input type="checkbox" className="rounded border-border" checked={test.persona_ids.includes(p.id)} onChange={() => toggleTestArray(test.id, 'persona_ids', p.id)} />
                                                <span className="truncate">{p.name}</span>
                                              </label>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Gender */}
                                      <div className="space-y-1.5">
                                        <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">Gender</div>
                                        {SIM_GENDERS.map((g) => (
                                          <label key={g} className="flex items-center gap-2 text-xs cursor-pointer">
                                            <input type="checkbox" className="rounded border-border" checked={test.genders.includes(g)} onChange={() => toggleTestArray(test.id, 'genders', g)} />
                                            <span>{g}</span>
                                          </label>
                                        ))}
                                      </div>

                                      {/* Age Ranges */}
                                      <div className="space-y-1.5">
                                        <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">Age Ranges</div>
                                        <div className="columns-2 gap-x-3">
                                          {SIM_AGE_RANGES.map((a) => (
                                            <label key={a} className="flex items-center gap-2 text-xs cursor-pointer mb-1">
                                              <input type="checkbox" className="rounded border-border" checked={test.ages.includes(a)} onChange={() => toggleTestArray(test.id, 'ages', a)} />
                                              <span>{a}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>

                                      {/* LLM */}
                                      <div className="space-y-1.5">
                                        <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">LLM</div>
                                        <Select value={test.llm} onValueChange={(v) => updateTest(test.id, 'llm', v)}>
                                          <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            {SIM_LLM_MODELS.map((m) => (
                                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    {/* Video selection — stitched videos only */}
                                    {stitchedVars.length > 0 && (
                                      <div className="space-y-1.5">
                                        <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                                          Videos {test.video_ids.length === 0 ? <span className="text-muted-foreground/40 normal-case">(all)</span> : <span className="text-muted-foreground/40 normal-case">({test.video_ids.length} selected)</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          <button
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-mono transition-colors ${test.video_ids.length === 0 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                            onClick={() => updateTest(test.id, 'video_ids', [])}
                                          >All</button>
                                          {stitchedVars.map((v) => (
                                            <button
                                              key={v.id}
                                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-mono transition-colors ${test.video_ids.includes(v.id) ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                              onClick={() => {
                                                const next = test.video_ids.includes(v.id) ? test.video_ids.filter((id) => id !== v.id) : [...test.video_ids, v.id];
                                                updateTest(test.id, 'video_ids', next);
                                              }}
                                            >{v.title || `Stitched — ${v.model || '?'}`}</button>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Run row */}
                                    <div className="flex items-center gap-3">
                                      <Button size="sm" className="h-7 font-mono text-[10px] uppercase tracking-wider" disabled={test.running || test.genders.length === 0 || test.ages.length === 0} onClick={() => runTest(test.id)}>
                                        {test.running ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Running...</> : <><BarChart2 className="h-3 w-3 mr-1.5" />Run</>}
                                      </Button>
                                      <span className="text-[10px] text-muted-foreground/60 font-mono">
                                        {test.genders.length}g &times; {test.ages.length}a = {tCombos}
                                        {tPersonaNames.length > 0 && <> &middot; {tPersonaNames.join(', ')}</>}
                                      </span>
                                      {test.error && <span className="text-[10px] text-destructive">{test.error}</span>}
                                    </div>

                                    {/* Results — grouped by video */}
                                    {tResults.length > 0 && (() => {
                                      // Group results by video_id
                                      const videoIds = [...new Set(tResults.map((r) => r.video_id || 'all'))];
                                      return (
                                        <div className="space-y-6">
                                          {videoIds.map((vidId) => {
                                            const vidResults = tResults.filter((r) => (r.video_id || 'all') === vidId);
                                            const vidTitle = vidResults[0]?.video_title || 'All Content';
                                            const vidVar = allVars.find((v) => v.id === vidId);
                                            const avgScore = Math.round(vidResults.reduce((s, r) => s + r.score, 0) / vidResults.length);
                                            const selectedResult = expandedScoreKey ? vidResults.find((r) => `${test.id}-${vidId}-${r.gender}-${r.age}` === expandedScoreKey) : null;
                                            return (
                                              <div key={vidId}>
                                                {/* Video header */}
                                                <div className="flex items-center gap-2 mb-2">
                                                  <span className="font-mono text-[10px] font-semibold">{vidTitle}</span>
                                                  <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground">avg {avgScore}</span>
                                                  <FeedbackBar workflowId={workflowId} contentId={selectedContentPiece?.content_id} stageKey="simulation_testing" itemType="simulation" itemId={`${vidId}`} />
                                                </div>
                                                <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 2fr' }}>
                                                  {/* Left col — video */}
                                                  <div className="rounded-lg overflow-hidden bg-black sticky top-4" style={{ maxHeight: '60vh' }}>
                                                    <div className="relative h-full">
                                                      {vidVar?.preview ? (
                                                        <video src={vidVar.preview} className="w-full h-full object-contain" controls playsInline />
                                                      ) : (
                                                        <div className="flex items-center justify-center h-full py-20"><Film className="h-8 w-8 text-white/20" /></div>
                                                      )}
                                                      {selectedResult && (
                                                        <div className="absolute top-3 right-3">
                                                          <div className="rounded-full bg-black/70 backdrop-blur-sm p-1">
                                                            <CircleScore score={selectedResult.score} size={80} />
                                                          </div>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                  {/* Right col — score cards */}
                                                  <div className="flex flex-col gap-1.5">
                                                    {[...vidResults].sort((a, b) => {
                                                      const ageOrder = SIM_AGE_RANGES.indexOf(a.age) - SIM_AGE_RANGES.indexOf(b.age);
                                                      return ageOrder !== 0 ? ageOrder : a.gender.localeCompare(b.gender);
                                                    }).map((result) => {
                                                      const cardKey = `${test.id}-${vidId}-${result.gender}-${result.age}`;
                                                      const isActive = expandedScoreKey === cardKey;
                                                      const scoreColor = result.score >= 75 ? 'border-l-green-500' : result.score >= 50 ? 'border-l-yellow-500' : result.score >= 25 ? 'border-l-orange-500' : 'border-l-red-500';
                                                      return (
                                                        <button key={cardKey} onClick={() => setExpandedScoreKey(isActive ? null : cardKey)} className={`w-full text-left rounded-lg border border-l-[3px] ${scoreColor} px-4 py-2.5 transition-colors flex items-center ${isActive ? 'border-foreground bg-muted/50' : 'border-border hover:bg-muted/30'}`}>
                                                          <div className="grid items-center gap-4 w-full" style={{ gridTemplateColumns: 'auto auto 1fr' }}>
                                                            <CircleScore score={result.score} />
                                                            <div className="font-mono text-sm font-semibold whitespace-nowrap">{result.gender}, {result.age}</div>
                                                            <p className="text-sm text-muted-foreground/70 leading-relaxed line-clamp-2">{result.reasoning}</p>
                                                          </div>
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Predictive Modeling ── */}
                    {stage.key === 'predictive_modeling' && (() => {
                      const vidNode = nodes.find((n) => n.stage_key === 'video_generation');
                      const allVars = (vidNode?.output_data?.variations || []) as Array<{ id: string; title?: string; preview?: string; type: string; model?: string }>;
                      const stitchedVars = allVars.filter((v) => v.preview && (v.type === 'stitched' || v.type === 'video'));
                      const predLlm = (getSetting('predictive_modeling', 'llm') as string) || 'gemini-pro-3';
                      const predVideoIds = ((getSetting('predictive_modeling', 'video_ids') as string[]) || []);

                      const fmtNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

                      const handleRunPredInline = async () => {
                        setPredRunning(true);
                        setPredError(null);
                        try {
                          const res = await runPredictiveModeling(workflowId, predLlm, predVideoIds.length > 0 ? predVideoIds : undefined);
                          setPredResults(res.predictions);
                          setPredBenchmarks(res.benchmarks);
                          loadWorkflow();
                        } catch (err) {
                          setPredError(err instanceof Error ? err.message : 'Prediction failed');
                        } finally {
                          setPredRunning(false);
                        }
                      };

                      return (
                        <div className="space-y-6">
                          {/* Controls */}
                          <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">LLM Model</div>
                                <Select value={predLlm} onValueChange={(v) => updateStageSetting('predictive_modeling', 'llm', v)}>
                                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {SIM_LLM_MODELS.map((m) => (
                                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {stitchedVars.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                                    Videos {predVideoIds.length === 0 ? <span className="text-muted-foreground/40 normal-case">(all)</span> : <span className="text-muted-foreground/40 normal-case">({predVideoIds.length} selected)</span>}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    <button
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-mono transition-colors ${predVideoIds.length === 0 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                      onClick={() => updateStageSetting('predictive_modeling', 'video_ids', [])}
                                    >All</button>
                                    {stitchedVars.map((v) => (
                                      <button
                                        key={v.id}
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-mono transition-colors ${predVideoIds.includes(v.id) ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                        onClick={() => {
                                          const next = predVideoIds.includes(v.id) ? predVideoIds.filter((id) => id !== v.id) : [...predVideoIds, v.id];
                                          updateStageSetting('predictive_modeling', 'video_ids', next);
                                        }}
                                      >{v.title || `Stitched — ${v.model || '?'}`}</button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <Button size="sm" className="h-7 font-mono text-[10px] uppercase tracking-wider" disabled={predRunning || stitchedVars.length === 0} onClick={handleRunPredInline}>
                                {predRunning ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Predicting...</> : <><BarChart2 className="h-3 w-3 mr-1.5" />Run Prediction</>}
                              </Button>
                              {predError && <span className="text-[10px] text-destructive">{predError}</span>}
                            </div>
                          </div>

                          {/* Benchmarks bar */}
                          {predBenchmarks.brand && (
                            <div className="rounded-lg border border-border p-4 bg-muted/20">
                              <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-3">Brand Benchmarks (from research)</div>
                              <div className="grid grid-cols-4 gap-4">
                                <div><div className="text-lg font-bold font-mono">{fmtNum(predBenchmarks.brand.followers)}</div><div className="text-[10px] text-muted-foreground">Followers</div></div>
                                <div><div className="text-lg font-bold font-mono">{fmtNum(predBenchmarks.brand.avg_views)}</div><div className="text-[10px] text-muted-foreground">Avg Views</div></div>
                                <div><div className="text-lg font-bold font-mono">{fmtNum(predBenchmarks.brand.avg_likes)}</div><div className="text-[10px] text-muted-foreground">Avg Likes</div></div>
                                <div><div className="text-lg font-bold font-mono">{predBenchmarks.brand.engagement_rate}%</div><div className="text-[10px] text-muted-foreground">Engagement</div></div>
                              </div>
                            </div>
                          )}

                          {/* Prediction cards per video */}
                          {predResults.length > 0 && (
                            <div className="space-y-4">
                              {predResults.map((pred) => {
                                const vidVar = stitchedVars.find((v) => v.id === pred.video_id);
                                const brandBench = predBenchmarks.brand;
                                const viewsVsBench = brandBench ? Math.round((pred.expected_views / (brandBench.avg_views || 1) - 1) * 100) : null;
                                const likesVsBench = brandBench ? Math.round((pred.expected_likes / (brandBench.avg_likes || 1) - 1) * 100) : null;
                                return (
                                  <div key={pred.video_id} className="rounded-lg border border-border overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
                                      <span className="font-mono text-[10px] font-semibold">{pred.video_title}</span>
                                      <div className="flex items-center gap-2">
                                        <FeedbackBar workflowId={workflowId} contentId={selectedContentPiece?.content_id} stageKey="predictive_modeling" itemType="prediction" itemId={pred.video_id} />
                                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[8px]">
                                          confidence {Math.round(pred.confidence * 100)}%
                                        </span>
                                      </div>
                                    </div>
                                    <div className="grid gap-4 p-4" style={{ gridTemplateColumns: vidVar?.preview ? '1fr 2fr' : '1fr' }}>
                                      {vidVar?.preview && (
                                        <div className="rounded-lg overflow-hidden bg-black">
                                          <video src={vidVar.preview} className="w-full h-full object-contain" controls playsInline style={{ maxHeight: '300px' }} />
                                        </div>
                                      )}
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                          <div className="rounded-lg border border-border p-3 text-center">
                                            <div className="text-lg font-bold font-mono">{fmtNum(pred.expected_views)}</div>
                                            <div className="text-[10px] text-muted-foreground">Expected Views</div>
                                            {viewsVsBench !== null && <div className={`text-[9px] font-mono ${viewsVsBench >= 0 ? 'text-green-500' : 'text-red-500'}`}>{viewsVsBench >= 0 ? '+' : ''}{viewsVsBench}% vs bench</div>}
                                          </div>
                                          <div className="rounded-lg border border-border p-3 text-center">
                                            <div className="text-lg font-bold font-mono">{fmtNum(pred.expected_likes)}</div>
                                            <div className="text-[10px] text-muted-foreground">Expected Likes</div>
                                            {likesVsBench !== null && <div className={`text-[9px] font-mono ${likesVsBench >= 0 ? 'text-green-500' : 'text-red-500'}`}>{likesVsBench >= 0 ? '+' : ''}{likesVsBench}% vs bench</div>}
                                          </div>
                                          <div className="rounded-lg border border-border p-3 text-center">
                                            <div className="text-lg font-bold font-mono">{fmtNum(pred.expected_comments)}</div>
                                            <div className="text-[10px] text-muted-foreground">Expected Comments</div>
                                          </div>
                                          <div className="rounded-lg border border-border p-3 text-center">
                                            <div className="text-lg font-bold font-mono">{pred.engagement_rate}%</div>
                                            <div className="text-[10px] text-muted-foreground">Engagement Rate</div>
                                          </div>
                                          <div className="rounded-lg border border-border p-3 text-center">
                                            <div className="text-lg font-bold font-mono">{brandBench?.followers ? (pred.expected_views / brandBench.followers * 100).toFixed(2) : '—'}%</div>
                                            <div className="text-[10px] text-muted-foreground">View / Follower</div>
                                          </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{pred.reasoning}</p>
                                        <div className="grid grid-cols-2 gap-4">
                                          {pred.strengths?.length > 0 && (
                                            <div>
                                              <div className="font-mono text-[8px] uppercase tracking-wider text-green-500 mb-1">Strengths</div>
                                              <ul className="space-y-1">
                                                {pred.strengths.map((s, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />{s}</li>)}
                                              </ul>
                                            </div>
                                          )}
                                          {pred.risks?.length > 0 && (
                                            <div>
                                              <div className="font-mono text-[8px] uppercase tracking-wider text-orange-500 mb-1">Risks</div>
                                              <ul className="space-y-1">
                                                {pred.risks.map((r, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5"><XCircle className="h-3 w-3 text-orange-500 mt-0.5 shrink-0" />{r}</li>)}
                                              </ul>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── Content Ranking ── */}
                    {stage.key === 'content_ranking' && (() => {
                      const vidNode = nodes.find((n) => n.stage_key === 'video_generation');
                      const allVars = (vidNode?.output_data?.variations || []) as Array<{ id: string; title?: string; preview?: string; type: string; model?: string }>;
                      const stitchedVars = allVars.filter((v) => v.preview && (v.type === 'stitched' || v.type === 'video'));
                      const fmtNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

                      const handleRunRankInline = async () => {
                        setRankRunning(true);
                        setRankError(null);
                        try {
                          const res = await runContentRanking(workflowId, 0.4, 0.6);
                          setRankResults(res.rankings);
                          loadWorkflow();
                        } catch (err) {
                          setRankError(err instanceof Error ? err.message : 'Ranking failed');
                        } finally {
                          setRankRunning(false);
                        }
                      };

                      return (
                        <div className="space-y-6">
                          {/* Controls */}
                          <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-4">
                            <div className="flex items-center gap-3">
                              <Button size="sm" className="h-7 font-mono text-[10px] uppercase tracking-wider" disabled={rankRunning || predResults.length === 0} onClick={handleRunRankInline}>
                                {rankRunning ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Ranking...</> : <><Layers className="h-3 w-3 mr-1.5" />Rank Content</>}
                              </Button>
                              {predResults.length === 0 && <span className="text-[10px] text-muted-foreground/60">Run Predictive Modeling first</span>}
                              {rankError && <span className="text-[10px] text-destructive">{rankError}</span>}
                            </div>
                          </div>

                          {/* Ranked results */}
                          {rankResults.length > 0 && (
                            <div className="space-y-4">
                              {rankResults.map((r) => {
                                const vidVar = stitchedVars.find((v) => v.id === r.video_id);
                                const isFirst = r.rank === 1;
                                return (
                                  <div key={r.video_id} className={`rounded-lg border overflow-hidden ${isFirst ? 'border-green-500/60 ring-1 ring-green-500/20' : 'border-border'}`}>
                                    <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isFirst ? 'bg-green-500/10 border-green-500/20' : 'bg-muted/30 border-border'}`}>
                                      <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-mono text-xs font-bold ${isFirst ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>{r.rank}</span>
                                        <span className="font-mono text-[10px] font-semibold">{r.video_title}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <FeedbackBar workflowId={workflowId} contentId={selectedContentPiece?.content_id} stageKey="content_ranking" itemType="ranking" itemId={r.video_id} />
                                        <CircleScore score={Math.round(r.composite_score)} size={40} />
                                      </div>
                                    </div>
                                    <div className="grid gap-4 p-4" style={{ gridTemplateColumns: vidVar?.preview ? 'auto 1fr' : '1fr' }}>
                                      {vidVar?.preview && (
                                        <div className="rounded-lg overflow-hidden bg-black w-32">
                                          <video src={vidVar.preview} className="w-full h-full object-contain" controls playsInline style={{ maxHeight: '180px' }} />
                                        </div>
                                      )}
                                      <div className="space-y-3">
                                        <div className="grid grid-cols-3 gap-3">
                                          <div className="rounded border border-border p-2 text-center">
                                            <div className="text-sm font-bold font-mono">{r.composite_score}</div>
                                            <div className="text-[9px] text-muted-foreground uppercase">Composite</div>
                                          </div>
                                          <div className="rounded border border-border p-2 text-center">
                                            <div className="text-sm font-bold font-mono">{r.simulation_score}</div>
                                            <div className="text-[9px] text-muted-foreground uppercase">Simulation</div>
                                          </div>
                                          <div className="rounded border border-border p-2 text-center">
                                            <div className="text-sm font-bold font-mono">{r.prediction_score}</div>
                                            <div className="text-[9px] text-muted-foreground uppercase">Prediction</div>
                                          </div>
                                        </div>
                                        <div className="flex gap-4 text-xs text-muted-foreground">
                                          <span><span className="font-mono font-medium text-foreground">{fmtNum(r.expected_views)}</span> views</span>
                                          <span><span className="font-mono font-medium text-foreground">{fmtNum(r.expected_likes)}</span> likes</span>
                                          <span><span className="font-mono font-medium text-foreground">{fmtNum(r.expected_comments)}</span> comments</span>
                                          <span><span className="font-mono font-medium text-foreground">{r.engagement_rate}%</span> eng.</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground/70 leading-relaxed">{r.reasoning}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── FDM Review ── */}
                    {stage.key === 'fdm_review' && (() => {
                      const checklist = (getSetting('fdm_review', 'checklist') as string[]) || [];
                      const notes = (getSetting('fdm_review', 'notes') as string) || '';
                      const items = ['Content quality approved', 'Compliance verified', 'Platform guidelines met', 'Copy reviewed', 'CTA effective'];
                      const done = items.filter((i) => checklist.includes(i)).length;
                      return (
                        <div className="space-y-4">
                          <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">Review Checklist</div>
                              <span className="font-mono text-[9px] text-muted-foreground">{done}/{items.length}</span>
                            </div>
                            <div className="space-y-1.5">
                              {items.map((item) => (
                                <label key={item} className={`flex items-center gap-2.5 text-xs cursor-pointer rounded px-2 py-1.5 transition-colors ${checklist.includes(item) ? 'bg-green-500/10' : 'hover:bg-muted/50'}`}>
                                  <input type="checkbox" className="rounded border-border" checked={checklist.includes(item)} onChange={() => toggleArrayItem('fdm_review', 'checklist', item)} />
                                  <span className={checklist.includes(item) ? 'line-through text-muted-foreground/50' : ''}>{item}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-1.5">Reviewer Notes</div>
                            <textarea placeholder="Add review notes..." rows={3} value={notes} onChange={(e) => updateStageSetting('fdm_review', 'notes', e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground resize-none" />
                          </div>
                          {done === items.length && (
                            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-xs font-medium text-green-600">All checks passed</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── Brand QA ── */}
                    {stage.key === 'brand_qa' && (() => {
                      const checklist = (getSetting('brand_qa', 'checklist') as string[]) || [];
                      const notes = (getSetting('brand_qa', 'notes') as string) || '';
                      const items = ['Brand colors correct', 'Logo placement verified', 'Tone matches guidelines', 'No trademark issues', 'Safe for all audiences'];
                      const done = items.filter((i) => checklist.includes(i)).length;
                      return (
                        <div className="space-y-4">
                          <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">QA Checklist</div>
                              <span className="font-mono text-[9px] text-muted-foreground">{done}/{items.length}</span>
                            </div>
                            <div className="space-y-1.5">
                              {items.map((item) => (
                                <label key={item} className={`flex items-center gap-2.5 text-xs cursor-pointer rounded px-2 py-1.5 transition-colors ${checklist.includes(item) ? 'bg-green-500/10' : 'hover:bg-muted/50'}`}>
                                  <input type="checkbox" className="rounded border-border" checked={checklist.includes(item)} onChange={() => toggleArrayItem('brand_qa', 'checklist', item)} />
                                  <span className={checklist.includes(item) ? 'line-through text-muted-foreground/50' : ''}>{item}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-1.5">QA Notes</div>
                            <textarea placeholder="Add QA notes..." rows={3} value={notes} onChange={(e) => updateStageSetting('brand_qa', 'notes', e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground resize-none" />
                          </div>
                          {done === items.length && (
                            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-xs font-medium text-green-600">All checks passed</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    </div>

                    <div className="mt-4 border-b border-border" />
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
              onClickStage={handleToggleStage}
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
                <GraphComponent nodes={nodes} currentStageKey={workflow?.current_stage} onNodeClick={(node) => setOpenStageKey(node.stage_key)} />
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
            <div className={`bg-background border border-border rounded-xl shadow-xl w-full mx-4 overflow-y-auto ${openStageKey === 'storyboard' || openStageKey === 'video_generation' || openStageKey === 'research' ? 'max-w-[98vw] max-h-[90vh]' : 'max-w-lg max-h-[80vh]'}`} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground/50">{String(stageIndex + 1).padStart(2, '0')}</span>
                  <h3 className="text-sm font-semibold">{stageDef.label}</h3>
                  {stageDef.stageType === 'human' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-muted-foreground">
                      <UserIcon className="h-2 w-2" /> FDM
                    </span>
                  )}
                  {stageDef.stageType === 'agent' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-muted-foreground">
                      <Bot className="h-2 w-2" /> Agent
                    </span>
                  )}
                  {stageDef.stageType === 'both' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-muted-foreground">
                      <UserIcon className="h-2 w-2" /> FDM <span className="text-muted-foreground/30">+</span> <Bot className="h-2 w-2" /> Agent
                    </span>
                  )}
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

                {/* ── Brand ── */}
                {openStageKey === 'brand' && (() => {
                  const saveBrandField = async (field: string, value: unknown) => {
                    if (!brand) return;
                    try {
                      const updated = await updateBrand(brand._id, { [field]: value } as Partial<typeof brand>);
                      setBrand(updated);
                    } catch (err) { console.error('Failed to save brand:', err); }
                  };
                  const socialUrls = brand?.social_urls || {};
                  const SOCIAL_PLATFORMS = [
                    { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
                    { id: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
                    { id: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
                    { id: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
                    { id: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/...' },
                    { id: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/...' },
                  ];
                  return brand ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        {brand.logo_url ? (
                          <img src={brand.logo_url} alt={brand.name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <span className="text-lg font-bold text-muted-foreground">{brand.name.charAt(0)}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold truncate">{brand.name}</h3>
                            {brand.industry && <span className="inline-flex rounded-full border border-border px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-muted-foreground">{brand.industry}</span>}
                          </div>
                          {brand.product_name && <p className="text-[11px] text-muted-foreground">{brand.product_name}</p>}
                          {brand.description && <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{brand.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[8px] uppercase text-muted-foreground/50 w-20 shrink-0 flex items-center gap-1"><Globe className="h-2.5 w-2.5" /> Website</span>
                        <input type="url" defaultValue={brand.url || ''} placeholder="https://example.com"
                          onBlur={(e) => { if (e.target.value !== (brand.url || '')) saveBrandField('url', e.target.value || null); }}
                          className="flex-1 h-7 rounded border border-border bg-background px-2 text-xs text-foreground" />
                        {brand.url && (
                          <a href={brand.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-foreground transition-colors shrink-0">
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                      {SOCIAL_PLATFORMS.map((sp) => (
                        <div key={sp.id} className="flex items-center gap-1.5">
                          <span className="font-mono text-[8px] uppercase text-muted-foreground/50 w-20 shrink-0 flex items-center gap-1">
                            <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                            {sp.label}
                          </span>
                          <input type="url" defaultValue={socialUrls[sp.id] || ''} placeholder={sp.placeholder}
                            onBlur={(e) => {
                              const newUrls = { ...socialUrls, [sp.id]: e.target.value || undefined };
                              Object.keys(newUrls).forEach((k) => { if (!newUrls[k]) delete newUrls[k]; });
                              saveBrandField('social_urls', newUrls);
                            }}
                            className="flex-1 h-7 rounded border border-border bg-background px-2 text-[10px] text-foreground" />
                          {socialUrls[sp.id] && (
                            <a href={socialUrls[sp.id]} target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-foreground transition-colors shrink-0">
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">No brand selected</p>
                  );
                })()}

                {/* ── Campaign & Strategy ── */}
                {openStageKey === 'campaign_strategy' && (
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

                      {/* Campaign details */}
                      {(() => {
                        const camp = campaigns.find((c) => c._id === selectedCampaignId);
                        if (!camp) return null;
                        return (
                          <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                            {camp.description && (
                              <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{camp.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {camp.platform && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] uppercase text-muted-foreground/60">{camp.platform}</span>
                              )}
                              {camp.campaign_goal && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] uppercase text-muted-foreground/60">{camp.campaign_goal}</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
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

                      {/* Strategy details */}
                      {(() => {
                        const strat = strategies.find((s) => s._id === selectedStrategy);
                        if (!strat) return null;
                        return (
                          <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {strat.budget_amount != null && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground/60">
                                  ${strat.budget_amount.toLocaleString()}{strat.budget_type ? `/${strat.budget_type}` : ''}
                                </span>
                              )}
                              {strat.performance_objective?.kpi && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] uppercase text-muted-foreground/60">
                                  {strat.performance_objective.kpi}{strat.performance_objective.value != null ? `: ${strat.performance_objective.value}` : ''}
                                </span>
                              )}
                            </div>
                            {strat.audience_control?.location && strat.audience_control.location.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-[8px] text-muted-foreground/40">Locations:</span>
                                {strat.audience_control.location.map((l) => (
                                  <span key={l} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground/60">{l}</span>
                                ))}
                              </div>
                            )}
                            {strat.audience_control?.in_market_interests && strat.audience_control.in_market_interests.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-[8px] text-muted-foreground/40">Interests:</span>
                                {strat.audience_control.in_market_interests.map((i) => (
                                  <span key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground/60">{i}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Assets — brands-style list */}
                    <div>
                      {renderAssetList()}
                    </div>
                  </>
                )}

                {/* ── Scheduling ── */}
                {openStageKey === 'scheduling' && (() => {
                  const contentEntries = (getSetting('scheduling', 'content_entries') as ContentEntry[] | undefined) || [];
                  let calendarItems = (getSetting('scheduling', 'content_items') as ContentItem[] | undefined) || [];
                  if (calendarItems.length === 0 && contentEntries.length > 0) {
                    calendarItems = migrateEntriesToItems(contentEntries);
                    updateStageSetting('scheduling', 'content_items', calendarItems);
                  }
                  const addPlatform = (getSetting('scheduling', 'add_platform') as string) || '';
                  const addContentType = (getSetting('scheduling', 'add_content_type') as string) || '';
                  const addFrequency = (getSetting('scheduling', 'add_frequency') as string) || '';
                  const addDays = (getSetting('scheduling', 'add_days') as number[] | undefined) || [];
                  const addStartDate = (getSetting('scheduling', 'add_start_date') as string) || '';
                  const addEndDate = (getSetting('scheduling', 'add_end_date') as string) || '';
                  const addPostTime = (getSetting('scheduling', 'add_post_time') as string) || '';
                  const addTimezone = (getSetting('scheduling', 'add_timezone') as string) || '';
                  const toggleAddDay = (dayId: number) => {
                    const next = addDays.includes(dayId) ? addDays.filter((d) => d !== dayId) : [...addDays, dayId].sort();
                    updateStageSetting('scheduling', 'add_days', next.length > 0 ? next : []);
                  };
                  const addEntry = () => {
                    if (!addPlatform || !addContentType) return;
                    const newRule: ContentEntry = {
                      id: crypto.randomUUID(),
                      platform: addPlatform, content_type: addContentType,
                      frequency: addFrequency || undefined, days: addDays.length > 0 ? addDays : undefined,
                      start_date: addStartDate || undefined,
                      end_date: addEndDate || undefined, post_time: addPostTime || undefined,
                      timezone: addTimezone || undefined,
                    };
                    updateStageSetting('scheduling', 'content_entries', [...contentEntries, newRule]);
                    const newItems = materializeItems(newRule);
                    updateStageSetting('scheduling', 'content_items', [...calendarItems, ...newItems]);
                    updateStageSetting('scheduling', 'add_platform', '');
                    updateStageSetting('scheduling', 'add_content_type', '');
                    updateStageSetting('scheduling', 'add_frequency', '');
                    updateStageSetting('scheduling', 'add_days', []);
                    updateStageSetting('scheduling', 'add_start_date', '');
                    updateStageSetting('scheduling', 'add_end_date', '');
                    updateStageSetting('scheduling', 'add_post_time', '');
                    updateStageSetting('scheduling', 'add_timezone', '');
                  };
                  const removeEntry = (idx: number) => {
                    updateStageSetting('scheduling', 'content_entries', contentEntries.filter((_, i) => i !== idx));
                    if (editingContentIdx === idx) setEditingContentIdx(null);
                  };
                  const updateEntry = (idx: number, field: keyof ContentEntry, value: string | number[] | undefined) => {
                    const next = contentEntries.map((e, i) => i === idx ? { ...e, [field]: value || undefined } : e);
                    if (field === 'platform') {
                      next[idx] = { ...next[idx], content_type: '' };
                    }
                    updateStageSetting('scheduling', 'content_entries', next);
                  };
                  const toggleEntryDay = (idx: number, dayId: number) => {
                    const current = contentEntries[idx].days || [];
                    const next = current.includes(dayId) ? current.filter((d) => d !== dayId) : [...current, dayId].sort();
                    updateEntry(idx, 'days', next.length > 0 ? next : undefined);
                  };
                  const showDayPicker = (freq?: string) => freq && freq !== 'once';
                  const formatDate = (d?: string) => { if (!d) return ''; try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; } };
                  const deleteContentItem = (itemId: string) => {
                    updateStageSetting('scheduling', 'content_items', calendarItems.filter((i) => i.content_id !== itemId));
                    if (selectedContentPiece?.content_id === itemId) setSelectedContentPiece(null);
                  };
                  const moveContentItem = (itemId: string, newDate: string) => {
                    updateStageSetting('scheduling', 'content_items', calendarItems.map((i) => i.content_id === itemId ? { ...i, date: newDate } : i));
                    if (selectedContentPiece?.content_id === itemId) setSelectedContentPiece({ ...selectedContentPiece, date: newDate });
                  };
                  const updateContentItem = (itemId: string, field: keyof ContentItem, value: string | undefined) => {
                    updateStageSetting('scheduling', 'content_items', calendarItems.map((i) => i.content_id === itemId ? { ...i, [field]: value } : i));
                    if (selectedContentPiece?.content_id === itemId) setSelectedContentPiece({ ...selectedContentPiece, [field]: value });
                  };
                  return (
                  <div className="space-y-4">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><Globe className="h-3 w-3" /> Content</div>

                      {contentEntries.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {contentEntries.map((entry, idx) => {
                            const isEditing = editingContentIdx === idx;
                            return (
                            <div key={idx} className={`rounded-lg border bg-muted/20 px-3 py-2.5 space-y-2 ${isEditing ? 'border-foreground/40' : 'border-border'}`}>
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-foreground px-2 py-0.5 font-mono text-[9px] uppercase text-background">{getPlatformLabel(entry.platform)}</span>
                                <span className="text-xs font-semibold">{getContentTypeLabel(entry.platform, entry.content_type)}</span>
                                <div className="ml-auto flex items-center gap-1">
                                  <button onClick={() => setEditingContentIdx(isEditing ? null : idx)} className={`transition-colors ${isEditing ? 'text-foreground' : 'text-muted-foreground/30 hover:text-foreground'}`}><Pencil className="h-3 w-3" /></button>
                                  <button onClick={() => removeEntry(idx)} className="text-muted-foreground/30 hover:text-destructive transition-colors"><X className="h-3.5 w-3.5" /></button>
                                </div>
                              </div>

                              {isEditing ? (
                                <div className="space-y-2 pt-1">
                                  <div className="flex flex-wrap items-end gap-2">
                                    <div>
                                      <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Platform</div>
                                      <Select value={entry.platform || undefined} onValueChange={(v) => updateEntry(idx, 'platform', v)}>
                                        <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
                                        <SelectContent>{PLATFORM_OPTIONS.map((p) => (<SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>))}</SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Type</div>
                                      <Select value={entry.content_type || undefined} onValueChange={(v) => updateEntry(idx, 'content_type', v)} disabled={!entry.platform}>
                                        <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                                        <SelectContent>{(CONTENT_TYPE_OPTIONS[entry.platform] || []).map((t) => (<SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>))}</SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Frequency</div>
                                      <Select value={entry.frequency || undefined} onValueChange={(v) => updateEntry(idx, 'frequency', v)}>
                                        <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue placeholder="Freq" /></SelectTrigger>
                                        <SelectContent><SelectItem value="once">Once</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="3x_week">3x / week</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  {showDayPicker(entry.frequency) && (
                                    <div>
                                      <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Days</div>
                                      <div className="flex gap-1">
                                        {DAY_LABELS.map((d) => {
                                          const selected = (entry.days || []).includes(d.id);
                                          return (
                                            <button key={d.id} type="button" onClick={() => toggleEntryDay(idx, d.id)}
                                              className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-medium transition-colors ${selected ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:border-foreground/40'}`}
                                              title={d.label}
                                            >{d.short}</button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap items-end gap-2">
                                    <div>
                                      <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Start</div>
                                      <input type="date" value={entry.start_date || ''} onChange={(e) => updateEntry(idx, 'start_date', e.target.value)} className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground" />
                                    </div>
                                    <div>
                                      <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">End</div>
                                      <input type="date" value={entry.end_date || ''} onChange={(e) => updateEntry(idx, 'end_date', e.target.value)} className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground" />
                                    </div>
                                    <div>
                                      <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Time</div>
                                      <Select value={entry.post_time || undefined} onValueChange={(v) => updateEntry(idx, 'post_time', v)}>
                                        <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue placeholder="Time" /></SelectTrigger>
                                        <SelectContent className="max-h-[240px]">
                                          {['AM', 'PM'].flatMap((p) => [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].flatMap((h) => ['00', '15', '30', '45'].map((m) => {
                                            const val = `${h}:${m} ${p}`;
                                            return <SelectItem key={val} value={val}>{val}</SelectItem>;
                                          })))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Timezone</div>
                                      <Select value={entry.timezone || undefined} onValueChange={(v) => updateEntry(idx, 'timezone', v)}>
                                        <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="TZ" /></SelectTrigger>
                                        <SelectContent>{Object.entries(TIMEZONE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <button onClick={() => setEditingContentIdx(null)} className="text-xs font-medium text-foreground hover:underline mt-1">Done</button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 cursor-pointer" onClick={() => setEditingContentIdx(idx)}>
                                  {entry.frequency && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="font-mono text-[8px] uppercase text-muted-foreground/50">Freq</span> {FREQUENCY_LABELS[entry.frequency] || entry.frequency}</span>}
                                  {entry.days && entry.days.length > 0 && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="font-mono text-[8px] uppercase text-muted-foreground/50">Days</span> {entry.days.map((d) => DAY_LABELS[d]?.label).join(', ')}</span>}
                                  {entry.start_date && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="font-mono text-[8px] uppercase text-muted-foreground/50">Start</span> {formatDate(entry.start_date)}</span>}
                                  {entry.end_date && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="font-mono text-[8px] uppercase text-muted-foreground/50">End</span> {formatDate(entry.end_date)}</span>}
                                  {entry.post_time && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="font-mono text-[8px] uppercase text-muted-foreground/50">Time</span> {entry.post_time}</span>}
                                  {entry.timezone && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="font-mono text-[8px] uppercase text-muted-foreground/50">TZ</span> {TIMEZONE_LABELS[entry.timezone] || entry.timezone}</span>}
                                  {!entry.frequency && !entry.start_date && !entry.post_time && <span className="text-[10px] text-muted-foreground/40">Click to edit schedule</span>}
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">Add Content</div>
                        <div className="flex flex-wrap items-end gap-2">
                          <div>
                            <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Platform</div>
                            <Select value={addPlatform || undefined} onValueChange={(v) => { updateStageSetting('scheduling', 'add_platform', v); updateStageSetting('scheduling', 'add_content_type', ''); }}>
                              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
                              <SelectContent>{PLATFORM_OPTIONS.map((p) => (<SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>))}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Type</div>
                            <Select value={addContentType || undefined} onValueChange={(v) => updateStageSetting('scheduling', 'add_content_type', v)} disabled={!addPlatform}>
                              <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                              <SelectContent>{(CONTENT_TYPE_OPTIONS[addPlatform] || []).map((t) => (<SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>))}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Frequency</div>
                            <Select value={addFrequency || undefined} onValueChange={(v) => updateStageSetting('scheduling', 'add_frequency', v)}>
                              <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue placeholder="Freq" /></SelectTrigger>
                              <SelectContent><SelectItem value="once">Once</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="3x_week">3x / week</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
                            </Select>
                          </div>
                        </div>
                        {showDayPicker(addFrequency) && (
                          <div>
                            <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Days</div>
                            <div className="flex gap-1">
                              {DAY_LABELS.map((d) => {
                                const selected = addDays.includes(d.id);
                                return (
                                  <button key={d.id} type="button" onClick={() => toggleAddDay(d.id)}
                                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-medium transition-colors ${selected ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:border-foreground/40'}`}
                                    title={d.label}
                                  >{d.short}</button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap items-end gap-2">
                          <div>
                            <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Start</div>
                            <input type="date" value={addStartDate} onChange={(e) => updateStageSetting('scheduling', 'add_start_date', e.target.value)} className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground" />
                          </div>
                          <div>
                            <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">End</div>
                            <input type="date" value={addEndDate} onChange={(e) => updateStageSetting('scheduling', 'add_end_date', e.target.value)} className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground" />
                          </div>
                          <div>
                            <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Time</div>
                            <Select value={addPostTime || undefined} onValueChange={(v) => updateStageSetting('scheduling', 'add_post_time', v)}>
                              <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue placeholder="Time" /></SelectTrigger>
                              <SelectContent className="max-h-[240px]">
                                {['AM', 'PM'].flatMap((p) => [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].flatMap((h) => ['00', '15', '30', '45'].map((m) => {
                                  const val = `${h}:${m} ${p}`;
                                  return <SelectItem key={val} value={val}>{val}</SelectItem>;
                                })))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <div className="font-mono text-[8px] uppercase text-muted-foreground/40 mb-1">Timezone</div>
                            <Select value={addTimezone || undefined} onValueChange={(v) => updateStageSetting('scheduling', 'add_timezone', v)}>
                              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="TZ" /></SelectTrigger>
                              <SelectContent>{Object.entries(TIMEZONE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
                            </Select>
                          </div>
                          <button onClick={addEntry} disabled={!addPlatform || !addContentType} className="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-30 transition-colors">
                            <Plus className="h-3.5 w-3.5" /> Add
                          </button>
                        </div>
                      </div>

                      {/* ── Calendar View ── */}
                      {calendarItems.length > 0 && (() => {
                        const yr = calendarMonth.getFullYear();
                        const mo = calendarMonth.getMonth();
                        const daysInMonth = new Date(yr, mo + 1, 0).getDate();
                        const firstDayOfWeek = new Date(yr, mo, 1).getDay();
                        const itemsByDate = getContentItemsByDate(calendarItems, yr, mo);
                        const today = new Date();
                        const isToday = (d: number) => today.getFullYear() === yr && today.getMonth() === mo && today.getDate() === d;
                        const weeks: (number | null)[][] = [];
                        let week: (number | null)[] = Array(firstDayOfWeek).fill(null);
                        for (let d = 1; d <= daysInMonth; d++) {
                          week.push(d);
                          if (week.length === 7) { weeks.push(week); week = []; }
                        }
                        if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }
                        return (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <CalendarClock className="h-3 w-3" /> Calendar
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => setCalendarMonth(new Date(yr, mo - 1, 1))} className="rounded p-0.5 hover:bg-muted transition-colors"><ChevronLeft className="h-3 w-3 text-muted-foreground" /></button>
                                <span className="text-[10px] font-medium min-w-[100px] text-center">
                                  {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </span>
                                <button onClick={() => setCalendarMonth(new Date(yr, mo + 1, 1))} className="rounded p-0.5 hover:bg-muted transition-colors"><ChevronRight className="h-3 w-3 text-muted-foreground" /></button>
                              </div>
                            </div>
                            <div className="rounded-lg border border-border overflow-hidden">
                              <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                  <div key={i} className="px-0.5 py-1 text-center font-mono text-[7px] uppercase tracking-wider text-muted-foreground/60">{d}</div>
                                ))}
                              </div>
                              {weeks.map((w, wi) => (
                                <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
                                  {w.map((day, di) => {
                                    const dayItems = day ? itemsByDate.get(day) || [] : [];
                                    const dateStr = day ? `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                                    return (
                                      <div
                                        key={di}
                                        onDragOver={day ? (ev) => { ev.preventDefault(); ev.currentTarget.classList.add('ring-2', 'ring-inset', 'ring-foreground/40'); } : undefined}
                                        onDragLeave={day ? (ev) => { ev.currentTarget.classList.remove('ring-2', 'ring-inset', 'ring-foreground/40'); } : undefined}
                                        onDrop={day ? (ev) => { ev.preventDefault(); ev.currentTarget.classList.remove('ring-2', 'ring-inset', 'ring-foreground/40'); const id = ev.dataTransfer.getData('text/plain'); if (id) moveContentItem(id, dateStr); } : undefined}
                                        className={`min-h-[40px] px-0.5 py-0.5 border-r border-border last:border-r-0 ${day ? 'bg-background' : 'bg-muted/10'} ${isToday(day || 0) ? 'ring-1 ring-inset ring-foreground/20' : ''}`}
                                      >
                                        {day && (
                                          <>
                                            <div className={`text-[8px] ${isToday(day) ? 'font-bold text-foreground' : 'text-muted-foreground/60'}`}>{day}</div>
                                            <div className="flex flex-col gap-px">
                                              {dayItems.slice(0, 2).map((item) => {
                                                const isSelected = selectedContentPiece?.content_id === item.content_id;
                                                return (
                                                <div
                                                  key={item.content_id}
                                                  draggable
                                                  onDragStart={(ev) => { ev.dataTransfer.setData('text/plain', item.content_id); ev.dataTransfer.effectAllowed = 'move'; }}
                                                  onClick={() => setSelectedContentPiece(item)}
                                                  className={`group/item rounded px-0.5 cursor-pointer hover:ring-1 hover:ring-foreground/30 transition-all ${isSelected ? 'ring-2 ring-foreground' : ''} ${CONTENT_TYPE_COLORS[item.content_type] || 'bg-muted-foreground'} bg-opacity-15 flex items-center gap-0.5`}
                                                >
                                                  <span className={`text-[6px] leading-tight truncate flex-1 ${CONTENT_TYPE_COLORS_TEXT[item.content_type] || 'text-muted-foreground'}`}>
                                                    {getShortPlatformLabel(item.platform)} {getContentTypeLabel(item.platform, item.content_type)}
                                                  </span>
                                                  <button
                                                    onClick={(ev) => { ev.stopPropagation(); deleteContentItem(item.content_id); }}
                                                    className="opacity-0 group-hover/item:opacity-100 text-muted-foreground/50 hover:text-destructive shrink-0"
                                                  >
                                                    <X className="h-2 w-2" />
                                                  </button>
                                                </div>
                                                );
                                              })}
                                              {dayItems.length > 2 && <span className="text-[6px] text-muted-foreground/50">+{dayItems.length - 2}</span>}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {(() => {
                                const seen = new Set<string>();
                                return calendarItems.map((e) => {
                                  const key = `${e.platform}_${e.content_type}`;
                                  if (seen.has(key)) return null;
                                  seen.add(key);
                                  return (
                                    <div key={key} className="flex items-center gap-1">
                                      <div className={`h-1.5 w-1.5 rounded-sm ${CONTENT_TYPE_COLORS[e.content_type] || 'bg-muted-foreground'}`} />
                                      <span className="text-[8px] text-muted-foreground">{getPlatformLabel(e.platform)} {getContentTypeLabel(e.platform, e.content_type)}</span>
                                    </div>
                                  );
                                });
                              })()}
                            </div>

                            {/* Selected content piece header */}
                            {selectedContentPiece && (
                              <div className="mt-3 rounded-lg border-2 border-foreground/20 bg-muted/30 p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-bold">
                                        {new Date(selectedContentPiece.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                        {selectedContentPiece.post_time && ` · ${selectedContentPiece.post_time}`}
                                      </div>
                                      <input
                                        type="date"
                                        value={selectedContentPiece.date}
                                        onChange={(ev) => moveContentItem(selectedContentPiece.content_id, ev.target.value)}
                                        className="h-6 rounded border border-border bg-background px-1.5 text-[10px] text-foreground"
                                        title="Move to date"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs font-semibold">
                                        {getPlatformLabel(selectedContentPiece.platform)} {getContentTypeLabel(selectedContentPiece.platform, selectedContentPiece.content_type)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 ml-2">
                                    <button onClick={() => deleteContentItem(selectedContentPiece.content_id)} className="text-muted-foreground hover:text-destructive" title="Delete item">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => setSelectedContentPiece(null)} className="text-muted-foreground hover:text-foreground">
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  );
                })()}

                {/* ── Research ── */}
                {openStageKey === 'research' && (
                  <ResearchStagePanel
                    workflowId={workflowId}
                    getSetting={getSetting}
                    updateStageSetting={updateStageSetting}
                  />
                )}

                {/* ── Concepts ── */}
                {openStageKey === 'concepts' && (() => {
                  if (!selectedContentPiece) {
                    return <div className="text-center py-8 text-muted-foreground/50"><CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Select a content piece from the calendar to generate concepts</p></div>;
                  }
                  const conceptRows = (getSetting('concepts', 'concept_allocations') as Array<{ num: string; tone: string; model?: string }>) || [{ num: '3', tone: '', model: '' }];
                  const totalConcepts = conceptRows.reduce((sum, r) => sum + (parseInt(r.num) || 0), 0);
                  const pieceConcepts = ((getPieceSetting('concepts', 'generated_concepts') as GeneratedConcept[]) || []) as GeneratedConcept[];

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
                    updatePieceSetting('concepts', 'generated_concepts', pieceConcepts.filter((_, i) => i !== idx));
                    if (editingConceptIdx === idx) setEditingConceptIdx(null);
                  };
                  const updateGeneratedConcept = (idx: number, field: string, value: unknown) => {
                    updatePieceSetting('concepts', 'generated_concepts', pieceConcepts.map((c, i) => i === idx ? { ...c, [field]: value } : c));
                  };

                  const handleGenerate = async (idx: number) => {
                    const row = conceptRows[idx];
                    if (!selectedContentPiece) return;
                    const num = parseInt(row.num) || 3;
                    const tone = row.tone || 'engaging';
                    setGeneratingRows((prev) => new Set(prev).add(idx));
                    try {
                      const result = await generateConcepts(workflowId, num, tone, selectedContentPiece.content_type);
                      const taggedConcepts = result.concepts.map((c: Record<string, unknown>) => ({ ...c, tone: row.tone, content_type: selectedContentPiece.content_type }));
                      const existing = pieceConcepts;
                      updatePieceSetting('concepts', 'generated_concepts', [...existing, ...taggedConcepts]);
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
                              disabled={generatingRows.has(idx)}
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

                    {/* Generated concepts (scoped to selected piece) */}
                    {pieceConcepts.length > 0 && (
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Generated Concepts ({pieceConcepts.length})</div>
                        <div className="space-y-2">
                          {pieceConcepts.map((concept, idx) => {
                            const ct = (concept as Record<string, unknown>).content_type as string | undefined;
                            const isEditing = editingConceptIdx === idx;
                            return (
                            <div key={idx} className="relative group/card rounded border border-border p-3 space-y-2">
                              <div className="absolute top-2 right-2 flex items-center gap-1">
                                <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-foreground/70">{(concept as Record<string, unknown>).tone as string || 'general'}</span>
                                {ct && <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-foreground/70">{ct}</span>}
                                <button onClick={() => setEditingConceptIdx(isEditing ? null : idx)} className="opacity-0 group-hover/card:opacity-100 rounded p-1 text-muted-foreground hover:text-foreground transition-all"><Pencil className="h-3 w-3" /></button>
                                <button onClick={() => deleteGeneratedConcept(idx)} className="opacity-0 group-hover/card:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive transition-all"><Trash2 className="h-3 w-3" /></button>
                              </div>
                              <h4 className="text-xs font-semibold pr-28">{concept.title}</h4>
                              {/* Simplified type-aware rendering for steps tab */}
                              {ct === 'reel' && (() => { const rc = concept as ReelConcept; return (<>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Hook</div>{isEditing ? <textarea value={rc.hook} onChange={(e) => updateGeneratedConcept(idx, 'hook', e.target.value)} rows={2} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /> : <p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{rc.hook}</p>}</div>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Script</div>{isEditing ? <textarea value={typeof rc.script === 'string' ? rc.script : rc.script.join('\n')} onChange={(e) => updateGeneratedConcept(idx, 'script', e.target.value.split('\n'))} rows={4} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /> : Array.isArray(rc.script) ? <ul className="space-y-0.5">{rc.script.map((l, li) => <li key={li} className="text-[10px] text-muted-foreground flex items-start gap-1.5"><span className="text-muted-foreground/40 shrink-0">&#x2022;</span><span>{l}</span></li>)}</ul> : <p className="text-[10px] text-muted-foreground">{rc.script}</p>}</div>
                                {(rc.audio_cues || isEditing) && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Audio Cues</div>{isEditing ? <input value={rc.audio_cues || ''} onChange={(e) => updateGeneratedConcept(idx, 'audio_cues', e.target.value)} className="w-full h-7 rounded border border-border bg-background px-2 text-xs text-foreground" /> : <p className="text-[10px] text-muted-foreground">{rc.audio_cues}</p>}</div>}
                                {(rc.duration || isEditing) && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Duration</div>{isEditing ? <input value={rc.duration || ''} onChange={(e) => updateGeneratedConcept(idx, 'duration', e.target.value)} className="w-full h-7 rounded border border-border bg-background px-2 text-xs text-foreground" /> : <p className="text-[10px] text-muted-foreground">{rc.duration}</p>}</div>}
                              </>); })()}
                              {ct === 'carousel' && (() => { const cc = concept as CarouselConcept; return (<>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Slides ({(cc.slides || []).length})</div>{(cc.slides || []).map((s, si) => <div key={si} className="border-l-2 border-border pl-2 py-1 space-y-0.5"><div className="font-mono text-[8px] uppercase text-muted-foreground/40">Slide {si + 1}</div><p className="text-[10px] text-muted-foreground"><span className="font-medium">Image:</span> {s.image_description}</p><p className="text-[10px] text-muted-foreground"><span className="font-medium">Caption:</span> {s.caption}</p></div>)}</div>
                                {cc.messaging && cc.messaging.length > 0 && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Key Messaging</div><ul className="space-y-0.5">{cc.messaging.map((m, mi) => <li key={mi} className="text-[10px] text-muted-foreground flex items-start gap-1.5"><span className="text-muted-foreground/40">&#x2022;</span><span>{m}</span></li>)}</ul></div>}
                              </>); })()}
                              {ct === 'post' && (() => { const pc = concept as PostConcept; return (<>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Image Description</div>{isEditing ? <textarea value={pc.image_description} onChange={(e) => updateGeneratedConcept(idx, 'image_description', e.target.value)} rows={3} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /> : <p className="text-[10px] text-muted-foreground">{pc.image_description}</p>}</div>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Caption</div>{isEditing ? <textarea value={pc.caption} onChange={(e) => updateGeneratedConcept(idx, 'caption', e.target.value)} rows={3} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /> : <p className="text-[10px] text-muted-foreground">{pc.caption}</p>}</div>
                              </>); })()}
                              {ct === 'story' && (() => { const sc = concept as StoryConcept; return (<>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Frame Description</div>{isEditing ? <textarea value={sc.frame_description} onChange={(e) => updateGeneratedConcept(idx, 'frame_description', e.target.value)} rows={3} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /> : <p className="text-[10px] text-muted-foreground">{sc.frame_description}</p>}</div>
                                <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Caption</div>{isEditing ? <textarea value={sc.caption} onChange={(e) => updateGeneratedConcept(idx, 'caption', e.target.value)} rows={2} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /> : <p className="text-[10px] text-muted-foreground">{sc.caption}</p>}</div>
                                {(sc.cta || isEditing) && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">CTA</div>{isEditing ? <input value={sc.cta || ''} onChange={(e) => updateGeneratedConcept(idx, 'cta', e.target.value)} className="w-full h-7 rounded border border-border bg-background px-2 text-xs text-foreground" /> : <p className="text-[10px] text-muted-foreground font-medium">{sc.cta}</p>}</div>}
                              </>); })()}
                              {/* Fallback for legacy concepts */}
                              {(!ct || !['reel', 'carousel', 'post', 'story'].includes(ct)) && (() => { const fc = concept as { hook?: string; script?: string | string[]; messaging?: string[] }; return (<>
                                {fc.hook && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Hook</div>{isEditing ? <textarea value={fc.hook} onChange={(e) => updateGeneratedConcept(idx, 'hook', e.target.value)} rows={2} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground resize-none" /> : <p className="text-[10px] text-muted-foreground">{fc.hook}</p>}</div>}
                                {fc.script && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Script</div>{typeof fc.script === 'string' ? <p className="text-[10px] text-muted-foreground">{fc.script}</p> : <ul className="space-y-0.5">{fc.script.map((l, li) => <li key={li} className="text-[10px] text-muted-foreground flex items-start gap-1.5"><span className="text-muted-foreground/40">&#x2022;</span><span>{l}</span></li>)}</ul>}</div>}
                                {fc.messaging && fc.messaging.length > 0 && <div><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Key Messaging</div><ul className="space-y-0.5">{fc.messaging.map((m, mi) => <li key={mi} className="text-[10px] text-muted-foreground flex items-start gap-1.5"><span className="text-muted-foreground/40">&#x2022;</span><span>{m}</span></li>)}</ul></div>}
                              </>); })()}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                  );
                })()}

                {/* ── Image Generation (optional, between Concepts & Storyboard) ── */}
                {openStageKey === 'image_generation' && (() => {
                  if (!selectedContentPiece) {
                    return <div className="text-center py-8 text-muted-foreground/50"><CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Select a content piece from the calendar first</p></div>;
                  }
                  const pieceConcepts = ((getPieceSetting('concepts', 'generated_concepts') as GeneratedConcept[]) || []) as GeneratedConcept[];
                  type ImgGenRow = { conceptIdx: number; llm: string; imageModel: string };
                  const rows = (getSetting('image_generation', 'rows') as ImgGenRow[]) || [{ conceptIdx: 0, llm: 'gemini-pro-3', imageModel: 'google/nano-banana' }];

                  const updateRows = (next: ImgGenRow[]) => updateStageSetting('image_generation', 'rows', next);
                  const updateImgRow = (idx: number, field: keyof ImgGenRow, value: string | number) => {
                    const next = rows.map((r, i) => i === idx ? { ...r, [field]: value } : r);
                    updateRows(next);
                  };
                  const addImgRow = () => updateRows([...rows, { conceptIdx: 0, llm: 'gemini-pro-3', imageModel: 'google/nano-banana' }]);
                  const removeImgRow = (idx: number) => updateRows(rows.filter((_, i) => i !== idx));

                  const handleGenerateImage = async (row: ImgGenRow, idx: number) => {
                    if (!row.imageModel || pieceConcepts.length === 0) return;
                    setImgGenLoading(prev => new Set(prev).add(idx));
                    try {
                      const { task_id } = await generateConceptImage(
                        workflowId,
                        row.conceptIdx,
                        row.imageModel,
                        undefined,
                        selectedContentPiece?.content_id,
                      );
                      for (let p = 0; p < 120; p++) {
                        await new Promise(r => setTimeout(r, 3000));
                        try {
                          const st = await pollConceptImageStatus(workflowId, task_id);
                          if (st.status === 'completed') { await loadWorkflow(); break; }
                          if (st.status === 'failed') { console.error('Image gen failed:', st.message); break; }
                        } catch { break; }
                      }
                    } catch (err) {
                      console.error('Image generation failed:', err);
                    } finally {
                      setImgGenLoading(prev => { const n = new Set(prev); n.delete(idx); return n; });
                    }
                  };

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
                            <div className="shrink-0">
                              <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground mb-0.5">Concept</div>
                              <Select value={String(row.conceptIdx)} onValueChange={(v) => updateImgRow(idx, 'conceptIdx', Number(v))}>
                                <SelectTrigger className="h-7 w-[280px] text-xs"><SelectValue placeholder="Concept" /></SelectTrigger>
                                <SelectContent>
                                  {pieceConcepts.map((c, i) => (
                                    <SelectItem key={i} value={String(i)}>{c.title}</SelectItem>
                                  ))}
                                  {pieceConcepts.length === 0 && <SelectItem value="0" disabled>No concepts yet</SelectItem>}
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
                              <button
                                id={`img-gen-btn-${idx}`}
                                disabled={pieceConcepts.length === 0 || !row.imageModel}
                                onClick={() => handleGenerateImage(row, idx)}
                                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Generate"
                              >
                                {imgGenLoading.has(idx) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                            {rows.length > 1 && (
                              <div className="shrink-0"><div className="font-mono text-[8px] uppercase tracking-wider text-transparent mb-0.5 select-none">X</div><button onClick={() => removeImgRow(idx)} className="h-7 inline-flex items-center justify-center rounded p-1 text-muted-foreground/40 hover:text-foreground transition-colors"><X className="h-3 w-3" /></button></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Generated images gallery */}
                    {(() => {
                      const genImages = (getPieceSetting('image_generation', 'generated_images') as Array<{ concept_index: number; slide_index: number | null; image_url: string; image_model: string }>) || [];
                      if (genImages.length === 0) return null;
                      return (
                        <div className="mt-4">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2">Generated Images</div>
                          <div className="grid grid-cols-4 gap-2">
                            {genImages.map((img, gi) => (
                              <div key={gi} className="relative group">
                                <img src={img.image_url} alt={`Concept ${img.concept_index}`} className="w-full aspect-square rounded-md object-cover border border-border" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity">
                                  {pieceConcepts[img.concept_index]?.title?.slice(0, 30) || `Concept ${img.concept_index}`} · {img.image_model.split('/').pop()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {pieceConcepts.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground/50">
                        <p className="text-xs">Generate concepts first in the Concepts stage</p>
                      </div>
                    )}
                  </>
                  );
                })()}

                {/* ── Storyboard ── */}
                {openStageKey === 'storyboard' && (() => {
                  if (!selectedContentPiece) {
                    return <div className="text-center py-8 text-muted-foreground/50"><CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Select a content piece from the calendar first</p></div>;
                  }
                  // Get concepts from piece settings (per content piece) or fallback to top-level
                  const generatedConcepts = ((getPieceSetting('concepts', 'generated_concepts') || getSetting('concepts', 'generated_concepts')) as Array<{ title: string; hook: string; script: string; messaging: string[]; tone?: string }>) || [];
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
                      }, 5000);
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
                    return (scene.character_ids || []).every((cid) => {
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
                              <div key={char.id} className="w-[200px] rounded-lg border border-border overflow-hidden bg-muted/20">
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
                                    {(scene.character_ids || []).length > 0 && (
                                      <div className="flex flex-wrap gap-0.5">
                                        {(scene.character_ids || []).map((cid) => { const char = characters.find((c) => c.id === cid); return <span key={cid} className="inline-flex items-center rounded-full border border-border px-1 py-px font-mono text-[7px] text-muted-foreground">{char?.name || cid}</span>; })}
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
                  if (!selectedContentPiece) {
                    return <div className="text-center py-8 text-muted-foreground/50"><CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Select a content piece from the calendar first</p></div>;
                  }
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
                      }, 10000);
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
                              const outputFormat = (getSetting('video_generation', 'output_format') as string) || 'reel_9_16';
                              const aspectMap: Record<string, string> = { 'reel_9_16': 'aspect-[9/16]', 'story_9_16': 'aspect-[9/16]', 'post_1_1': 'aspect-square', 'landscape_16_9': 'aspect-video' };
                              const videoAspect = aspectMap[outputFormat] || 'aspect-[9/16]';
                              const gridCols = sbScenes.length <= 2 ? `repeat(${sbScenes.length}, minmax(0, 280px))` : `repeat(${sbScenes.length}, 1fr)`;
                              return (
                              <div className="space-y-3">
                                {/* Scenes row — storyboard images */}
                                <div>
                                  <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Scenes</div>
                                  <div className="grid gap-2 items-stretch" style={{ gridTemplateColumns: gridCols }}>
                                    {sbScenes.map((scene) => (
                                      <div key={scene.id} className="rounded border border-border overflow-hidden flex flex-col">
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
                                          {(scene.character_ids || []).length > 0 && (
                                            <div className="flex flex-wrap gap-0.5">
                                              {(scene.character_ids || []).map((cid: string) => {
                                                const char = sbCharacters.find((c) => c.id === cid);
                                                return <span key={cid} className="inline-flex items-center rounded-full border border-border px-1 py-px font-mono text-[6px] text-muted-foreground">{char?.name || cid}</span>;
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Generated video rows — one row per variation/task */}
                                {taskIds.map((tid) => {
                                  const batchVideos = sceneVariations.filter((v) => v.task_id === tid);
                                  const batchModel = batchVideos[0]?.model || '?';
                                  return (
                                    <div key={tid}>
                                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">{batchModel}</div>
                                      <div className="grid gap-2 items-stretch" style={{ gridTemplateColumns: gridCols }}>
                                        {sbScenes.map((scene) => {
                                          const vid = batchVideos.find((v) => v.scene_number === scene.scene_number || v.id.includes(`-scene${scene.scene_number}-`));
                                          return (
                                            <div key={scene.id} className="rounded border border-border overflow-hidden relative group/vid">
                                              {vid?.preview ? (
                                                <div className={`${videoAspect} bg-black`}>
                                                  <video
                                                    src={vid.preview}
                                                    className="h-full w-full object-contain bg-black [&:fullscreen]:h-screen [&:fullscreen]:w-auto [&:fullscreen]:mx-auto"
                                                    controls
                                                    playsInline
                                                  />
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
                                    </div>
                                  );
                                })}
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

                    {/* Generated Videos — grouped by job */}
                    {(() => {
                      const vidNode = nodes.find((n) => n.stage_key === 'video_generation');
                      const allVars = (vidNode?.output_data?.variations || []) as Array<{ id: string; title: string; preview?: string; type: string; task_id?: string; scene_number?: number; model?: string }>;
                      if (allVars.length === 0) return null;

                      const fmt2 = (getSetting('video_generation', 'output_format') as string) || 'reel_9_16';
                      const fmtMap2: Record<string, string> = { 'reel_9_16': 'aspect-[9/16]', 'story_9_16': 'aspect-[9/16]', 'post_1_1': 'aspect-square', 'landscape_16_9': 'aspect-video' };
                      const vidAspect2 = fmtMap2[fmt2] || 'aspect-[9/16]';

                      // Group by task_id (job)
                      const jobIds = [...new Set(allVars.map(v => v.task_id || 'unknown').filter(Boolean))];
                      // Get job metadata from videoJobs state
                      const jobsData = (videoJobs || []) as Array<{ task_id: string; model: string; temperature?: number; status: string; scenes_total: number; scenes_done: number; scenes_failed: number }>;

                      return (
                        <div className="space-y-4">
                          {jobIds.map((jobId) => {
                            const jobVars = allVars.filter(v => v.task_id === jobId);
                            const sceneVars = jobVars.filter(v => v.type === 'scene').sort((a, b) => (a.scene_number || 0) - (b.scene_number || 0));
                            const stitchedVars = jobVars.filter(v => v.type !== 'scene');
                            const jobMeta = jobsData.find(j => j.task_id === jobId);
                            const model = jobMeta?.model || jobVars[0]?.model || '?';
                            const temp = jobMeta?.temperature != null ? jobMeta.temperature : '';
                            const shortId = jobId.slice(0, 8);

                            return (
                              <div key={jobId} className="rounded-lg border border-border overflow-hidden">
                                {/* Job header */}
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b border-border">
                                  <span className="font-mono text-[10px] font-medium text-foreground">{model}</span>
                                  {temp !== '' && <span className="font-mono text-[9px] text-muted-foreground">temp {temp}</span>}
                                  <span className="font-mono text-[8px] text-muted-foreground/50">{shortId}</span>
                                  {jobMeta && <span className="font-mono text-[8px] text-muted-foreground ml-auto">{jobMeta.scenes_done}/{jobMeta.scenes_total}{jobMeta.scenes_failed > 0 ? ` · ${jobMeta.scenes_failed}✗` : ''}</span>}
                                </div>
                                {/* Scene videos */}
                                {sceneVars.length > 0 && (
                                  <div className="grid gap-1 p-2" style={{ gridTemplateColumns: `repeat(${Math.min(sceneVars.length, 6)}, 1fr)` }}>
                                    {sceneVars.map((v) => (
                                      <div key={v.id} className="relative group/sv rounded overflow-hidden">
                                        {v.preview ? (
                                          <div className={`${vidAspect2} bg-black`}>
                                            <video src={v.preview} className="h-full w-full object-contain bg-black" controls playsInline />
                                          </div>
                                        ) : (
                                          <div className={`${vidAspect2} bg-muted/50 flex items-center justify-center`}>
                                            <span className="font-mono text-[7px] text-muted-foreground/40">rendering...</span>
                                          </div>
                                        )}
                                        <div className="absolute top-0.5 left-0.5"><span className="inline-flex items-center rounded-full bg-black/60 px-1 py-px font-mono text-[6px] text-white">S{v.scene_number}</span></div>
                                        <button
                                          className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white/70 hover:text-white hover:bg-red-600/80 opacity-0 group-hover/sv:opacity-100 transition-opacity flex items-center justify-center"
                                          onClick={() => deleteVideoVariation(workflowId, v.id).then(() => loadWorkflow()).catch(() => {})}
                                        ><X className="h-2.5 w-2.5" /></button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Stitched/full videos */}
                                {stitchedVars.length > 0 && (
                                  <div className="p-2 border-t border-border space-y-2">
                                    {stitchedVars.map((v) => (
                                      <div key={v.id} className="relative group/fv rounded overflow-hidden max-w-sm">
                                        <video src={v.preview} className={`w-full ${vidAspect2} object-contain bg-black`} controls playsInline />
                                        <button
                                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white/70 hover:text-white hover:bg-red-600/80 opacity-0 group-hover/fv:opacity-100 transition-opacity flex items-center justify-center"
                                          onClick={() => deleteVideoVariation(workflowId, v.id).then(() => loadWorkflow()).catch(() => {})}
                                        ><X className="h-3 w-3" /></button>
                                        <div className="p-1"><span className="text-[8px] font-medium">{v.title}</span></div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
                {openStageKey === 'simulation_testing' && (() => {
                  if (!selectedContentPiece) {
                    return <div className="text-center py-8 text-muted-foreground/50"><CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Select a content piece from the calendar first</p></div>;
                  }
                  const simGenders = ((getSetting('simulation_testing', 'genders') as string[]) || ['Male', 'Female']);
                  const simAges = ((getSetting('simulation_testing', 'ages') as string[]) || ['18-24', '25-34']);
                  const simLlm = (getSetting('simulation_testing', 'llm') as string) || 'gemini-pro-3';
                  const simPersonaIds = ((getSetting('simulation_testing', 'persona_ids') as string[]) || []);
                  const simVideoIds = ((getSetting('simulation_testing', 'video_ids') as string[]) || []);
                  const simCombos = simGenders.length * simAges.length;

                  // Get stitched videos for selection
                  const simVidNode = nodes.find((n) => n.stage_key === 'video_generation');
                  const simAllVars = (simVidNode?.output_data?.variations || []) as Array<{ id: string; title?: string; preview?: string; type: string; model?: string; task_id?: string }>;
                  const simStitchedVars = simAllVars.filter((v) => v.preview && (v.type === 'stitched' || v.type === 'video'));

                  const handleRunSim = async () => {
                    setSimRunning(true);
                    setSimError(null);
                    try {
                      const res = await runContentSimulation(workflowId, {
                        genders: simGenders,
                        ages: simAges,
                        model_provider: '',
                        model_name: simLlm,
                        persona_ids: simPersonaIds.length > 0 ? simPersonaIds : undefined,
                        video_ids: simVideoIds.length > 0 ? simVideoIds : undefined,
                      });
                      setSimResults(res.results);
                      loadWorkflow();
                    } catch (err) {
                      setSimError(err instanceof Error ? err.message : 'Simulation failed');
                    } finally {
                      setSimRunning(false);
                    }
                  };

                  return (
                    <>
                      {personas.length > 0 && (
                        <div className="space-y-2">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Personas</div>
                          {personas.map((p) => (
                            <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" className="rounded border-border" checked={simPersonaIds.includes(p.id)} onChange={() => toggleArrayItem('simulation_testing', 'persona_ids', p.id)} />
                              <span>{p.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Gender</div>
                        {SIM_GENDERS.map((g) => (
                          <label key={g} className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" className="rounded border-border" checked={simGenders.includes(g)} onChange={() => toggleArrayItem('simulation_testing', 'genders', g)} />
                            <span>{g}</span>
                          </label>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Age Ranges</div>
                        {SIM_AGE_RANGES.map((a) => (
                          <label key={a} className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" className="rounded border-border" checked={simAges.includes(a)} onChange={() => toggleArrayItem('simulation_testing', 'ages', a)} />
                            <span>{a}</span>
                          </label>
                        ))}
                      </div>
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">LLM</div>
                        <Select value={simLlm} onValueChange={(v) => updateStageSetting('simulation_testing', 'llm', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SIM_LLM_MODELS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Video selection — stitched videos only */}
                      {simStitchedVars.length > 0 && (
                        <div className="space-y-2">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                            Videos {simVideoIds.length === 0 ? <span className="text-muted-foreground/40 normal-case">(all)</span> : <span className="text-muted-foreground/40 normal-case">({simVideoIds.length} selected)</span>}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-mono transition-colors ${simVideoIds.length === 0 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                              onClick={() => updateStageSetting('simulation_testing', 'video_ids', [])}
                            >All</button>
                            {simStitchedVars.map((v) => (
                              <button
                                key={v.id}
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-mono transition-colors ${simVideoIds.includes(v.id) ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                onClick={() => {
                                  const next = simVideoIds.includes(v.id) ? simVideoIds.filter((id: string) => id !== v.id) : [...simVideoIds, v.id];
                                  updateStageSetting('simulation_testing', 'video_ids', next);
                                }}
                              >{v.title || `Stitched — ${v.model || '?'}`}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground/60 font-mono">{simGenders.length} genders &times; {simAges.length} ages = {simCombos} combos</div>
                      <Button size="sm" className="w-full h-8 font-mono text-[10px] uppercase tracking-wider" disabled={simRunning || simGenders.length === 0 || simAges.length === 0 || !simLlm} onClick={handleRunSim}>
                        {simRunning ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Running...</> : <><BarChart2 className="h-3 w-3 mr-1.5" />Run Simulation</>}
                      </Button>
                      {simError && <p className="text-[10px] text-destructive">{simError}</p>}
                    </>
                  );
                })()}

                {/* ── Predictive Modeling ── */}
                {openStageKey === 'predictive_modeling' && (() => {
                  if (!selectedContentPiece) {
                    return <div className="text-center py-8 text-muted-foreground/50"><CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Select a content piece from the calendar first</p></div>;
                  }
                  const predLlm = (getSetting('predictive_modeling', 'llm') as string) || 'gemini-pro-3';
                  const predVideoIds = ((getSetting('predictive_modeling', 'video_ids') as string[]) || []);

                  const predVidNode = nodes.find((n) => n.stage_key === 'video_generation');
                  const predAllVars = (predVidNode?.output_data?.variations || []) as Array<{ id: string; title?: string; preview?: string; type: string; model?: string }>;
                  const predStitchedVars = predAllVars.filter((v) => v.preview && (v.type === 'stitched' || v.type === 'video'));

                  const handleRunPred = async () => {
                    setPredRunning(true);
                    setPredError(null);
                    try {
                      const res = await runPredictiveModeling(
                        workflowId,
                        predLlm,
                        predVideoIds.length > 0 ? predVideoIds : undefined,
                      );
                      setPredResults(res.predictions);
                      setPredBenchmarks(res.benchmarks);
                      loadWorkflow();
                    } catch (err) {
                      setPredError(err instanceof Error ? err.message : 'Prediction failed');
                    } finally {
                      setPredRunning(false);
                    }
                  };

                  return (
                    <>
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">LLM</div>
                        <Select value={predLlm} onValueChange={(v) => updateStageSetting('predictive_modeling', 'llm', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SIM_LLM_MODELS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Video selection */}
                      {predStitchedVars.length > 0 && (
                        <div className="space-y-2">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                            Videos {predVideoIds.length === 0 ? <span className="text-muted-foreground/40 normal-case">(all)</span> : <span className="text-muted-foreground/40 normal-case">({predVideoIds.length} selected)</span>}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-mono transition-colors ${predVideoIds.length === 0 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                              onClick={() => updateStageSetting('predictive_modeling', 'video_ids', [])}
                            >All</button>
                            {predStitchedVars.map((v) => (
                              <button
                                key={v.id}
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-mono transition-colors ${predVideoIds.includes(v.id) ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                onClick={() => {
                                  const next = predVideoIds.includes(v.id) ? predVideoIds.filter((id: string) => id !== v.id) : [...predVideoIds, v.id];
                                  updateStageSetting('predictive_modeling', 'video_ids', next);
                                }}
                              >{v.title || `Stitched — ${v.model || '?'}`}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <Button size="sm" className="w-full h-8 font-mono text-[10px] uppercase tracking-wider" disabled={predRunning || predStitchedVars.length === 0} onClick={handleRunPred}>
                        {predRunning ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Predicting...</> : <><BarChart2 className="h-3 w-3 mr-1.5" />Run Prediction</>}
                      </Button>
                      {predError && <p className="text-[10px] text-destructive">{predError}</p>}
                      {predResults.length > 0 && <p className="text-[10px] text-muted-foreground/60 font-mono">{predResults.length} video{predResults.length !== 1 ? 's' : ''} predicted</p>}
                    </>
                  );
                })()}

                {/* ── Content Ranking ── */}
                {openStageKey === 'content_ranking' && (() => {
                  if (!selectedContentPiece) {
                    return <div className="text-center py-8 text-muted-foreground/50"><CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">Select a content piece from the calendar first</p></div>;
                  }
                  const handleRunRank = async () => {
                    setRankRunning(true);
                    setRankError(null);
                    try {
                      const res = await runContentRanking(workflowId, 0.4, 0.6);
                      setRankResults(res.rankings);
                      loadWorkflow();
                    } catch (err) {
                      setRankError(err instanceof Error ? err.message : 'Ranking failed');
                    } finally {
                      setRankRunning(false);
                    }
                  };

                  return (
                    <>
                      <Button size="sm" className="w-full h-8 font-mono text-[10px] uppercase tracking-wider" disabled={rankRunning || predResults.length === 0} onClick={handleRunRank}>
                        {rankRunning ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Ranking...</> : <><Layers className="h-3 w-3 mr-1.5" />Rank Content</>}
                      </Button>
                      {predResults.length === 0 && <p className="text-[10px] text-muted-foreground/60">Run Predictive Modeling first</p>}
                      {rankError && <p className="text-[10px] text-destructive">{rankError}</p>}
                      {rankResults.length > 0 && <p className="text-[10px] text-muted-foreground/60 font-mono">{rankResults.length} video{rankResults.length !== 1 ? 's' : ''} ranked</p>}
                    </>
                  );
                })()}

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
