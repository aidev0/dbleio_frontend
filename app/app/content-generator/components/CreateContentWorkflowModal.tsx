"use client";

import { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
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
  onSubmit: (data: {
    title: string;
    description?: string;
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
  onSubmit,
}: CreateContentWorkflowModalProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [campaignId, setCampaignId] = useState<string | undefined>();
  const [strategyIds, setStrategyIds] = useState<string[]>([]);
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loadingStrategies, setLoadingStrategies] = useState(false);
  const [loadingAudiences, setLoadingAudiences] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load strategies when selected campaign changes
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
      setCampaignId(undefined);
      setStrategyIds([]);
      setAudienceIds([]);
      setStrategies([]);
    }
  }, [open]);

  const toggleId = (ids: string[], setIds: (v: string[]) => void, id: string) => {
    setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
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
