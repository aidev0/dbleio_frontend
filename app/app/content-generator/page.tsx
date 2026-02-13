"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  List, ListChecks, GitBranch, Loader2, Image, Clock, X,
  CheckCircle2, Circle, XCircle, Bot, User as UserIcon,
  Film, FileText, Mic, Sparkles, Megaphone, Paperclip, Settings2,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import TimelineInput from '@/components/timeline/TimelineInput';
import Chat from '@/components/Chat';
import ContentWorkflowStatusBadge from './components/ContentWorkflowStatusBadge';
import NavMenu from '@/components/NavMenu';
import {
  getContentWorkflows,
  getBrands,
  createContentWorkflow,
  getUserMe,
  getOrganizations,
  createOrganization,
  createBrand,
  getContentWorkflow,
  getContentNodes,
  getContentTimeline,
  createContentTimelineEntry,
  approveContentStage,
  getCampaigns,
} from './lib/api';
import { getBrandAssets } from '../brands/lib/api';
import type { BrandAsset } from '../brands/lib/types';
import type { Campaign } from './lib/api';
import type { ContentWorkflow, ContentWorkflowNode } from './lib/types';
import { CONTENT_PIPELINE_STAGES, CONTENT_STAGE_LABELS } from './lib/types';
import type { Brand } from '../brands/lib/types';
import type { TimelineEntry } from '../developer/lib/types';

