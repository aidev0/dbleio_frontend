"use client";

import { useState, useEffect } from 'react';
import { Loader2, Check, Megaphone, Layers, Film, LayoutGrid } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getStrategies, getAudiences } from '../../brands/lib/api';
import type { Campaign } from '../lib/api';
import type { Strategy, Audience } from '../../brands/lib/types';

interface CreateContentWorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId?: string;
  campaigns: Campaign[];
  selectedCampaignId?: string;
  onSubmit: (data: {
    title: string;
    description?: string;
    content_type?: string;
    campaign_id?: string;
    strategy_ids?: string[];
    audience_ids?: string[];
  }) => void | Promise<void>;
}

function MultiSelectList<T extends { _id: string; name: string }>({
  items,
  selectedIds,
  onToggle,
  emptyMessage,
}: {
  items: T[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground/50 py-2">{emptyMessage}</p>;
  }
  return (
    <div className="max-h-36 overflow-y-auto rounded-md border border-border divide-y divide-border">
      {items.map((item) => {
        const selected = selectedIds.includes(item._id);
        return (
          <button
            key={item._id}
            type="button"
            onClick={() => onToggle(item._id)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${
              selected ? 'bg-muted/30' : ''
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                selected
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border'
              }`}
            >
              {selected && <Check className="h-3 w-3" />}
            </span>
            <span className="truncate">{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function CreateContentWorkflowModal({
  open,
  onOpenChange,
  brandId,
  campaigns,
  selectedCampaignId: initialCampaignId,
  onSubmit,
}: CreateContentWorkflowModalProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<string | undefined>();
  const [campaignId, setCampaignId] = useState<string | undefined>();
  const [strategyIds, setStrategyIds] = useState<string[]>([]);
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loadingStrategies, setLoadingStrategies] = useState(false);
  const [loadingAudiences, setLoadingAudiences] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Campaign & strategy details for step 1 display
  const [contextStrategies, setContextStrategies] = useState<Strategy[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);

  // Load context campaign details (for step 1 read-only display)
  useEffect(() => {
    if (!initialCampaignId) { setContextStrategies([]); return; }
    setLoadingContext(true);
    getStrategies(initialCampaignId)
      .then(setContextStrategies)
      .catch(() => setContextStrategies([]))
      .finally(() => setLoadingContext(false));
  }, [initialCampaignId]);

  const contextCampaign = campaigns.find((c) => c._id === initialCampaignId);

  // Load strategies when selected campaign changes (step 2)
  useEffect(() => {
    if (!campaignId) {
      setStrategies([]);
      setStrategyIds([]);
      return;
    }
    setLoadingStrategies(true);
    setStrategyIds([]);
    getStrategies(campaignId)
      .then(setStrategies)
      .catch(() => setStrategies([]))
      .finally(() => setLoadingStrategies(false));
  }, [campaignId]);

  // Load audiences for the chosen campaign (filter by campaign_id or unassigned)
  useEffect(() => {
    if (!campaignId || !brandId) { setAudiences([]); setAudienceIds([]); return; }
    setLoadingAudiences(true);
    setAudienceIds([]);
    getAudiences(brandId)
      .then((all) => setAudiences(all.filter((a) => !a.campaign_id || a.campaign_id === campaignId)))
      .catch(() => setAudiences([]))
      .finally(() => setLoadingAudiences(false));
  }, [campaignId, brandId]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setTitle('');
      setDescription('');
      setContentType(undefined);
      setCampaignId(initialCampaignId);
      setStrategyIds([]);
      setAudienceIds([]);
      setStrategies([]);
    }
  }, [open, initialCampaignId]);

  const toggleId = (ids: string[], setIds: (v: string[]) => void, id: string) => {
    setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        content_type: contentType,
        campaign_id: campaignId,
        strategy_ids: strategyIds.length > 0 ? strategyIds : undefined,
        audience_ids: audienceIds.length > 0 ? audienceIds : undefined,
      });
      onOpenChange(false);
    } catch {
      // parent handles error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'New Content Workflow' : 'Campaign, Strategy & Audience'}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Describe the content you want to create.'
              : 'Optionally link campaigns, strategies, and audiences.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Summer campaign video series"
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Description
                <span className="text-muted-foreground/50 ml-1">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the content..."
                rows={3}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground transition-colors resize-none"
              />
            </div>

            {/* Content Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Content Type
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'reel', label: 'Reel', icon: Film },
                  { id: 'carousel', label: 'Carousel', icon: LayoutGrid },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setContentType(contentType === id ? undefined : id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                      contentType === id
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:border-foreground/40'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign & Strategy Details */}
            {contextCampaign && (
              <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                {/* Campaign info */}
                <div className="flex items-start gap-2 px-3 py-2.5 border-b border-border/50">
                  <Megaphone className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="text-xs font-semibold">{contextCampaign.name}</span>
                    {contextCampaign.description && (
                      <p className="text-[11px] text-muted-foreground/60 line-clamp-2">{contextCampaign.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {contextCampaign.platform && (
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] uppercase text-muted-foreground/60">{contextCampaign.platform}</span>
                      )}
                      {contextCampaign.campaign_goal && (
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] uppercase text-muted-foreground/60">{contextCampaign.campaign_goal}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Strategies */}
                {loadingContext ? (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Loading strategies...</span>
                  </div>
                ) : contextStrategies.length > 0 ? (
                  <div className="divide-y divide-border/30">
                    <div className="px-3 py-1.5 flex items-center gap-1.5">
                      <Layers className="h-3 w-3 text-muted-foreground/40" />
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">Strategies</span>
                    </div>
                    {contextStrategies.map((st) => (
                      <div key={st._id} className="px-3 py-2 pl-7 space-y-1">
                        <span className="text-[11px] font-medium">{st.name}</span>
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
                          {st.audience_control?.location?.map((l) => (
                            <span key={l} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground/60">{l}</span>
                          ))}
                          {st.audience_control?.in_market_interests?.map((i) => (
                            <span key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground/60">{i}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-2 text-[10px] text-muted-foreground/40">
                    No strategies for this campaign.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Campaign
                <span className="text-muted-foreground/50 ml-1">(optional)</span>
              </label>
              {campaigns.length > 0 ? (
                <Select value={campaignId} onValueChange={setCampaignId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a campaign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground/50 py-2">
                  No campaigns for this brand yet.
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Strategies
                <span className="text-muted-foreground/50 ml-1">(optional)</span>
              </label>
              {!campaignId ? (
                <p className="text-xs text-muted-foreground/50 py-2">
                  Select a campaign first to see strategies.
                </p>
              ) : loadingStrategies ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <MultiSelectList
                  items={strategies}
                  selectedIds={strategyIds}
                  onToggle={(id) => toggleId(strategyIds, setStrategyIds, id)}
                  emptyMessage="No strategies for this campaign."
                />
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Audiences
                <span className="text-muted-foreground/50 ml-1">(optional)</span>
              </label>
              {!campaignId ? (
                <p className="text-xs text-muted-foreground/50 py-2">
                  Select a campaign first to see audiences.
                </p>
              ) : loadingAudiences ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <MultiSelectList
                  items={audiences}
                  selectedIds={audienceIds}
                  onToggle={(id) => toggleId(audienceIds, setAudienceIds, id)}
                  emptyMessage="No audiences for this campaign."
                />
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="mr-auto font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Back
            </button>
          )}
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!title.trim()}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-40 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-40 transition-colors flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
