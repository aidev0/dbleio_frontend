"use client";

import { useEffect, useState, useRef } from 'react';
import {
  Plus, Tag, ChevronDown, ChevronRight, Megaphone, Target, Layers,
  Trash2, Pencil, Paperclip, Eye, Download, Copy, Check,
  Film, ImageIcon, FileText, Music, Type as TypeIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getBrands, createBrand, updateBrand, deleteBrand, getAudiences, createAudience, deleteAudience, getBrandAssets, createBrandAsset, uploadBrandAsset, deleteBrandAsset, getStrategies, createStrategy, updateStrategy, deleteStrategy } from './lib/api';
import { getOrganizations } from '../developer/lib/api';
import BrandForm from './components/BrandForm';
import AudienceForm from './components/AudienceForm';
import type { Brand, Audience, BrandAsset, Strategy } from './lib/types';
import type { Organization } from '../developer/lib/types';
import { apiGet, apiPost, apiDelete, apiFetch } from '../video-simulation/lib/api';

interface Campaign {
  _id: string;
  id: string;
  name: string;
  description?: string;
  brand_id?: string;
  platform?: string;
  campaign_goal?: string;
  created_at: string;
  updated_at: string;
}

async function getCampaigns(): Promise<Campaign[]> {
  try {
    const res = await apiGet('/api/campaigns');
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

async function createCampaign(data: { name: string; brand_id?: string; description?: string; platform?: string; campaign_goal?: string }): Promise<Campaign> {
  const res = await apiPost('/api/campaigns', data);
  if (!res.ok) throw new Error('Failed to create campaign');
  return res.json();
}

async function updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign> {
  const res = await apiFetch(`/api/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update campaign');
  return res.json();
}

async function deleteCampaign(id: string): Promise<void> {
  const res = await apiDelete(`/api/campaigns/${id}`);
  if (!res.ok) throw new Error('Failed to delete campaign');
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBrand, setShowCreateBrand] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showAddAudience, setShowAddAudience] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showCreateStrategy, setShowCreateStrategy] = useState(false);
  const [showEditCampaign, setShowEditCampaign] = useState(false);
  const [showEditStrategy, setShowEditStrategy] = useState(false);
  const [showEditBrand, setShowEditBrand] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

  // Campaign form
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignPlatform, setCampaignPlatform] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');

  // Strategy form
  const [strategyName, setStrategyName] = useState('');
  const [strategyBudgetAmount, setStrategyBudgetAmount] = useState('');
  const [strategyBudgetType, setStrategyBudgetType] = useState('');
  const [strategyKpi, setStrategyKpi] = useState('');
  const [strategyKpiValue, setStrategyKpiValue] = useState('');
  const [strategyLocations, setStrategyLocations] = useState('');
  const [strategyInterests, setStrategyInterests] = useState('');

  // Edit campaign form
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [editCampaignName, setEditCampaignName] = useState('');
  const [editCampaignDescription, setEditCampaignDescription] = useState('');
  const [editCampaignPlatform, setEditCampaignPlatform] = useState('');
  const [editCampaignGoal, setEditCampaignGoal] = useState('');

  // Edit strategy form
  const [editStrategy, setEditStrategy] = useState<Strategy | null>(null);
  const [editStrategyName, setEditStrategyName] = useState('');
  const [editStrategyBudgetAmount, setEditStrategyBudgetAmount] = useState('');
  const [editStrategyBudgetType, setEditStrategyBudgetType] = useState('');
  const [editStrategyKpi, setEditStrategyKpi] = useState('');
  const [editStrategyKpiValue, setEditStrategyKpiValue] = useState('');
  const [editStrategyLocations, setEditStrategyLocations] = useState('');
  const [editStrategyInterests, setEditStrategyInterests] = useState('');

  // Edit brand form
  const [editBrand, setEditBrand] = useState<Brand | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editProductName, setEditProductName] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPlatforms, setEditPlatforms] = useState('');
  const [saving, setSaving] = useState(false);

  // Asset form
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('file');
  const [assetUrl, setAssetUrl] = useState('');
  const [assetDescription, setAssetDescription] = useState('');
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);
  const [viewingAsset, setViewingAsset] = useState<BrandAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const [b, o, c, a, as_, st] = await Promise.all([getBrands(), getOrganizations(), getCampaigns(), getAudiences(), getBrandAssets(), getStrategies()]);
      setBrands(b);
      setOrganizations(o);
      setCampaigns(c);
      setAudiences(a);
      setAssets(as_);
      setStrategies(st);
      if (o.length > 0 && !selectedOrgId) setSelectedOrgId(o[0]._id);
      // Auto-expand brands that have content
      const withContent = new Set<string>();
      c.forEach((camp) => { if (camp.brand_id) withContent.add(camp.brand_id); });
      a.forEach((aud) => { if (aud.brand_id) withContent.add(aud.brand_id); });
      as_.forEach((ast) => { if (ast.brand_id) withContent.add(ast.brand_id); });
      setExpandedBrands(withContent);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreateBrand = async (data: Parameters<typeof createBrand>[0]) => {
    setCreating(true);
    try {
      await createBrand(data);
      setShowCreateBrand(false);
      await load();
    } finally {
      setCreating(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createCampaign({
        name: campaignName,
        brand_id: selectedBrandId || undefined,
        description: campaignDescription || undefined,
        platform: campaignPlatform || undefined,
        campaign_goal: campaignGoal || undefined,
      });
      setShowCreateCampaign(false);
      setCampaignName('');
      setCampaignDescription('');
      setCampaignPlatform('');
      setCampaignGoal('');
      await load();
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await deleteCampaign(campaignId);
      await load();
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    }
  };

  const handleCreateAudience = async (data: Parameters<typeof createAudience>[0]) => {
    setCreating(true);
    try {
      await createAudience(data);
      setShowAddAudience(false);
      await load();
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAudience = async (audienceId: string) => {
    if (!confirm('Delete this audience?')) return;
    try {
      await deleteAudience(audienceId);
      await load();
    } catch (err) {
      console.error('Failed to delete audience:', err);
    }
  };

  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId) return;
    setCreating(true);
    try {
      await createStrategy({
        campaign_id: selectedCampaignId,
        name: strategyName,
        budget_amount: strategyBudgetAmount ? parseFloat(strategyBudgetAmount) : undefined,
        budget_type: strategyBudgetType || undefined,
        performance_objective: strategyKpi ? { kpi: strategyKpi, value: strategyKpiValue ? parseFloat(strategyKpiValue) : undefined } : undefined,
        audience_control: (strategyLocations || strategyInterests) ? {
          location: strategyLocations ? strategyLocations.split(',').map(s => s.trim()).filter(Boolean) : [],
          zip_codes: [],
          in_market_interests: strategyInterests ? strategyInterests.split(',').map(s => s.trim()).filter(Boolean) : [],
        } : undefined,
      });
      setShowCreateStrategy(false);
      setStrategyName('');
      setStrategyBudgetAmount('');
      setStrategyBudgetType('');
      setStrategyKpi('');
      setStrategyKpiValue('');
      setStrategyLocations('');
      setStrategyInterests('');
      await load();
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteStrategy = async (strategyId: string) => {
    if (!confirm('Delete this strategy?')) return;
    try {
      await deleteStrategy(strategyId);
      await load();
    } catch (err) {
      console.error('Failed to delete strategy:', err);
    }
  };

  const openEditCampaign = (c: Campaign) => {
    setEditCampaign(c);
    setEditCampaignName(c.name);
    setEditCampaignDescription(c.description || '');
    setEditCampaignPlatform(c.platform || '');
    setEditCampaignGoal(c.campaign_goal || '');
    setShowEditCampaign(true);
  };

  const handleSaveEditCampaign = async () => {
    if (!editCampaign || !editCampaignName.trim()) return;
    setSaving(true);
    try {
      await updateCampaign(editCampaign._id, {
        name: editCampaignName,
        description: editCampaignDescription || undefined,
        platform: editCampaignPlatform || undefined,
        campaign_goal: editCampaignGoal || undefined,
      });
      setShowEditCampaign(false);
      setEditCampaign(null);
      await load();
    } catch (err) {
      console.error('Failed to update campaign:', err);
    } finally {
      setSaving(false);
    }
  };

  const openEditStrategy = (st: Strategy) => {
    setEditStrategy(st);
    setEditStrategyName(st.name);
    setEditStrategyBudgetAmount(st.budget_amount != null ? String(st.budget_amount) : '');
    setEditStrategyBudgetType(st.budget_type || '');
    setEditStrategyKpi(st.performance_objective?.kpi || '');
    setEditStrategyKpiValue(st.performance_objective?.value != null ? String(st.performance_objective.value) : '');
    setEditStrategyLocations(st.audience_control?.location?.join(', ') || '');
    setEditStrategyInterests(st.audience_control?.in_market_interests?.join(', ') || '');
    setShowEditStrategy(true);
  };

  const handleSaveEditStrategy = async () => {
    if (!editStrategy || !editStrategyName.trim()) return;
    setSaving(true);
    try {
      await updateStrategy(editStrategy._id, {
        name: editStrategyName,
        budget_amount: editStrategyBudgetAmount ? parseFloat(editStrategyBudgetAmount) : undefined,
        budget_type: editStrategyBudgetType || undefined,
      });
      setShowEditStrategy(false);
      setEditStrategy(null);
      await load();
    } catch (err) {
      console.error('Failed to update strategy:', err);
    } finally {
      setSaving(false);
    }
  };

  const openCreateStrategy = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setShowCreateStrategy(true);
  };

  const getStrategiesForCampaign = (campaignId: string) =>
    strategies.filter((s) => s.campaign_id === campaignId);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrandId) return;
    setCreating(true);
    try {
      if (assetFile) {
        setUploadProgress(0);
        await uploadBrandAsset(assetFile, selectedBrandId, assetName || undefined, assetDescription || undefined, assetType !== 'file' ? assetType : undefined, setUploadProgress);
      } else {
        await createBrandAsset({
          brand_id: selectedBrandId,
          name: assetName,
          asset_type: assetType,
          url: assetUrl || undefined,
          description: assetDescription || undefined,
        });
      }
      setShowAddAsset(false);
      setAssetName('');
      setAssetType('file');
      setAssetUrl('');
      setAssetDescription('');
      setAssetFile(null);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } finally {
      setCreating(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Delete this asset?')) return;
    try {
      await deleteBrandAsset(assetId);
      await load();
    } catch (err) {
      console.error('Failed to delete asset:', err);
    }
  };

  const openAddAsset = (brandId: string) => {
    setSelectedBrandId(brandId);
    setShowAddAsset(true);
  };

  const openCreateCampaign = (brandId: string) => {
    setSelectedBrandId(brandId);
    setShowCreateCampaign(true);
  };

  const openAddAudience = (brandId: string) => {
    setSelectedBrandId(brandId);
    setShowAddAudience(true);
  };

  const openEditBrand = (brand: Brand) => {
    setEditBrand(brand);
    setEditName(brand.name);
    setEditUrl(brand.url || '');
    setEditProductName(brand.product_name || '');
    setEditIndustry(brand.industry || '');
    setEditDescription(brand.description || '');
    setEditPlatforms(brand.platforms?.join(', ') || '');
    setShowEditBrand(true);
  };

  const handleSaveEditBrand = async () => {
    if (!editBrand || !editName.trim()) return;
    setSaving(true);
    try {
      await updateBrand(editBrand._id, {
        name: editName,
        url: editUrl || undefined,
        product_name: editProductName || undefined,
        industry: editIndustry || undefined,
        description: editDescription || undefined,
        platforms: editPlatforms ? editPlatforms.split(',').map(p => p.trim()).filter(Boolean) : undefined,
      } as Partial<Brand>);
      setShowEditBrand(false);
      setEditBrand(null);
      await load();
    } catch (err) {
      console.error('Failed to update brand:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('Delete this brand and unlink its campaigns?')) return;
    try {
      await deleteBrand(brandId);
      await load();
    } catch (err) {
      console.error('Failed to delete brand:', err);
    }
  };

  const toggleBrand = (brandId: string) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) next.delete(brandId);
      else next.add(brandId);
      return next;
    });
  };

  const getCampaignsForBrand = (brandId: string) =>
    campaigns.filter((c) => c.brand_id === brandId);

  const getAudiencesForBrand = (brandId: string) =>
    audiences.filter((a) => a.brand_id === brandId);

  const getAssetsForBrand = (brandId: string) =>
    assets.filter((a) => a.brand_id === brandId);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 md:px-6 py-8 md:py-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-10">
          <div>
            <h1 className="text-xl font-medium tracking-tight">Brands</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage brands, campaigns, and audiences.
            </p>
          </div>
          <Button onClick={() => setShowCreateBrand(true)} size="sm" className="h-8 gap-1 text-xs shrink-0">
            <Plus className="h-3.5 w-3.5" /> New Brand
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}

        {!loading && brands.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Tag className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No brands yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Create your first brand to start managing campaigns.</p>
            <Button onClick={() => setShowCreateBrand(true)} size="sm" className="mt-5 h-8 text-xs">
              Create Brand
            </Button>
          </div>
        )}

        {!loading && brands.length > 0 && (
          <div className="space-y-2">
            {brands.map((brand) => {
              const brandCampaigns = getCampaignsForBrand(brand._id);
              const brandAudiences = getAudiencesForBrand(brand._id);
              const brandAssets = getAssetsForBrand(brand._id);
              const isExpanded = expandedBrands.has(brand._id);

              return (
                <div key={brand._id} className="rounded-lg border border-border overflow-hidden">
                  {/* Brand row */}
                  <div className="group/brand flex items-center gap-3 px-4 py-3 bg-background">
                    {/* Expand toggle */}
                    <button
                      onClick={() => toggleBrand(brand._id)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground/40 hover:text-foreground transition-colors"
                    >
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />
                      }
                    </button>

                    {/* Brand icon */}
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt="" className="h-7 w-7 shrink-0 rounded object-contain" />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </div>
                    )}

                    {/* Brand info */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{brand.name}</span>
                      {brand.product_name && (
                        <p className="text-[11px] text-muted-foreground/60 truncate">{brand.product_name}</p>
                      )}
                    </div>

                    {/* Counts + actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditBrand(brand)}
                        className="opacity-0 group-hover/brand:opacity-100 flex h-6 w-6 items-center justify-center rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all"
                        title="Edit brand"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteBrand(brand._id)}
                        className="opacity-0 group-hover/brand:opacity-100 flex h-6 w-6 items-center justify-center rounded text-muted-foreground/30 hover:text-destructive hover:bg-muted transition-all"
                        title="Delete brand"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded: campaigns + audiences */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/20">
                      {/* Campaigns section */}
                      <div className="px-4 py-2 border-b border-border/50">
                        <div className="flex items-center justify-between ml-6">
                          <div className="flex items-center gap-1.5">
                            <Megaphone className="h-3 w-3 text-muted-foreground/40" />
                            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">Campaigns</span>
                          </div>
                          <button
                            onClick={() => openCreateCampaign(brand._id)}
                            className="text-muted-foreground/30 hover:text-foreground transition-colors"
                            title="Add campaign"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {brandCampaigns.length === 0 && (
                        <div className="px-4 py-4 text-center">
                          <button
                            onClick={() => openCreateCampaign(brand._id)}
                            className="text-xs text-muted-foreground/40 hover:text-foreground transition-colors"
                          >
                            + Add first campaign
                          </button>
                        </div>
                      )}

                      {brandCampaigns.map((c) => {
                        const campStrategies = getStrategiesForCampaign(c._id);
                        return (
                          <div key={c._id}>
                            {/* Campaign row */}
                            <div className="group flex items-start gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors border-b border-border/30">
                              <div className="w-6 shrink-0" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <span className="text-xs font-medium">{c.name}</span>
                                {c.description && (
                                  <p className="text-[11px] text-muted-foreground/60 line-clamp-2">{c.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {c.platform && (
                                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] uppercase text-muted-foreground/60">{c.platform}</span>
                                  )}
                                  {c.campaign_goal && (
                                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] uppercase text-muted-foreground/60">{c.campaign_goal}</span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => openEditCampaign(c)}
                                className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all"
                                title="Edit campaign"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteCampaign(c._id)}
                                className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-destructive transition-all"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>

                            {/* Strategies sub-section under this campaign */}
                            <div className="px-4 py-1.5 border-b border-border/30 bg-muted/10">
                              <div className="flex items-center justify-between ml-12">
                                <div className="flex items-center gap-1.5">
                                  <Layers className="h-3 w-3 text-muted-foreground/40" />
                                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">Strategies</span>
                                </div>
                                <button
                                  onClick={() => openCreateStrategy(c._id)}
                                  className="text-muted-foreground/30 hover:text-foreground transition-colors"
                                  title="Add strategy"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {campStrategies.length === 0 && (
                              <div className="px-4 py-3 text-center bg-muted/10 border-b border-border/30">
                                <button
                                  onClick={() => openCreateStrategy(c._id)}
                                  className="text-xs text-muted-foreground/40 hover:text-foreground transition-colors"
                                >
                                  + Add first strategy
                                </button>
                              </div>
                            )}

                            {campStrategies.map((st) => (
                              <div
                                key={st._id}
                                className="group flex items-start gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors border-b border-border/20 bg-muted/10"
                              >
                                <div className="w-12 shrink-0" />
                                <div className="flex-1 min-w-0 space-y-1">
                                  <span className="text-xs font-medium">{st.name}</span>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {st.budget_amount != null && (
                                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground/60">
                                        ${st.budget_amount.toLocaleString()}{st.budget_type ? `/${st.budget_type}` : ''}
                                      </span>
                                    )}
                                    {st.performance_objective?.kpi && (
                                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] uppercase text-muted-foreground/60">
                                        {st.performance_objective.kpi}{st.performance_objective.value != null ? `: ${st.performance_objective.value}` : ''}
                                      </span>
                                    )}
                                    {st.audience_control?.location && st.audience_control.location.length > 0 && st.audience_control.location.map(l => (
                                      <span key={l} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground/60">{l}</span>
                                    ))}
                                  </div>
                                  {st.audience_control?.in_market_interests && st.audience_control.in_market_interests.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {st.audience_control.in_market_interests.map(i => (
                                        <span key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground/60">{i}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => openEditStrategy(st)}
                                  className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all"
                                  title="Edit strategy"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStrategy(st._id)}
                                  className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-destructive transition-all"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })}

                      {/* Audiences section */}
                      <div className="px-4 py-2 border-t border-border/50 border-b border-border/50">
                        <div className="flex items-center justify-between ml-6">
                          <div className="flex items-center gap-1.5">
                            <Target className="h-3 w-3 text-muted-foreground/40" />
                            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">Audiences</span>
                          </div>
                          <button
                            onClick={() => openAddAudience(brand._id)}
                            className="text-muted-foreground/30 hover:text-foreground transition-colors"
                            title="Add audience"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {brandAudiences.length === 0 && (
                        <div className="px-4 py-4 text-center">
                          <button
                            onClick={() => openAddAudience(brand._id)}
                            className="text-xs text-muted-foreground/40 hover:text-foreground transition-colors"
                          >
                            + Add first audience
                          </button>
                        </div>
                      )}

                      {brandAudiences.map((aud) => (
                        <div
                          key={aud._id}
                          className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors border-b border-border/30 last:border-b-0"
                        >
                          <div className="w-6 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium">{aud.name}</span>
                            {aud.description && (
                              <p className="text-[11px] text-muted-foreground/60 line-clamp-2">{aud.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteAudience(aud._id)}
                            className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}

                      {/* Assets section */}
                      <div className="px-4 py-2 border-t border-border/50 border-b border-border/50">
                        <div className="flex items-center justify-between ml-6">
                          <div className="flex items-center gap-1.5">
                            <Paperclip className="h-3 w-3 text-muted-foreground/40" />
                            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">Assets</span>
                          </div>
                          <button
                            onClick={() => openAddAsset(brand._id)}
                            className="text-muted-foreground/30 hover:text-foreground transition-colors"
                            title="Add asset"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {brandAssets.length === 0 && (
                        <div className="px-4 py-4 text-center">
                          <button
                            onClick={() => openAddAsset(brand._id)}
                            className="text-xs text-muted-foreground/40 hover:text-foreground transition-colors"
                          >
                            + Add first asset
                          </button>
                        </div>
                      )}

                      {brandAssets.map((ast) => (
                        <div
                          key={ast._id}
                          className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors border-b border-border/30 last:border-b-0"
                        >
                          <div className="w-6 shrink-0" />
                          {ast.asset_type === 'video' ? <Film className="h-3 w-3 shrink-0 text-muted-foreground/30" />
                            : ast.asset_type === 'image' || ast.asset_type === 'logo' ? <ImageIcon className="h-3 w-3 shrink-0 text-muted-foreground/30" />
                            : ast.asset_type === 'audio' ? <Music className="h-3 w-3 shrink-0 text-muted-foreground/30" />
                            : ast.asset_type === 'document' ? <FileText className="h-3 w-3 shrink-0 text-muted-foreground/30" />
                            : ast.asset_type === 'font' ? <TypeIcon className="h-3 w-3 shrink-0 text-muted-foreground/30" />
                            : <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground/30" />}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium">{ast.name}</span>
                            {ast.description && (
                              <p className="text-[11px] text-muted-foreground/60 line-clamp-2">{ast.description}</p>
                            )}
                          </div>
                          {ast.url && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); setViewingAsset(ast); }}
                                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
                                title="View"
                              >
                                <Eye className="h-3 w-3" />
                              </button>
                              <a
                                href={ast.url}
                                download={ast.file_name || ast.name}
                                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
                                title="Download"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download className="h-3 w-3" />
                              </a>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(ast.url!);
                                  setCopiedAssetId(ast._id);
                                  setTimeout(() => setCopiedAssetId(null), 2000);
                                }}
                                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
                                title="Copy URL"
                              >
                                {copiedAssetId === ast._id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteAsset(ast._id)}
                            className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* New brand button */}
            <button
              onClick={() => setShowCreateBrand(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-3 text-xs text-muted-foreground/40 hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Brand
            </button>
          </div>
        )}

        {/* Create Brand Dialog */}
        <Dialog open={showCreateBrand} onOpenChange={setShowCreateBrand}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base font-medium">New Brand</DialogTitle>
            </DialogHeader>
            {selectedOrgId ? (
              <div>
                {organizations.length > 1 && (
                  <div className="mb-4">
                    <Label className="text-xs">Organization</Label>
                    <select
                      value={selectedOrgId}
                      onChange={e => setSelectedOrgId(e.target.value)}
                      className="w-full mt-1 h-9 rounded-md border border-border bg-background px-3 text-sm"
                    >
                      {organizations.map(o => (
                        <option key={o._id} value={o._id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <BrandForm
                  organizationId={selectedOrgId}
                  onSubmit={handleCreateBrand}
                  onCancel={() => setShowCreateBrand(false)}
                  loading={creating}
                />
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">Create an organization first.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Brand Dialog */}
        <Dialog open={showEditBrand} onOpenChange={setShowEditBrand}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base font-medium">Edit Brand</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Brand Name *</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Website URL</Label>
                <Input value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="https://..." className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Product / Product Line</Label>
                <Input value={editProductName} onChange={e => setEditProductName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Industry</Label>
                <Input value={editIndustry} onChange={e => setEditIndustry(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Platforms (comma-separated)</Label>
                <Input value={editPlatforms} onChange={e => setEditPlatforms(e.target.value)} placeholder="shopify, instagram" className="mt-1" />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Button size="sm" onClick={handleSaveEditBrand} disabled={!editName.trim() || saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowEditBrand(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Campaign Dialog */}
        <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base font-medium">New Campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <Label htmlFor="camp-name" className="text-xs">Name</Label>
                <Input id="camp-name" value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g., Summer Sale 2026" required className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="camp-platform" className="text-xs">Platform</Label>
                  <select
                    id="camp-platform"
                    value={campaignPlatform}
                    onChange={e => setCampaignPlatform(e.target.value)}
                    className="w-full mt-1 h-9 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="x">X</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="pinterest">Pinterest</option>
                    <option value="snapchat">Snapchat</option>
                    <option value="reddit">Reddit</option>
                    <option value="threads">Threads</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                    <option value="discord">Discord</option>
                    <option value="twitch">Twitch</option>
                    <option value="bluesky">Bluesky</option>
                    <option value="google">Google</option>
                    <option value="vibe.co">Vibe.co</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="camp-goal" className="text-xs">Goal</Label>
                  <select
                    id="camp-goal"
                    value={campaignGoal}
                    onChange={e => setCampaignGoal(e.target.value)}
                    className="w-full mt-1 h-9 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="awareness">Awareness</option>
                    <option value="traffic">Traffic</option>
                    <option value="leads">Leads</option>
                    <option value="sales">Sales</option>
                    <option value="retargeting">Retargeting</option>
                    <option value="app_promotion">App Promotion</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="camp-desc" className="text-xs">Description</Label>
                <Textarea id="camp-desc" value={campaignDescription} onChange={e => setCampaignDescription(e.target.value)} placeholder="What is this campaign about?" rows={2} className="mt-1" />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" size="sm" disabled={!campaignName.trim() || creating}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateCampaign(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Audience Dialog */}
        <Dialog open={showAddAudience} onOpenChange={setShowAddAudience}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base font-medium">New Audience</DialogTitle>
            </DialogHeader>
            {selectedBrandId && (
              <AudienceForm
                brandId={selectedBrandId}
                onSubmit={handleCreateAudience}
                onCancel={() => setShowAddAudience(false)}
                loading={creating}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Create Strategy Dialog */}
        <Dialog open={showCreateStrategy} onOpenChange={setShowCreateStrategy}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base font-medium">New Strategy</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateStrategy} className="space-y-4">
              <div>
                <Label htmlFor="strat-name" className="text-xs">Name</Label>
                <Input id="strat-name" value={strategyName} onChange={e => setStrategyName(e.target.value)} placeholder="e.g., Broad Targeting" required className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="strat-budget" className="text-xs">Budget Amount</Label>
                  <Input id="strat-budget" type="number" step="0.01" value={strategyBudgetAmount} onChange={e => setStrategyBudgetAmount(e.target.value)} placeholder="1000" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="strat-budget-type" className="text-xs">Budget Type</Label>
                  <select
                    id="strat-budget-type"
                    value={strategyBudgetType}
                    onChange={e => setStrategyBudgetType(e.target.value)}
                    className="w-full mt-1 h-9 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="strat-kpi" className="text-xs">KPI</Label>
                  <Input id="strat-kpi" value={strategyKpi} onChange={e => setStrategyKpi(e.target.value)} placeholder="ROAS, CPA, CTR" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="strat-kpi-value" className="text-xs">KPI Target</Label>
                  <Input id="strat-kpi-value" type="number" step="0.01" value={strategyKpiValue} onChange={e => setStrategyKpiValue(e.target.value)} placeholder="4.0" className="mt-1" />
                </div>
              </div>
              <div>
                <Label htmlFor="strat-locations" className="text-xs">Locations (comma-separated)</Label>
                <Input id="strat-locations" value={strategyLocations} onChange={e => setStrategyLocations(e.target.value)} placeholder="US, UK, CA" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="strat-interests" className="text-xs">In-Market Interests (comma-separated)</Label>
                <Input id="strat-interests" value={strategyInterests} onChange={e => setStrategyInterests(e.target.value)} placeholder="e-commerce, DTC brands" className="mt-1" />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" size="sm" disabled={!strategyName.trim() || creating}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateStrategy(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Campaign Dialog */}
        <Dialog open={showEditCampaign} onOpenChange={setShowEditCampaign}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base font-medium">Edit Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={editCampaignName} onChange={e => setEditCampaignName(e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Platform</Label>
                  <select
                    value={editCampaignPlatform}
                    onChange={e => setEditCampaignPlatform(e.target.value)}
                    className="w-full mt-1 h-9 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="x">X</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="pinterest">Pinterest</option>
                    <option value="snapchat">Snapchat</option>
                    <option value="reddit">Reddit</option>
                    <option value="threads">Threads</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                    <option value="discord">Discord</option>
                    <option value="twitch">Twitch</option>
                    <option value="bluesky">Bluesky</option>
                    <option value="google">Google</option>
                    <option value="vibe.co">Vibe.co</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Goal</Label>
                  <select
                    value={editCampaignGoal}
                    onChange={e => setEditCampaignGoal(e.target.value)}
                    className="w-full mt-1 h-9 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="awareness">Awareness</option>
                    <option value="traffic">Traffic</option>
                    <option value="leads">Leads</option>
                    <option value="sales">Sales</option>
                    <option value="retargeting">Retargeting</option>
                    <option value="app_promotion">App Promotion</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={editCampaignDescription} onChange={e => setEditCampaignDescription(e.target.value)} rows={2} className="mt-1" />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Button size="sm" onClick={handleSaveEditCampaign} disabled={!editCampaignName.trim() || saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowEditCampaign(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Strategy Dialog */}
        <Dialog open={showEditStrategy} onOpenChange={setShowEditStrategy}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base font-medium">Edit Strategy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={editStrategyName} onChange={e => setEditStrategyName(e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Budget Amount</Label>
                  <Input type="number" step="0.01" value={editStrategyBudgetAmount} onChange={e => setEditStrategyBudgetAmount(e.target.value)} placeholder="1000" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Budget Type</Label>
                  <select
                    value={editStrategyBudgetType}
                    onChange={e => setEditStrategyBudgetType(e.target.value)}
                    className="w-full mt-1 h-9 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">KPI</Label>
                  <Input value={editStrategyKpi} onChange={e => setEditStrategyKpi(e.target.value)} placeholder="ROAS, CPA, CTR" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">KPI Target</Label>
                  <Input type="number" step="0.01" value={editStrategyKpiValue} onChange={e => setEditStrategyKpiValue(e.target.value)} placeholder="4.0" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Locations (comma-separated)</Label>
                <Input value={editStrategyLocations} onChange={e => setEditStrategyLocations(e.target.value)} placeholder="US, UK, CA" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">In-Market Interests (comma-separated)</Label>
                <Input value={editStrategyInterests} onChange={e => setEditStrategyInterests(e.target.value)} placeholder="e-commerce, DTC brands" className="mt-1" />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Button size="sm" onClick={handleSaveEditStrategy} disabled={!editStrategyName.trim() || saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowEditStrategy(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Asset Dialog */}
        <Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base font-medium">New Asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div>
                <Label htmlFor="asset-file" className="text-xs">Upload File</Label>
                <input
                  ref={fileInputRef}
                  id="asset-file"
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.svg,.ttf,.otf,.woff,.woff2"
                  onChange={e => {
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
                <Label htmlFor="asset-name" className="text-xs">Name</Label>
                <Input id="asset-name" value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g., Brand Logo, Product Photo" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="asset-type" className="text-xs">Type</Label>
                <select
                  id="asset-type"
                  value={assetType}
                  onChange={e => setAssetType(e.target.value)}
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
                  <Label htmlFor="asset-url" className="text-xs">URL (or upload file above)</Label>
                  <Input id="asset-url" value={assetUrl} onChange={e => setAssetUrl(e.target.value)} placeholder="https://..." className="mt-1" />
                </div>
              )}
              <div>
                <Label htmlFor="asset-desc" className="text-xs">Description</Label>
                <Textarea id="asset-desc" value={assetDescription} onChange={e => setAssetDescription(e.target.value)} placeholder="What is this asset?" rows={2} className="mt-1" />
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
                <Button type="submit" size="sm" disabled={(!assetName.trim() && !assetFile) || creating}>
                  {creating ? 'Uploading...' : assetFile ? 'Upload' : 'Create'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddAsset(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Asset Modal */}
        <Dialog open={!!viewingAsset} onOpenChange={(open) => { if (!open) setViewingAsset(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-medium">{viewingAsset?.name}</DialogTitle>
            </DialogHeader>
            {viewingAsset?.url && (
              <div className="space-y-3">
                <div className="flex items-center justify-center rounded-lg bg-muted/30 overflow-hidden">
                  {viewingAsset.asset_type === 'video' || viewingAsset.content_type?.startsWith('video/') ? (
                    <video
                      src={viewingAsset.url}
                      controls
                      className="max-h-[60vh] w-full rounded-lg"
                    />
                  ) : viewingAsset.asset_type === 'image' || viewingAsset.asset_type === 'logo' || viewingAsset.content_type?.startsWith('image/') ? (
                    <img
                      src={viewingAsset.url}
                      alt={viewingAsset.name}
                      className="max-h-[60vh] object-contain rounded-lg"
                    />
                  ) : viewingAsset.content_type === 'application/pdf' ? (
                    <iframe src={viewingAsset.url} className="w-full h-[60vh] rounded-lg" />
                  ) : (
                    <div className="py-12 text-center">
                      <Paperclip className="h-8 w-8 mx-auto text-muted-foreground/30" />
                      <p className="mt-2 text-sm text-muted-foreground">Preview not available</p>
                    </div>
                  )}
                </div>
                {viewingAsset.description && (
                  <p className="text-xs text-muted-foreground">{viewingAsset.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <a
                    href={viewingAsset.url}
                    download={viewingAsset.file_name || viewingAsset.name}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Download className="h-3 w-3" /> Download
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(viewingAsset.url!);
                      setCopiedAssetId(viewingAsset._id);
                      setTimeout(() => setCopiedAssetId(null), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedAssetId === viewingAsset._id ? <><Check className="h-3 w-3 text-green-500" /> Copied</> : <><Copy className="h-3 w-3" /> Copy URL</>}
                  </button>
                  {viewingAsset.file_name && (
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground/40">{viewingAsset.file_name}</span>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