type TabMode = 'list' | 'graph' | 'content';

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '';
  const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  const d = new Date(utcStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// --- Workflow Steps List ---
function WorkflowStepsList({
  workflow,
  nodes,
  campaignCount,
  assetCount,
  onClickStage,
}: {
  workflow: ContentWorkflow | null;
  nodes: ContentWorkflowNode[];
  campaignCount: number;
  assetCount: number;
  onClickStage?: (stageKey: string) => void;
}) {
  return (
    <div className="divide-y divide-border">
      {CONTENT_PIPELINE_STAGES.map((stage, i) => {
        const node = nodes.find((n) => n.stage_key === stage.key);
        const status = node?.status || 'pending';
        const isCurrent = workflow?.current_stage === stage.key;
        const Icon = status === 'completed' ? CheckCircle2
          : status === 'running' ? Loader2
          : status === 'failed' ? XCircle
          : status === 'waiting_approval' ? Clock
          : Circle;
        const TypeIcon = stage.stageType === 'agent' ? Bot : UserIcon;
        const canComplete = isCurrent && status === 'pending' && stage.stageType === 'human' && !stage.approvalRequired;

        return (
          <div key={stage.key}>
            <div
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${isCurrent ? 'bg-muted/50' : ''}`}
            >
              <span className="font-mono text-[10px] text-muted-foreground/30 w-5 shrink-0 text-right">
                {i + 1}
              </span>
              <button
                onClick={() => canComplete && onClickStage?.(stage.key)}
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

            {/* Strategy & Assets readiness checklist */}
            {stage.key === 'strategy_assets' && isCurrent && (
              <div className="px-4 pb-3 bg-muted/50">
                <div className="ml-10 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {campaignCount > 0
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />}
                    <span className={`text-xs ${campaignCount > 0 ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      Campaigns {campaignCount > 0 ? `(${campaignCount})` : '— none set'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {assetCount > 0
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />}
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

// --- Creative Asset Type ---
interface CreativeAsset {
  type: 'video' | 'image' | 'voiceover' | 'caption' | 'concept';
  title: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  stage: string;
}

function extractCreatives(nodes: ContentWorkflowNode[]): CreativeAsset[] {
  const assets: CreativeAsset[] = [];

  for (const node of nodes) {
    const out = node.output_data || {};
    const stage = node.stage_key;

    // Concepts stage — scripts / ideas
    if (stage === 'concepts') {
      const concepts = (out.concepts || out.scripts || out.ideas || []) as Array<Record<string, unknown>>;
      for (const c of concepts) {
        assets.push({
          type: 'concept',
          title: (c.title || c.name || 'Concept') as string,
          description: (c.description || c.script || c.summary || '') as string,
          stage,
        });
      }
    }

    // Content generation stage — videos, images, voiceovers, captions
    if (stage === 'content_generation') {
      for (const v of (out.videos || []) as Array<Record<string, unknown>>) {
        assets.push({
          type: 'video',
          title: (v.title || v.name || 'Video') as string,
          description: (v.description || '') as string,
          url: (v.url || v.src || '') as string,
          thumbnail: (v.thumbnail || '') as string,
          stage,
        });
      }
      for (const img of (out.images || []) as Array<Record<string, unknown>>) {
        assets.push({
          type: 'image',
          title: (img.title || img.name || 'Image') as string,
          description: (img.description || '') as string,
          url: (img.url || img.src || '') as string,
          thumbnail: (img.thumbnail || img.url || img.src || '') as string,
          stage,
        });
      }
      for (const vo of (out.voiceovers || []) as Array<Record<string, unknown>>) {
        assets.push({
          type: 'voiceover',
          title: (vo.title || vo.name || 'Voiceover') as string,
          description: (vo.description || '') as string,
          url: (vo.url || vo.src || '') as string,
          stage,
        });
      }
      for (const cap of (out.captions || []) as Array<Record<string, unknown>>) {
        assets.push({
          type: 'caption',
          title: (cap.title || cap.platform || 'Caption') as string,
          description: (cap.text || cap.content || cap.description || '') as string,
          stage,
        });
      }
      // Generic generated_assets fallback
      if (assets.filter(a => a.stage === 'content_generation').length === 0) {
        for (const a of (out.generated_assets || []) as Array<Record<string, unknown>>) {
          assets.push({
            type: (a.type as CreativeAsset['type']) || 'image',
            title: (a.title || a.name || 'Asset') as string,
            description: (a.description || '') as string,
            url: (a.url || a.src || '') as string,
            thumbnail: (a.thumbnail || a.url || a.src || '') as string,
            stage,
          });
        }
      }
    }
  }

  return assets;
}

const CREATIVE_TYPE_ICON: Record<string, typeof Film> = {
  video: Film,
  image: Image,
  voiceover: Mic,
  caption: FileText,
  concept: Sparkles,
};

const CREATIVE_TYPE_LABEL: Record<string, string> = {
  video: 'Video',
  image: 'Image',
  voiceover: 'Voiceover',
  caption: 'Caption',
  concept: 'Concept',
};

function CreativesGrid({ nodes }: { nodes: ContentWorkflowNode[] }) {
  const assets = extractCreatives(nodes);

  if (assets.length === 0) {
    const contentNode = nodes.find(n => n.stage_key === 'content_generation');
    const isRunning = contentNode?.status === 'running';
    const isPending = !contentNode || contentNode.status === 'pending';

    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        {isRunning ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground">Generating creatives...</span>
          </>
        ) : (
          <>
            <Image className="h-6 w-6 text-muted-foreground/30" />
            <span className="font-mono text-xs text-muted-foreground">
              {isPending ? 'Creatives will appear here once generated' : 'No creatives generated yet'}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {assets.map((asset, i) => {
        const TypeIcon = CREATIVE_TYPE_ICON[asset.type] || Sparkles;
        return (
          <div key={i} className="group rounded-lg border border-border bg-background overflow-hidden hover:border-foreground/20 transition-colors">
            {/* Thumbnail / preview area */}
            {(asset.type === 'image' || asset.type === 'video') && asset.thumbnail ? (
              <div className="aspect-video bg-muted relative overflow-hidden">
                <img
                  src={asset.thumbnail}
                  alt={asset.title}
                  className="h-full w-full object-cover"
                />
                {asset.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Film className="h-8 w-8 text-white/80" />
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-muted flex items-center justify-center">
                <TypeIcon className="h-8 w-8 text-muted-foreground/20" />
              </div>
            )}

            {/* Info */}
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  <TypeIcon className="h-2.5 w-2.5" />
                  {CREATIVE_TYPE_LABEL[asset.type] || asset.type}
                </span>
              </div>
              <h3 className="text-sm font-medium text-foreground truncate">{asset.title}</h3>
              {asset.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{asset.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ContentGeneratorPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabMode>('list');
  const [workflows, setWorkflows] = useState<ContentWorkflow[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [myOrgIds, setMyOrgIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [selectedWorkflow, setSelectedWorkflow] = useState<ContentWorkflow | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<ContentWorkflowNode[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const autoSelectedRef = useRef(false);

  // Context selectors
  const [organizations, setOrganizations] = useState<{ _id: string; name: string; slug?: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(undefined);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(undefined);
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);

  // Graph component (lazy loaded)
  const [GraphComponent, setGraphComponent] = useState<React.ComponentType<{
    nodes: ContentWorkflowNode[];
    onNodeClick?: (node: ContentWorkflowNode) => void;
  }> | null>(null);

  // Detect user roles
  useEffect(() => {
    (async () => {
      const me = await getUserMe();
      if (me) {
        const roles: string[] = me.roles || [];
        if (roles.includes('admin')) setIsAdmin(true);
        if (roles.some((r) => ['admin', 'fde', 'fdm', 'qa'].includes(r))) setIsTeamMember(true);
        if (me.organizations) {
          setMyOrgIds(me.organizations.map((o: { _id: string }) => o._id));
        }
      }
      setRoleLoaded(true);
    })();
  }, []);

  // Load selected workflow detail
  const loadWorkflowDetail = useCallback(async (wfId: string) => {
    try {
      const [wf, nodeList] = await Promise.all([
        getContentWorkflow(wfId),
        getContentNodes(wfId),
      ]);
      if (wf) setSelectedWorkflow(wf);
      setSelectedNodes(nodeList);
    } catch (err) {
      console.error('Failed to load workflow detail:', err);
    }
  }, []);

  // Load workflows + brands, auto-select latest active workflow
  const loadData = useCallback(async () => {
    try {
      const [wfs, brs] = await Promise.all([getContentWorkflows(), getBrands()]);
      setWorkflows(wfs);
      setBrands(brs);
      // Auto-select the latest active workflow on first load only
      if (!autoSelectedRef.current && wfs.length > 0) {
        autoSelectedRef.current = true;
        const active = wfs.find((w) => ['running', 'waiting_approval', 'pending'].includes(w.status));
        const pick = active || wfs[0];
        setSelectedWorkflow(pick);
        loadWorkflowDetail(pick._id);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [loadWorkflowDetail]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Load organizations for selector
  useEffect(() => {
    if (!roleLoaded) return;
    (async () => {
      const orgs = await getOrganizations();
      setOrganizations(orgs);
      if (orgs.length > 0) {
        const defaultOrg = orgs.find((o) => myOrgIds.includes(o._id)) || orgs[0];
        setSelectedOrgId(defaultOrg._id);
      }
    })();
  }, [roleLoaded, myOrgIds]);

  // When org changes, reload brands and reset downstream
  useEffect(() => {
    if (!selectedOrgId) return;
    (async () => {
      const brs = await getBrands(selectedOrgId);
      setBrands(brs);
      if (brs.length > 0) {
        setSelectedBrandId(brs[0]._id);
      } else {
        setSelectedBrandId(undefined);
      }
      setSelectedCampaignId(undefined);
    })();
  }, [selectedOrgId]);

  // When brand changes, reload campaigns and auto-select the latest
  useEffect(() => {
    if (!selectedBrandId) { setCampaigns([]); setSelectedCampaignId(undefined); setBrandAssets([]); return; }
    (async () => {
      const [camps, assets] = await Promise.all([
        getCampaigns(selectedBrandId),
        getBrandAssets(selectedBrandId),
      ]);
      setCampaigns(camps);
      setBrandAssets(assets);
      if (camps.length > 0) {
        const latest = camps.reduce((a, b) =>
          (a.created_at || '') > (b.created_at || '') ? a : b
        );
        setSelectedCampaignId(latest._id);
      } else {
        setSelectedCampaignId(undefined);
      }
    })();
  }, [selectedBrandId]);

  // Load timeline entries + chat messages for selected workflow
  const loadTimeline = useCallback(async (wfId: string) => {
    setTimelineLoading(true);
    try {
      const entries = await getContentTimeline(wfId);
      const filtered = entries.filter((e) => !e.is_deleted);
      // Ensure all required TimelineEntry fields have values
      const mapped: TimelineEntry[] = filtered.map((e) => ({
        _id: e._id,
        workflow_id: e.workflow_id,
        card_type: (e.card_type || 'user_message') as TimelineEntry['card_type'],
        content: e.content,
        author_id: e.author_id,
        author_name: e.author_name || e.author_id || 'User',
        author_role: e.author_role || 'user',
        visibility: (e.visibility || 'public') as TimelineEntry['visibility'],
        parent_entry_id: e.parent_entry_id,
        is_deleted: e.is_deleted,
        processing: e.processing,
        todos: e.todos,
        approval_data: e.approval_data,
        status_data: e.status_data,
        created_at: e.created_at,
        updated_at: e.updated_at,
      }));
      setTimelineEntries(mapped);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  // Load timeline immediately when workflow is selected
  useEffect(() => {
    if (!selectedWorkflow) return;
    loadTimeline(selectedWorkflow._id);
  }, [selectedWorkflow, loadTimeline]);

  // Poll selected workflow
  useEffect(() => {
    if (!selectedWorkflow) return;
    const isActive = ['running', 'waiting_approval', 'pending'].includes(selectedWorkflow.status);
    if (!isActive) return;
    const interval = setInterval(() => {
      loadWorkflowDetail(selectedWorkflow._id);
      loadTimeline(selectedWorkflow._id);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedWorkflow, loadWorkflowDetail, loadTimeline]);

  // Lazy load graph
  useEffect(() => {
    if (tab === 'graph' && !GraphComponent) {
      import('./components/ContentPipelineGraph').then((mod) => {
        setGraphComponent(() => mod.default);
      });
    }
  }, [tab, GraphComponent]);

  // Ensure brand exists — uses selected values from context selectors
  const ensureBrand = async (): Promise<string | null> => {
    if (selectedBrandId) return selectedBrandId;
    if (brands.length > 0) return brands[0]._id;
    try {
      let orgId = selectedOrgId;
      if (!orgId) {
        const orgs = await getOrganizations();
        orgId = orgs.find((o: { _id: string }) => myOrgIds.includes(o._id))?._id || orgs[0]?._id;
      }
      if (!orgId) {
        const newOrg = await createOrganization({ name: 'Default', slug: 'default' });
        orgId = newOrg._id;
        setMyOrgIds((prev) => [...prev, orgId!]);
      }
      const newBrand = await createBrand({ organization_id: orgId, name: 'Default Brand', slug: 'default-brand' });
      setBrands((prev) => [...prev, newBrand]);
      setSelectedBrandId(newBrand._id);
      return newBrand._id;
    } catch {
      const freshBrands = await getBrands();
      if (freshBrands.length > 0) { setBrands(freshBrands); return freshBrands[0]._id; }
      return null;
    }
  };

  // Send chat message -- creates workflow if none selected
  const handleSendMessage = async (content: string) => {
    setCreateError(null);

    if (!selectedWorkflow) {
      try {
        const brandId = await ensureBrand();
        if (!brandId) { setCreateError('Could not create a brand. Please try again.'); return; }
        const autoTitle = content.length > 60 ? content.slice(0, 57) + '...' : content;
        const config: Record<string, unknown> = {};
        if (selectedCampaignId) config.campaign_id = selectedCampaignId;
        const wf = await createContentWorkflow({ brand_id: brandId, title: autoTitle, description: content, config });
        setSelectedWorkflow(wf);
        setWorkflows((prev) => [wf, ...prev]);
        // Post the first message as a timeline entry so it appears
        const cardType = isTeamMember ? 'fde_message' : 'user_message';
        const visibility = isTeamMember ? 'internal' : 'public';
        await createContentTimelineEntry(wf._id, { card_type: cardType, content, visibility });
        loadWorkflowDetail(wf._id);
        setTimeout(() => loadTimeline(wf._id), 1000);
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        setCreateError(errorObj?.message || 'Failed to create workflow.');
      }
      return;
    }

    const cardType = isTeamMember ? 'fde_message' : 'user_message';
    const visibility = isTeamMember ? 'internal' : 'public';
    await createContentTimelineEntry(selectedWorkflow._id, { card_type: cardType, content, visibility });
    setTimeout(() => loadTimeline(selectedWorkflow._id), 1000);
  };

  if (!roleLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Single header row */}
      <div className="flex items-center gap-2 border-b border-border px-3 md:px-4 py-2">
        <div className="flex flex-col">
          <span className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-0.5">Org</span>
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger size="sm" className="h-7 min-w-[100px] text-xs">
              <SelectValue placeholder="Org" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org._id} value={org._id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col">
          <span className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-0.5">Brand</span>
          <Select
            value={selectedBrandId}
            onValueChange={setSelectedBrandId}
            disabled={!selectedOrgId || brands.length === 0}
          >
            <SelectTrigger size="sm" className="h-7 min-w-[100px] text-xs">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col">
          <span className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-0.5">Campaign</span>
          <Select
            value={selectedCampaignId}
            onValueChange={setSelectedCampaignId}
            disabled={!selectedBrandId || campaigns.length === 0}
          >
            <SelectTrigger size="sm" className="h-7 min-w-[100px] text-xs">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        {/* Tab icons */}
        <div className="flex items-center rounded-full border border-border p-0.5">
          {([
            { mode: 'list' as TabMode, icon: ListChecks, label: 'Steps' },
            { mode: 'graph' as TabMode, icon: GitBranch, label: 'Graph' },
            { mode: 'content' as TabMode, icon: Image, label: 'Content' },
          ]).map(({ mode, icon: TabIcon, label }) => (
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

        <NavMenu />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* List tab */}
        {tab === 'list' && (
          <div className="flex h-full flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="relative w-full py-4">
                {/* Vertical timeline line */}
                <div className="hidden md:block absolute left-[25%] top-0 bottom-0 w-px bg-border" />

                {createError && (
                  <div className="mx-3 mt-2 mb-4 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                    {createError}
                  </div>
                )}

                {/* + input at top */}
                <TimelineInput
                  onSubmit={(content) => handleSendMessage(content)}
                  placeholder="Describe content to create..."
                />

                {/* Loading */}
                {loading && workflows.length === 0 && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Workflow cards */}
                {workflows.map((wf) => (
                  <div key={wf._id} className="relative flex items-start cursor-pointer" onClick={() => {
                    router.push(`/app/content-generator/${wf._id}`);
                  }}>
                    {/* Timeline dot */}
                    <div className="hidden md:block absolute left-[calc(25%-0.375rem)] top-4 z-10">
                      <div className="h-3 w-3 rounded-full bg-foreground" />
                    </div>

                    {/* Card */}
                    <div className="w-full md:ml-[26%] md:w-[52%] py-3">
                      <div className="group rounded-lg border border-border bg-background p-5 hover:border-foreground/20 transition-colors">
                        {/* Header: title + status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-medium">{wf.title}</h3>
                          </div>
                          <ContentWorkflowStatusBadge status={wf.status} />
                        </div>

                        {/* Current stage badge */}
                        {wf.current_stage && (
                          <div className="mt-2">
                            <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                              {CONTENT_STAGE_LABELS[wf.current_stage] || wf.current_stage}
                            </span>
                          </div>
                        )}

                        {/* Description */}
                        {wf.description && wf.description !== wf.title && (
                          <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                            {wf.description}
                          </p>
                        )}

                        {/* Timestamps */}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground/50">
                          <span>Requested {formatShortDate(wf.created_at)}</span>
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

            {/* Chat pinned at bottom */}
            <Chat
              messages={[]}
              onSend={handleSendMessage}
              inputOnly
              placeholder="Describe content to create..."
            />
          </div>
        )}

        {/* Graph tab */}
        {tab === 'graph' && (
          <div className="flex-1 min-h-0">
            {selectedWorkflow ? (
              GraphComponent ? (
                <GraphComponent nodes={selectedNodes} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="font-mono text-xs text-muted-foreground">Select a workflow to see the graph</span>
              </div>
            )}
          </div>
        )}

        {/* Content tab */}
        {tab === 'content' && (
          <div className="flex-1 min-h-0 overflow-auto px-3 md:px-6 py-4">
            {selectedWorkflow ? (
              <CreativesGrid nodes={selectedNodes} />
            ) : (
              <div className="flex items-center justify-center py-16">
                <span className="font-mono text-xs text-muted-foreground">
                  Create a workflow to see content
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
