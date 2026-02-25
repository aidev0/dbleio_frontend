"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2, Play, Heart, MessageCircle, Eye, Film,
  BadgeCheck, TrendingUp, ChevronDown, ChevronUp,
  Sparkles, Globe, BarChart3, Users, DollarSign,
  Search, Zap, ImageIcon,
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  runResearch,
  getResearchStatus,
  getResearchResults,
  analyzeVideo,
  analyzeBrandUrl,
  getFinancialData,
  extractAssets,
} from "../lib/research-api";
import type {
  ResearchData,
  ResearchTopPerformer,
  ResearchVideoAI,
  ResearchTrendPoint,
  ResearchBrandUrlAnalysis,
  ResearchFinancialData,
  ResearchInstagramData,
} from "../lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function proxyUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.includes("cdninstagram.com") || url.includes("fbcdn.net")) {
    return `${API_URL}/api/instagram/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function formatCount(n: number | undefined | null): string {
  if (n == null) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

// ---------------------------------------------------------------------------
// Grid Thumbnail
// ---------------------------------------------------------------------------

function GridThumbnail({
  item,
  onClick,
}: {
  item: ResearchTopPerformer;
  onClick: () => void;
}) {
  const thumb = item.displayUrl;
  return (
    <button
      className="relative overflow-hidden group cursor-pointer bg-muted rounded-sm"
      style={{ aspectRatio: "9/16" }}
      onClick={onClick}
    >
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={proxyUrl(thumb)} alt="" className="w-full h-full object-cover" loading="lazy" />
      )}
      <div className="absolute top-1.5 right-1.5 text-white drop-shadow-md">
        <Play className="h-4 w-4 fill-white" />
      </div>
      <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
        {item.engagement_score.toFixed(2)}
      </div>
      {item.ai_analysis && !item.ai_analysis.error && (
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-purple-600/80 text-white text-[8px] px-1 py-0.5 rounded">
          <Sparkles className="h-2.5 w-2.5 inline mr-0.5" />AI
        </div>
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white text-xs font-semibold">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 fill-white" />{formatCount(item.likesCount)}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5 fill-white" />{formatCount(item.commentsCount)}</span>
          {item.videoPlayCount > 0 && (
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{formatCount(item.videoPlayCount)}</span>
          )}
        </div>
      </div>
      {item.timestamp && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">
          {new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Detail Modal — play video, show stats, AI analysis
// ---------------------------------------------------------------------------

function DetailModal({
  item,
  open,
  onClose,
  onAnalyze,
  analyzing,
}: {
  item: ResearchTopPerformer | null;
  open: boolean;
  onClose: () => void;
  onAnalyze: (videoUrl: string) => void;
  analyzing: boolean;
}) {
  const [showAI, setShowAI] = useState(true);
  if (!item) return null;
  const videoUrl = item.videoUrl;
  const thumb = item.displayUrl;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            Reel
            <span className="text-muted-foreground font-normal font-mono text-xs">
              score {item.engagement_score.toFixed(2)}
            </span>
          </DialogTitle>
        </DialogHeader>

        {videoUrl ? (
          <div className="relative rounded-md overflow-hidden bg-black" style={{ minHeight: 300 }}>
            <video
              key={proxyUrl(videoUrl)}
              src={proxyUrl(videoUrl)}
              controls
              autoPlay
              playsInline
              poster={proxyUrl(thumb)}
              className="absolute inset-0 w-full h-full rounded-md"
              style={{ objectFit: "contain" }}
            />
          </div>
        ) : thumb ? (
          <div className="flex justify-center rounded-md overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proxyUrl(thumb)} alt="" className="max-w-full rounded-md mx-auto" style={{ maxHeight: "50vh", objectFit: "contain" }} />
          </div>
        ) : null}

        <div className="flex gap-5 text-sm py-2">
          <span className="flex items-center gap-1.5"><Heart className="h-4 w-4" /> {formatCount(item.likesCount)}</span>
          <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> {formatCount(item.commentsCount)}</span>
          {item.videoPlayCount > 0 && <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" /> {formatCount(item.videoPlayCount)}</span>}
        </div>

        {item.caption && <p className="text-sm whitespace-pre-line line-clamp-6">{item.caption}</p>}

        {videoUrl && !item.ai_analysis && (
          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => onAnalyze(videoUrl)} disabled={analyzing}>
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI Video Analysis
          </Button>
        )}

        {item.ai_analysis && !item.ai_analysis.error && (
          <div className="border-t pt-2">
            <button className="flex items-center gap-1.5 text-xs text-primary hover:underline w-full" onClick={() => setShowAI(!showAI)}>
              <Sparkles className="h-3.5 w-3.5" />
              AI Understanding
              {showAI ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
            </button>
            {showAI && <AIDetail analysis={item.ai_analysis} />}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>{item.timestamp ? new Date(item.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : ""}</span>
          {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View on Instagram</a>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// AI Analysis Detail — shows all 16 extracted features
// ---------------------------------------------------------------------------

function AIDetail({ analysis }: { analysis: ResearchVideoAI }) {
  return (
    <div className="mt-2 space-y-2 text-xs">
      {analysis.hook_type && (
        <div><span className="text-muted-foreground">Hook:</span> <span className="font-medium">{analysis.hook_type}</span> — {analysis.hook_text}</div>
      )}
      {analysis.hook_effectiveness && (
        <div><span className="text-muted-foreground">Hook Effectiveness:</span> {analysis.hook_effectiveness}</div>
      )}
      {analysis.content_format && (
        <div><span className="text-muted-foreground">Format:</span> {analysis.content_format}</div>
      )}
      {analysis.duration != null && (
        <div><span className="text-muted-foreground">Duration:</span> {analysis.duration}s · {analysis.num_scenes} scenes · {analysis.pacing} pacing</div>
      )}
      {analysis.characters && analysis.characters.length > 0 && (
        <div>
          <span className="text-muted-foreground">Characters:</span>
          <ul className="list-disc list-inside ml-1 mt-0.5">
            {analysis.characters.map((c, i) => (
              <li key={i}>{c.gender}, {c.age_range} — {c.description}</li>
            ))}
          </ul>
        </div>
      )}
      {analysis.textures && analysis.textures.length > 0 && (
        <div><span className="text-muted-foreground">Textures:</span> {analysis.textures.join(", ")}</div>
      )}
      {analysis.objects && analysis.objects.length > 0 && (
        <div><span className="text-muted-foreground">Objects:</span> {analysis.objects.join(", ")}</div>
      )}
      {analysis.colors && analysis.colors.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Colors:</span>
          {analysis.colors.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-0.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-border" style={{ backgroundColor: c.startsWith("#") ? c : undefined }} />
              {c}
            </span>
          ))}
        </div>
      )}
      {analysis.music_mood && (
        <div><span className="text-muted-foreground">Music:</span> {analysis.music_mood}</div>
      )}
      {analysis.cta && (
        <div><span className="text-muted-foreground">CTA:</span> {analysis.cta}</div>
      )}
      {analysis.transcription && (
        <div><span className="text-muted-foreground">Transcription:</span> <span className="italic">&quot;{analysis.transcription.slice(0, 300)}{analysis.transcription.length > 300 ? "…" : ""}&quot;</span></div>
      )}
      {analysis.success_factors && analysis.success_factors.length > 0 && (
        <div>
          <span className="text-muted-foreground">Success factors:</span>
          <ul className="list-disc list-inside ml-1 mt-0.5">
            {analysis.success_factors.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
      {analysis.improvement_suggestions && analysis.improvement_suggestions.length > 0 && (
        <div>
          <span className="text-muted-foreground">Improvements:</span>
          <ul className="list-disc list-inside ml-1 mt-0.5">
            {analysis.improvement_suggestions.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface BrandData {
  username: string;
  followers: number;
  total_reels: number;
  top_count: number;
  top_performers: ResearchTopPerformer[];
  profilePicUrl?: string;
  fullName?: string;
  biography?: string;
  verified?: boolean;
}

// ---------------------------------------------------------------------------
// Combined Competitive Analysis Chart (Recharts)
// ---------------------------------------------------------------------------

function CompetitiveAnalysisChart({
  brandTrends,
  competitorTrends,
  brandUsername,
  competitorUsername,
  brandFollowers,
  competitorFollowers,
}: {
  brandTrends: ResearchTrendPoint[];
  competitorTrends: ResearchTrendPoint[];
  brandUsername: string;
  competitorUsername: string;
  brandFollowers: number;
  competitorFollowers: number;
}) {
  const [activeMetric, setActiveMetric] = useState<"views" | "likes" | "comments" | "likesPerView">("views");

  if ((!brandTrends || brandTrends.length < 2) && (!competitorTrends || competitorTrends.length < 2)) return null;

  // Merge both trend datasets by date
  const dateMap = new Map<string, Record<string, number>>();
  for (const d of brandTrends || []) {
    const existing = dateMap.get(d.date) || {};
    dateMap.set(d.date, {
      ...existing,
      brandViews: d.views, brandLikes: d.likes, brandComments: d.comments,
      brandLikesPerView: d.views > 0 ? (d.likes / d.views) * 100 : 0,
    });
  }
  for (const d of competitorTrends || []) {
    const existing = dateMap.get(d.date) || {};
    dateMap.set(d.date, {
      ...existing,
      compViews: d.views, compLikes: d.likes, compComments: d.comments,
      compLikesPerView: d.views > 0 ? (d.likes / d.views) * 100 : 0,
    });
  }

  const merged = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => {
      const d = new Date(date + "T00:00:00");
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      return { date, dateLabel: label, ...vals };
    });

  const fmtK = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v % 1 === 0 ? String(v) : v.toFixed(1);
  };

  const metricConfig = {
    views:        { brandKey: "brandViews",        compKey: "compViews",        label: "Views",        unit: "",  fmt: fmtK },
    likes:        { brandKey: "brandLikes",        compKey: "compLikes",        label: "Likes",        unit: "",  fmt: fmtK },
    comments:     { brandKey: "brandComments",     compKey: "compComments",     label: "Comments",     unit: "",  fmt: fmtK },
    likesPerView: { brandKey: "brandLikesPerView", compKey: "compLikesPerView", label: "Likes / Views", unit: "%", fmt: (v: number) => `${v.toFixed(2)}%` },
  };

  const cfg = metricConfig[activeMetric];

  const tabs: { key: typeof activeMetric; label: string }[] = [
    { key: "views", label: "Views" },
    { key: "likes", label: "Likes" },
    { key: "comments", label: "Comments" },
    { key: "likesPerView", label: "Likes/Views %" },
  ];

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header with followers */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Competitive Analysis
        </div>
        <div className="flex gap-4 text-xs">
          <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: "#7c3aed" }} />@{brandUsername} — <strong>{formatCount(brandFollowers)}</strong> followers</span>
          <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: "#2563eb" }} />@{competitorUsername} — <strong>{formatCount(competitorFollowers)}</strong> followers</span>
        </div>
      </div>

      {/* Metric tabs */}
      <div className="flex gap-1 border rounded-lg p-0.5 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeMetric === t.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
            onClick={() => setActiveMetric(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={merged} margin={{ top: 10, right: 20, bottom: 60, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(val: string) => {
                const d = new Date(val + "T00:00:00");
                return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
              }}
              interval={Math.max(0, Math.floor(merged.length / 7))}
              height={35}
            />
            <YAxis
              tickFormatter={cfg.fmt}
              tick={{ fontSize: 10 }}
              width={50}
              label={{ value: `${cfg.label}${cfg.unit ? ` (${cfg.unit})` : ""}`, angle: -90, position: "insideLeft", offset: -48, style: { fontSize: 10, fill: "#888", textAnchor: "middle" } }}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(value: number, name: string) => [cfg.fmt(value), name]}
              labelFormatter={(l) => `Date: ${l}`}
            />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 12, paddingRight: 10 }} />
            <Line type="monotone" dataKey={cfg.brandKey} name={`@${brandUsername}`} stroke="#7c3aed" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey={cfg.compKey} name={`@${competitorUsername}`} stroke="#2563eb" strokeWidth={2} dot={false} connectNulls strokeDasharray="6 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brand URL Analysis Card
// ---------------------------------------------------------------------------

function BrandUrlCard({ data }: { data: ResearchBrandUrlAnalysis }) {
  if (data.error) return <div className="text-xs text-red-500">{data.error}</div>;
  return (
    <div className="space-y-2 text-xs">
      {data.url && <div className="text-muted-foreground font-mono truncate">{data.url}</div>}
      {data.products && data.products.length > 0 && (
        <div>
          <span className="text-muted-foreground font-medium">Products:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {data.products.map((p, i) => (
              <span key={i} className="bg-muted px-2 py-0.5 rounded text-[11px]">{p}</span>
            ))}
          </div>
        </div>
      )}
      {data.style && <div><span className="text-muted-foreground">Style:</span> {data.style}</div>}
      {data.target_audience && <div><span className="text-muted-foreground">Target:</span> {data.target_audience}</div>}
      {data.brand_voice && <div><span className="text-muted-foreground">Voice:</span> {data.brand_voice}</div>}
      {data.colors && data.colors.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Colors:</span>
          {data.colors.map((c, i) => (
            <span key={i} className="inline-block w-4 h-4 rounded border border-border" style={{ backgroundColor: c }} title={c} />
          ))}
        </div>
      )}
      {data.fonts && data.fonts.length > 0 && (
        <div><span className="text-muted-foreground">Fonts:</span> {data.fonts.join(", ")}</div>
      )}
      {data.key_messaging && data.key_messaging.length > 0 && (
        <div>
          <span className="text-muted-foreground">Messaging:</span>
          <ul className="list-disc list-inside mt-0.5">{data.key_messaging.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Financial Data Card
// ---------------------------------------------------------------------------

function FinancialCard({ data, name }: { data: ResearchFinancialData; name: string }) {
  if (data.error) return <div className="text-xs text-red-500">{data.error}</div>;
  return (
    <div className="space-y-1.5 text-xs">
      <div className="font-medium">{data.company_name || name}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {data.revenue && <div><span className="text-muted-foreground">Revenue:</span> {data.revenue}</div>}
        {data.revenue_yoy_growth && <div><span className="text-muted-foreground">YoY:</span> {data.revenue_yoy_growth}</div>}
        {data.active_subscribers && <div><span className="text-muted-foreground">Subscribers:</span> {data.active_subscribers}</div>}
        {data.market_cap && <div><span className="text-muted-foreground">Market Cap:</span> {data.market_cap}</div>}
        {data.stock_price && <div><span className="text-muted-foreground">Stock:</span> {data.stock_price}</div>}
      </div>
      {data.recent_highlights && data.recent_highlights.length > 0 && (
        <div>
          <span className="text-muted-foreground">Highlights:</span>
          <ul className="list-disc list-inside mt-0.5">{data.recent_highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Research Assets — extracted frames + AI pattern summary
// ---------------------------------------------------------------------------

function ResearchAssetsPanel({
  allPerformers,
}: {
  allPerformers: ResearchTopPerformer[];
}) {
  const [showAll, setShowAll] = useState(false);

  // Collect all extracted frames
  const frames: { url: string; shortCode: string; score: number; frameIdx: number }[] = [];
  for (const p of allPerformers) {
    if (p.extracted_frames) {
      for (const f of p.extracted_frames) {
        if (f.signed_url) {
          frames.push({ url: f.signed_url, shortCode: p.shortCode || "?", score: p.engagement_score, frameIdx: f.frame_index });
        }
      }
    }
  }

  // Aggregate AI patterns
  const analyzed = allPerformers.filter(p => p.ai_analysis && !p.ai_analysis?.error);
  const hookCounts: Record<string, number> = {};
  const formatCounts: Record<string, number> = {};
  const colorCounts: Record<string, number> = {};
  const textureCounts: Record<string, number> = {};
  const objectCounts: Record<string, number> = {};
  const musicCounts: Record<string, number> = {};

  for (const p of analyzed) {
    const ai = p.ai_analysis!;
    if (ai.hook_type) hookCounts[ai.hook_type] = (hookCounts[ai.hook_type] || 0) + 1;
    if (ai.content_format) formatCounts[ai.content_format] = (formatCounts[ai.content_format] || 0) + 1;
    if (ai.colors) for (const c of ai.colors) colorCounts[c] = (colorCounts[c] || 0) + 1;
    if (ai.textures) for (const t of ai.textures) textureCounts[t] = (textureCounts[t] || 0) + 1;
    if (ai.objects) for (const o of ai.objects) objectCounts[o] = (objectCounts[o] || 0) + 1;
    if (ai.music_mood) musicCounts[ai.music_mood] = (musicCounts[ai.music_mood] || 0) + 1;
  }

  const sortedEntries = (counts: Record<string, number>) =>
    Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (frames.length === 0 && analyzed.length === 0) return null;

  const displayFrames = showAll ? frames : frames.slice(0, 16);

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
        Research Assets
        <span className="text-xs text-muted-foreground font-normal ml-auto">
          {frames.length} frames · {analyzed.length} AI analyzed
        </span>
      </div>

      {/* Extracted frames grid */}
      {frames.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">Extracted Frames</div>
          <div className="grid grid-cols-8 gap-1">
            {displayFrames.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={f.url}
                alt={`${f.shortCode} frame ${f.frameIdx}`}
                className="w-full aspect-video object-cover rounded-sm"
                loading="lazy"
              />
            ))}
          </div>
          {frames.length > 16 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground mt-1"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Show less" : `Show all ${frames.length} frames`}
            </button>
          )}
        </div>
      )}

      {/* AI Pattern Summary */}
      {analyzed.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {sortedEntries(hookCounts).length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Hook Types</div>
              <div className="flex flex-wrap gap-1">
                {sortedEntries(hookCounts).slice(0, 6).map(([h, c]) => (
                  <span key={h} className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded text-[10px]">
                    {h} <span className="opacity-60">({c})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {sortedEntries(formatCounts).length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Formats</div>
              <div className="flex flex-wrap gap-1">
                {sortedEntries(formatCounts).slice(0, 6).map(([f, c]) => (
                  <span key={f} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px]">
                    {f} <span className="opacity-60">({c})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {sortedEntries(colorCounts).length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Colors</div>
              <div className="flex flex-wrap gap-1">
                {sortedEntries(colorCounts).slice(0, 8).map(([color, c]) => (
                  <span key={color} className="inline-flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-[10px]">
                    <span className="w-2 h-2 rounded-full border" style={{ backgroundColor: color }} />
                    {color} <span className="opacity-60">({c})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {sortedEntries(textureCounts).length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Textures</div>
              <div className="flex flex-wrap gap-1">
                {sortedEntries(textureCounts).slice(0, 6).map(([t, c]) => (
                  <span key={t} className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                    {t} <span className="opacity-60">({c})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {sortedEntries(objectCounts).length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Objects</div>
              <div className="flex flex-wrap gap-1">
                {sortedEntries(objectCounts).slice(0, 8).map(([o, c]) => (
                  <span key={o} className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded text-[10px]">
                    {o} <span className="opacity-60">({c})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {sortedEntries(musicCounts).length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Music</div>
              <div className="flex flex-wrap gap-1">
                {sortedEntries(musicCounts).slice(0, 5).map(([m, c]) => (
                  <span key={m} className="bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 px-1.5 py-0.5 rounded text-[10px]">
                    {m} <span className="opacity-60">({c})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reel Column — profile + stats + grid
// ---------------------------------------------------------------------------

function ReelColumn({
  data,
  onItemClick,
  label,
}: {
  data: BrandData;
  onItemClick: (item: ResearchTopPerformer) => void;
  label?: string;
}) {
  return (
    <div className="border rounded-lg bg-background overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
      {/* Profile header */}
      <div className="p-4 space-y-2.5">
        {label && <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={proxyUrl(data.profilePicUrl)} alt={data.username} />
            <AvatarFallback>{data.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm truncate">@{data.username}</span>
              {data.verified && <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">{data.fullName}</p>
          </div>
        </div>

        <div className="flex gap-4 text-xs">
          <div><span className="font-semibold">{formatCount(data.followers)}</span> <span className="text-muted-foreground">followers</span></div>
          <div><span className="font-semibold">{formatCount(data.total_reels)}</span> <span className="text-muted-foreground">reels</span></div>
          <div><span className="font-semibold text-primary">{data.top_count}</span> <span className="text-muted-foreground">top 20%</span></div>
        </div>

        {data.biography && <p className="text-xs text-muted-foreground line-clamp-2">{data.biography}</p>}
      </div>

      {/* Label */}
      <div className="sticky top-0 z-10 bg-background px-4 pb-2">
        <div className="flex items-center gap-2 py-1.5 border-b border-border">
          <Film className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Top 20% Reels</span>
          <span className="text-[10px] text-muted-foreground ml-auto">{data.top_count} reels</span>
        </div>
      </div>

      {/* Grid */}
      <div className="px-1.5 pb-1.5">
        <div className="grid grid-cols-3 gap-1.5">
          {data.top_performers.map((item) => (
            <GridThumbnail key={item.id} item={item} onClick={() => onItemClick(item)} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT — Side-by-side Brand vs Competitor
// ============================================================

interface ResearchStagePanelProps {
  workflowId: string;
  getSetting: (stage: string, key: string) => unknown;
  updateStageSetting: (stage: string, key: string, value: unknown) => void;
}

export default function ResearchStagePanel({
  workflowId,
}: ResearchStagePanelProps) {
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalItem, setModalItem] = useState<ResearchTopPerformer | null>(null);
  const [analyzingVideoUrl, setAnalyzingVideoUrl] = useState<string | null>(null);

  // Profiles from instagram_profiles collection
  const [profiles, setProfiles] = useState<Record<string, { profilePicUrl?: string; fullName?: string; biography?: string; verified?: boolean }>>({});

  // Background task
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [runProgress, setRunProgress] = useState(0);
  const [runMessage, setRunMessage] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AI analysis loop
  const [aiLoopRunning, setAiLoopRunning] = useState(false);
  const [aiLoopProgress, setAiLoopProgress] = useState({ current: 0, total: 0, label: "" });
  const aiLoopCancelledRef = useRef(false);

  // --- Load research data + profiles on mount ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await getResearchResults(workflowId);
        if (!cancelled && results && Object.keys(results).length > 0) {
          setResearchData(results as unknown as ResearchData);
        }
        const res = await fetch(`${API_URL}/api/instagram/profiles`);
        if (res.ok) {
          const profileList = await res.json();
          const map: typeof profiles = {};
          for (const p of profileList) {
            map[p.username] = { profilePicUrl: p.profilePicUrl, fullName: p.fullName, biography: p.biography, verified: p.verified };
          }
          if (!cancelled) setProfiles(map);
        }
      } catch { /* ok */ } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [workflowId]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // --- Poll task status ---
  const startPolling = useCallback((taskId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const status = await getResearchStatus(workflowId, taskId) as { status: string; progress?: number; message?: string };
        setRunProgress(status.progress || 0);
        setRunMessage(status.message || "");
        if (status.status === "completed" || status.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setRunningTaskId(null);
          if (status.status === "completed") {
            const results = await getResearchResults(workflowId);
            setResearchData(results as unknown as ResearchData);
          }
        }
      } catch { /* */ }
    }, 2000);
  }, [workflowId]);

  // --- Run full research ---
  const handleRun = async () => {
    setRunProgress(0);
    setRunMessage("Starting...");
    try {
      const { task_id } = await runResearch(workflowId, {
        brand_username: "stitchfix",
        competitor_usernames: ["renttherunway"],
        financial_companies: ["Stitch Fix", "Rent The Runway"],
      });
      setRunningTaskId(task_id);
      startPolling(task_id);
    } catch (err) {
      console.error("Run research failed:", err);
      setRunMessage("Failed to start");
    }
  };

  // --- Analyze a single video ---
  const handleAnalyzeVideo = async (videoUrl: string) => {
    setAnalyzingVideoUrl(videoUrl);
    try {
      const result = await analyzeVideo(workflowId, videoUrl);
      setResearchData(prev => {
        if (!prev) return prev;
        const patch = (performers: ResearchTopPerformer[]) =>
          performers.map(p => p.videoUrl === videoUrl ? { ...p, ai_analysis: result as unknown as ResearchVideoAI } : p);
        const updated = { ...prev };
        if (updated.brand_instagram?.top_performers) {
          updated.brand_instagram = { ...updated.brand_instagram, top_performers: patch(updated.brand_instagram.top_performers) };
        }
        if (updated.competitor_instagram) {
          const ci = { ...updated.competitor_instagram };
          for (const key of Object.keys(ci)) {
            if (ci[key]?.top_performers) {
              ci[key] = { ...ci[key], top_performers: patch(ci[key].top_performers) };
            }
          }
          updated.competitor_instagram = ci;
        }
        return updated;
      });
      setModalItem(prev => prev?.videoUrl === videoUrl ? { ...prev, ai_analysis: result as unknown as ResearchVideoAI } : prev);
    } catch (err) {
      console.error("Video analysis failed:", err);
    } finally {
      setAnalyzingVideoUrl(null);
    }
  };

  // --- Build column data ---
  const brandIG = researchData?.brand_instagram;
  const competitors = researchData?.competitor_instagram || {};
  const trends = researchData?.trends || {};
  const brandUrlAnalysis = researchData?.brand_url_analysis;
  const financial = researchData?.financial || {};

  const buildColumnData = (ig: ResearchInstagramData | undefined, username: string): BrandData | null => {
    if (!ig || ig.error) return null;
    const prof = profiles[username];
    return {
      username: ig.username,
      followers: ig.followers,
      total_reels: ig.total_reels,
      top_count: ig.top_count || 0,
      top_performers: ig.top_performers || [],
      profilePicUrl: prof?.profilePicUrl,
      fullName: prof?.fullName,
      biography: prof?.biography,
      verified: prof?.verified,
    };
  };

  const brandCol = brandIG ? buildColumnData(brandIG, brandIG.username) : null;
  const competitorCols = Object.entries(competitors)
    .map(([username, data]) => buildColumnData(data, username))
    .filter(Boolean) as BrandData[];

  const isRunning = !!runningTaskId;
  const aiAnalyzedCount = brandIG?.top_performers?.filter(p => p.ai_analysis && !p.ai_analysis.error).length || 0;
  const totalTopCount = brandIG?.top_performers?.length || 0;

  const hasNoData = !brandCol && !brandUrlAnalysis && competitorCols.length === 0 && Object.keys(financial).length === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar: run button + progress */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleRun} disabled={isRunning}>
          {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          {isRunning ? "Running..." : "Run Research Agent"}
        </Button>

        {isRunning && (
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${runProgress}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">{runProgress}%</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{runMessage}</div>
          </div>
        )}
      </div>

      {hasNoData ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No research data yet. Click <strong>Run Research Agent</strong> to analyze your brand and competitors.
        </div>
      ) : (
        <>
          {/* ================================================================ */}
          {/* Full-width cards: Website Analysis, Success Analysis, Financial */}
          {/* ================================================================ */}

          {/* Brand URL + Success Analysis — side by side when both exist */}
          {(brandUrlAnalysis || Object.values(competitors).some(c => c.success_analysis)) && (
            <div className={`grid gap-4 ${brandUrlAnalysis && Object.values(competitors).some(c => c.success_analysis) ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
              {brandUrlAnalysis && (
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Brand Website Analysis
                  </div>
                  <BrandUrlCard data={brandUrlAnalysis} />
                </div>
              )}

              {Object.values(competitors).some(c => c.success_analysis) && (
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    Competitive Success Analysis
                  </div>
                  {Object.entries(competitors).map(([username, data]) => {
                    const sa = data.success_analysis as Record<string, unknown> | undefined;
                    if (!sa) return null;
                    return (
                      <div key={username} className="text-xs space-y-1.5">
                        <div className="font-medium">vs @{username}</div>
                        {!!sa.summary && <p className="text-muted-foreground whitespace-pre-line">{String(sa.summary)}</p>}
                        {Array.isArray(sa.actionable_recommendations) && sa.actionable_recommendations.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Recommendations:</span>
                            <ul className="list-disc list-inside mt-0.5">
                              {(sa.actionable_recommendations as string[]).map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(sa.content_gaps) && sa.content_gaps.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Content gaps:</span>
                            <ul className="list-disc list-inside mt-0.5">
                              {(sa.content_gaps as string[]).map((g, i) => <li key={i}>{g}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* Combined Competitive Charts (full width) */}
          {/* ================================================================ */}
          {brandCol && competitorCols.length > 0 && trends[brandCol.username] && trends[competitorCols[0].username] && (
            <CompetitiveAnalysisChart
              brandTrends={trends[brandCol.username] as unknown as ResearchTrendPoint[]}
              competitorTrends={trends[competitorCols[0].username] as unknown as ResearchTrendPoint[]}
              brandUsername={brandCol.username}
              competitorUsername={competitorCols[0].username}
              brandFollowers={brandCol.followers}
              competitorFollowers={competitorCols[0].followers}
            />
          )}

          {/* Financial Data — full width */}
          {Object.keys(financial).length > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Financial Data
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(financial).map(([key, data]) => (
                  <FinancialCard key={key} data={data} name={key} />
                ))}
              </div>
            </div>
          )}

          {/* Research Assets — frames + AI pattern summary */}
          {(() => {
            const allPerformers = [
              ...(brandCol?.top_performers || []),
              ...competitorCols.flatMap(c => c.top_performers || []),
            ];
            return <ResearchAssetsPanel allPerformers={allPerformers} />;
          })()}

          {/* ================================================================ */}
          {/* Side-by-side: Brand Reels vs Competitor Reels */}
          {/* ================================================================ */}
          {(brandCol || competitorCols.length > 0) && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <Film className="h-4 w-4 text-muted-foreground" />
                Instagram Reels
                {aiAnalyzedCount > 0 && (
                  <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded ml-auto">
                    <Sparkles className="h-2.5 w-2.5 inline mr-0.5" />{aiAnalyzedCount}/{totalTopCount} AI analyzed
                  </span>
                )}
              </div>
              <div className={`grid gap-4 ${
                (brandCol ? 1 : 0) + competitorCols.length === 1 ? "grid-cols-1 max-w-xl"
                : (brandCol ? 1 : 0) + competitorCols.length === 2 ? "grid-cols-2"
                : "grid-cols-3"
              }`}>
                {brandCol && (
                  <ReelColumn
                    data={brandCol}
                    onItemClick={(item) => setModalItem(item)}
                    label="Brand"
                  />
                )}
                {competitorCols.map((col) => (
                  <ReelColumn
                    key={col.username}
                    data={col}
                    onItemClick={(item) => setModalItem(item)}
                    label="Competitor"
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      <DetailModal
        item={modalItem}
        open={!!modalItem}
        onClose={() => setModalItem(null)}
        onAnalyze={handleAnalyzeVideo}
        analyzing={analyzingVideoUrl === modalItem?.videoUrl}
      />
    </div>
  );
}
