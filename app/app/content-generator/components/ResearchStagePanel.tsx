"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2, Play, Heart, MessageCircle, Eye, Film,
  TrendingUp, ChevronDown, ChevronUp,
  Sparkles, Globe, BarChart3, DollarSign,
  Zap, Lightbulb, MapPin, Users,
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  runResearch,
  getResearchStatus,
  getResearchResults,
  analyzeBrandUrl,
  getFinancialData,
} from "../lib/research-api";
import type {
  ResearchData,
  ResearchVideoAI,
  ResearchBrandUrlAnalysis,
  ResearchFinancialData,
} from "../lib/types";
import {
  getPostsEngagement,
  aggregateEngagement,
  getTopPosts,
  getAnalyzedPosts,
  getDetailedIdeas,
} from "../lib/instagram-api";
import type {
  ContentTypeFilter,
  MetricKey,
  Frequency,
  AggregatedPoint,
  InstagramTopPost,
} from "../lib/instagram-api";

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
// Combined Competitive Analysis Chart (Recharts) — fetches raw data from backend
// ---------------------------------------------------------------------------

function CompetitiveAnalysisChart({
  brandUsername,
  competitorUsername,
  brandFollowers,
  competitorFollowers,
}: {
  brandUsername: string;
  competitorUsername: string;
  brandFollowers: number;
  competitorFollowers: number;
}) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("likes");
  const [contentType, setContentType] = useState<ContentTypeFilter>("all");
  const [frequency, setFrequency] = useState<Frequency>("weekly");

  // Posts (Image/Sidecar) have no views — auto-switch metric when needed
  const hasViews = contentType !== "post";
  const effectiveMetric = (!hasViews && (activeMetric === "views" || activeMetric === "likesPerView")) ? "likes" : activeMetric;
  const [brandData, setBrandData] = useState<AggregatedPoint[]>([]);
  const [compData, setCompData] = useState<AggregatedPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);

  // Fetch raw engagement data from backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingChart(true);
      try {
        const [brandRaw, compRaw] = await Promise.all([
          getPostsEngagement(brandUsername, contentType),
          getPostsEngagement(competitorUsername, contentType),
        ]);
        if (!cancelled) {
          setBrandData(aggregateEngagement(brandRaw, frequency));
          setCompData(aggregateEngagement(compRaw, frequency));
        }
      } catch (err) {
        console.error("Failed to fetch engagement data:", err);
      } finally {
        if (!cancelled) setLoadingChart(false);
      }
    })();
    return () => { cancelled = true; };
  }, [brandUsername, competitorUsername, contentType, frequency]);

  if (loadingChart) {
    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-xs text-muted-foreground">Loading engagement data...</span>
        </div>
      </div>
    );
  }

  if (brandData.length < 2 && compData.length < 2) return null;

  // Merge both datasets by date
  const dateMap = new Map<string, Record<string, number>>();
  for (const d of brandData) {
    const existing = dateMap.get(d.date) || {};
    dateMap.set(d.date, {
      ...existing,
      brandViews: d.views, brandLikes: d.likes, brandComments: d.comments,
      brandLikesPerView: d.views > 0 ? (d.likes / d.views) * 100 : 0,
      brandCount: d.count,
    });
  }
  for (const d of compData) {
    const existing = dateMap.get(d.date) || {};
    dateMap.set(d.date, {
      ...existing,
      compViews: d.views, compLikes: d.likes, compComments: d.comments,
      compLikesPerView: d.views > 0 ? (d.likes / d.views) * 100 : 0,
      compCount: d.count,
    });
  }

  const merged = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => {
      const d = new Date(date + "T00:00:00");
      const label = frequency === "monthly"
        ? d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
      return { date, dateLabel: label, ...vals };
    });

  const fmtK = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v % 1 === 0 ? String(v) : v.toFixed(1);
  };

  const metricConfig: Record<MetricKey, { brandKey: string; compKey: string; label: string; unit: string; fmt: (v: number) => string }> = {
    views:        { brandKey: "brandViews",        compKey: "compViews",        label: "Views",        unit: "",  fmt: fmtK },
    likes:        { brandKey: "brandLikes",        compKey: "compLikes",        label: "Likes",        unit: "",  fmt: fmtK },
    comments:     { brandKey: "brandComments",     compKey: "compComments",     label: "Comments",     unit: "",  fmt: fmtK },
    likesPerView: { brandKey: "brandLikesPerView", compKey: "compLikesPerView", label: "Likes / Views", unit: "%", fmt: (v: number) => `${v.toFixed(2)}%` },
  };

  const cfg = metricConfig[effectiveMetric];

  const allMetricTabs: { key: MetricKey; label: string; needsViews?: boolean }[] = [
    { key: "likes", label: "Likes" },
    { key: "comments", label: "Comments" },
    { key: "views", label: "Views", needsViews: true },
    { key: "likesPerView", label: "Likes/Views %", needsViews: true },
  ];
  const metricTabs = allMetricTabs.filter(t => !t.needsViews || hasViews);

  const contentTypeTabs: { key: ContentTypeFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "post", label: "Posts" },
    { key: "reel", label: "Reels" },
  ];

  const frequencyTabs: { key: Frequency; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
  ];

  const totalBrandPosts = brandData.reduce((s, d) => s + d.count, 0);
  const totalCompPosts = compData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Competitive Analysis
        </div>
        <div className="flex gap-4 text-xs">
          <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: "#7c3aed" }} />@{brandUsername} — <strong>{formatCount(brandFollowers)}</strong> followers · {totalBrandPosts} posts</span>
          <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: "#2563eb" }} />@{competitorUsername} — <strong>{formatCount(competitorFollowers)}</strong> followers · {totalCompPosts} posts</span>
        </div>
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Content type filter */}
        <div className="flex gap-1 border rounded-lg p-0.5">
          {contentTypeTabs.map((t) => (
            <button
              key={t.key}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                contentType === t.key ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"
              }`}
              onClick={() => setContentType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Metric tabs */}
        <div className="flex gap-1 border rounded-lg p-0.5">
          {metricTabs.map((t) => (
            <button
              key={t.key}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                effectiveMetric === t.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
              onClick={() => setActiveMetric(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Frequency tabs */}
        <div className="flex gap-1 border rounded-lg p-0.5">
          {frequencyTabs.map((t) => (
            <button
              key={t.key}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                frequency === t.key ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"
              }`}
              onClick={() => setFrequency(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
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
                return frequency === "monthly"
                  ? d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
                  : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              }}
              interval={Math.max(0, Math.floor(merged.length / 10))}
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
// Top Posts Comparison — side by side brand vs competitor
// ---------------------------------------------------------------------------

function TopPostCard({ post, onClick }: { post: InstagramTopPost; onClick: () => void }) {
  const isVideo = post.type === "Video";
  const thumb = post.displayUrl || (post.images && post.images[0]);
  return (
    <button className="border rounded-lg overflow-hidden bg-background text-left cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all" onClick={onClick}>
      <div className="relative aspect-square bg-muted">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proxyUrl(thumb)} alt="" className="w-full h-full object-cover" loading="lazy" />
        )}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/60 text-white rounded-full p-2.5 hover:bg-black/80 transition-colors">
              <Play className="h-5 w-5 fill-white" />
            </div>
          </div>
        )}
        {post.type && (
          <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
            {isVideo ? "Reel" : post.type === "Sidecar" ? "Carousel" : "Image"}
          </div>
        )}
        {post.ai_analysis && !post.ai_analysis.error && (
          <div className="absolute top-1.5 right-1.5 bg-purple-600/80 text-white text-[8px] px-1 py-0.5 rounded">
            <Sparkles className="h-2.5 w-2.5 inline mr-0.5" />AI
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <div className="flex items-center gap-3 text-white text-[11px]">
            <span className="flex items-center gap-1"><Heart className="h-3 w-3 fill-white" />{formatCount(post.likesCount)}</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{formatCount(post.commentsCount)}</span>
            {isVideo && post.videoPlayCount > 0 && (
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatCount(post.videoPlayCount)}</span>
            )}
          </div>
        </div>
      </div>
      {post.caption && (
        <div className="p-2 text-[11px] text-muted-foreground line-clamp-2">{post.caption}</div>
      )}
    </button>
  );
}

function TopPostDetailModal({
  post,
  open,
  onClose,
}: {
  post: InstagramTopPost | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!post) return null;
  const isVideo = post.type === "Video";
  const hasCarousel = post.images && post.images.length > 1;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <span className="font-semibold">@{post.ownerUsername}</span>
            <span className="text-muted-foreground font-normal text-xs">
              {isVideo ? "Reel" : post.type === "Sidecar" ? "Carousel" : "Image"}
            </span>
            {post.timestamp && (
              <span className="text-muted-foreground font-normal text-xs ml-auto">
                {new Date(post.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Video player */}
        {isVideo && post.videoUrl ? (
          <div className="relative rounded-md overflow-hidden bg-black" style={{ minHeight: 350 }}>
            <video
              key={proxyUrl(post.videoUrl)}
              src={proxyUrl(post.videoUrl)}
              controls
              autoPlay
              playsInline
              poster={proxyUrl(post.displayUrl)}
              className="absolute inset-0 w-full h-full rounded-md"
              style={{ objectFit: "contain" }}
            />
          </div>
        ) : hasCarousel ? (
          /* Carousel images */
          <div className="space-y-2">
            {post.images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={proxyUrl(img)}
                alt={`Slide ${i + 1}`}
                className="w-full rounded-md"
                style={{ maxHeight: "50vh", objectFit: "contain" }}
                loading="lazy"
              />
            ))}
          </div>
        ) : post.displayUrl ? (
          <div className="flex justify-center rounded-md overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proxyUrl(post.displayUrl)} alt="" className="max-w-full rounded-md mx-auto" style={{ maxHeight: "50vh", objectFit: "contain" }} />
          </div>
        ) : null}

        {/* Stats */}
        <div className="flex gap-5 text-sm py-2">
          <span className="flex items-center gap-1.5"><Heart className="h-4 w-4" /> {formatCount(post.likesCount)}</span>
          <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> {formatCount(post.commentsCount)}</span>
          {isVideo && post.videoPlayCount > 0 && <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" /> {formatCount(post.videoPlayCount)}</span>}
        </div>

        {/* Caption */}
        {post.caption && <p className="text-sm whitespace-pre-line">{post.caption}</p>}

        {/* AI Analysis */}
        {post.ai_analysis && !post.ai_analysis.error && (
          <div className="border-t pt-2">
            <div className="flex items-center gap-1.5 text-xs text-primary mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              AI Understanding
            </div>
            <AIDetail analysis={post.ai_analysis as ResearchVideoAI} />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>{post.shortCode}</span>
          {post.url && <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View on Instagram</a>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TopPostsComparison({
  brandUsername,
  competitorUsername,
}: {
  brandUsername: string;
  competitorUsername: string;
}) {
  const [brandBest, setBrandBest] = useState<InstagramTopPost[]>([]);
  const [brandWorst, setBrandWorst] = useState<InstagramTopPost[]>([]);
  const [compBest, setCompBest] = useState<InstagramTopPost[]>([]);
  const [compWorst, setCompWorst] = useState<InstagramTopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentType, setContentType] = useState<ContentTypeFilter>("all");
  const [selectedPost, setSelectedPost] = useState<InstagramTopPost | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [bb, bw, cb, cw] = await Promise.all([
          getTopPosts(brandUsername, 4, contentType, "desc"),
          getTopPosts(brandUsername, 4, contentType, "asc"),
          getTopPosts(competitorUsername, 4, contentType, "desc"),
          getTopPosts(competitorUsername, 4, contentType, "asc"),
        ]);
        if (!cancelled) {
          setBrandBest(bb);
          setBrandWorst(bw);
          setCompBest(cb);
          setCompWorst(cw);
        }
      } catch (err) {
        console.error("Failed to fetch top posts:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [brandUsername, competitorUsername, contentType]);

  const contentTypeTabs: { key: ContentTypeFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "post", label: "Posts" },
    { key: "reel", label: "Reels" },
  ];

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Heart className="h-4 w-4 text-muted-foreground" />
          Top 4 Posts by Likes
        </div>
        <div className="flex gap-1 border rounded-lg p-0.5">
          {contentTypeTabs.map((t) => (
            <button
              key={t.key}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                contentType === t.key ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"
              }`}
              onClick={() => setContentType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Best 4 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-400">Best Performing</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border-2 border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="text-xs font-semibold">Brand</span>
                  <span className="text-xs text-muted-foreground">@{brandUsername}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {brandBest.map((p) => <TopPostCard key={p._id} post={p} onClick={() => setSelectedPost(p)} />)}
                  {brandBest.length === 0 && <div className="text-xs text-muted-foreground col-span-2 py-4 text-center">No posts found</div>}
                </div>
              </div>
              <div className="rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold">Competitor</span>
                  <span className="text-xs text-muted-foreground">@{competitorUsername}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {compBest.map((p) => <TopPostCard key={p._id} post={p} onClick={() => setSelectedPost(p)} />)}
                  {compBest.length === 0 && <div className="text-xs text-muted-foreground col-span-2 py-4 text-center">No posts found</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Worst 4 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-red-500 rotate-180" />
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">Worst Performing</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/10 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-400" />
                  <span className="text-xs font-semibold">Brand</span>
                  <span className="text-xs text-muted-foreground">@{brandUsername}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {brandWorst.map((p) => <TopPostCard key={p._id} post={p} onClick={() => setSelectedPost(p)} />)}
                  {brandWorst.length === 0 && <div className="text-xs text-muted-foreground col-span-2 py-4 text-center">No posts found</div>}
                </div>
              </div>
              <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span className="text-xs font-semibold">Competitor</span>
                  <span className="text-xs text-muted-foreground">@{competitorUsername}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {compWorst.map((p) => <TopPostCard key={p._id} post={p} onClick={() => setSelectedPost(p)} />)}
                  {compWorst.length === 0 && <div className="text-xs text-muted-foreground col-span-2 py-4 text-center">No posts found</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <TopPostDetailModal
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />
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
// Research Assets — AI pattern summary (no frames)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// AI Analyzed Posts — shows all posts with AI analysis for brand + competitor
// ---------------------------------------------------------------------------

function AIAnalyzedPostsSection({
  brandUsername,
  competitorUsername,
}: {
  brandUsername: string;
  competitorUsername: string;
}) {
  const [brandPosts, setBrandPosts] = useState<InstagramTopPost[]>([]);
  const [compPosts, setCompPosts] = useState<InstagramTopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [selectedPost, setSelectedPost] = useState<InstagramTopPost | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [bp, cp] = await Promise.all([
          getAnalyzedPosts(brandUsername),
          getAnalyzedPosts(competitorUsername),
        ]);
        if (!cancelled) {
          setBrandPosts(bp);
          setCompPosts(cp);
        }
      } catch (err) {
        console.error("Failed to fetch analyzed posts:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [brandUsername, competitorUsername]);

  const total = brandPosts.length + compPosts.length;
  if (loading) return null;
  if (total === 0) return null;

  const PREVIEW_COUNT = 6;

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-purple-500" />
          AI Analyzed Posts
          <span className="text-xs text-muted-foreground font-normal">
            {total} posts ({brandPosts.length} brand, {compPosts.length} competitor)
          </span>
        </div>
        {total > PREVIEW_COUNT && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : `Show all ${total}`}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Brand analyzed posts */}
      {brandPosts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-xs font-semibold">Brand</span>
            <span className="text-xs text-muted-foreground">@{brandUsername} ({brandPosts.length})</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {(expanded ? brandPosts : brandPosts.slice(0, PREVIEW_COUNT)).map((p) => (
              <TopPostCard key={p._id} post={p} onClick={() => setSelectedPost(p)} />
            ))}
          </div>
        </div>
      )}

      {/* Competitor analyzed posts */}
      {compPosts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold">Competitor</span>
            <span className="text-xs text-muted-foreground">@{competitorUsername} ({compPosts.length})</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {(expanded ? compPosts : compPosts.slice(0, PREVIEW_COUNT)).map((p) => (
              <TopPostCard key={p._id} post={p} onClick={() => setSelectedPost(p)} />
            ))}
          </div>
        </div>
      )}

      {/* AI Pattern Summary from all analyzed posts */}
      <ResearchAssetsPanel posts={[...brandPosts, ...compPosts]} />

      <TopPostDetailModal
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extracted Ideas — detailed production briefs from competitor analysis
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

function TagList({ items, color }: { items: string[]; color: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <span key={i} className={`${color} px-1.5 py-0.5 rounded text-[10px]`}>{item}</span>
      ))}
    </div>
  );
}

function IdeaCard({ idea, index }: { idea: any; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showAdaptedTranscript, setShowAdaptedTranscript] = useState(false);

  const ob = idea.original_breakdown || {};
  const ba = idea.brand_adaptation || {};
  const fr = ba.filming_requirements || {};
  const stats = idea.original_stats || {};

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                #{index + 1}
              </span>
              <span className="text-sm font-semibold">{ob.title}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Film className="h-3 w-3" />{ob.format} · {ob.duration_seconds}s · {ob.num_scenes} scenes
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />{stats.likes?.toLocaleString()} likes · {stats.comments?.toLocaleString()} comments
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />hook: {ob.hook?.type}
              </span>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 shrink-0 mt-1" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t p-4 space-y-5">
          {/* ---- ORIGINAL BREAKDOWN ---- */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Original Video (@renttherunway)</div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Format</div>
                <div>{ob.format}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Duration</div>
                <div>{ob.duration_seconds}s · {ob.num_scenes} scenes</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Pacing</div>
                <div>{ob.pacing}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Hook</div>
                <div>{ob.hook?.type}: &ldquo;{ob.hook?.exact_text}&rdquo;</div>
              </div>
            </div>

            {/* Transcript */}
            {ob.full_transcript && ob.full_transcript.length > 20 && (
              <div>
                <button
                  className="flex items-center gap-2 text-xs font-semibold hover:text-foreground"
                  onClick={() => setShowTranscript(!showTranscript)}
                >
                  <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  Original Transcript ({ob.full_transcript.length} chars)
                  {showTranscript ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showTranscript && (
                  <div className="bg-muted/50 rounded-md p-3 text-xs whitespace-pre-line leading-relaxed mt-1 max-h-60 overflow-y-auto">
                    {ob.full_transcript}
                  </div>
                )}
              </div>
            )}

            {/* Characters */}
            {ob.characters?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
                  Characters ({ob.characters.length})
                </div>
                <div className="space-y-1 text-[11px]">
                  {ob.characters.map((c: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0">{i + 1}</span>
                      <span>{c.gender}, {c.age_range} — {c.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visual details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
              {ob.objects?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Objects</div>
                  <TagList items={ob.objects} color="bg-blue-50 dark:bg-blue-900/20" />
                </div>
              )}
              {ob.colors?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Colors</div>
                  <TagList items={ob.colors} color="bg-purple-50 dark:bg-purple-900/20" />
                </div>
              )}
              {ob.textures?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Textures</div>
                  <TagList items={ob.textures} color="bg-amber-50 dark:bg-amber-900/20" />
                </div>
              )}
              {ob.music_mood && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Music</div>
                  <div>{ob.music_mood}</div>
                </div>
              )}
            </div>

            {/* Success factors */}
            {ob.success_factors?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Why It Worked</div>
                <ul className="text-[11px] space-y-0.5">
                  {ob.success_factors.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <TrendingUp className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ---- BRAND ADAPTATION ---- */}
          <div className="space-y-3 border-t pt-4">
            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Brand Adaptation (@stitchfix)</div>

            <div className="text-xs font-medium">{ba.title}</div>
            <div className="text-[11px] text-muted-foreground">
              {ba.duration_seconds}s · {ba.num_scenes} scenes · {ba.pacing}
            </div>

            {ba.hook_text && (
              <div className="text-[11px]">
                <span className="text-muted-foreground">Hook:</span> &ldquo;{ba.hook_text}&rdquo;
              </div>
            )}

            {/* Adapted transcript */}
            {ba.adapted_transcript && ba.adapted_transcript.length > 20 && (
              <div>
                <button
                  className="flex items-center gap-2 text-xs font-semibold hover:text-foreground"
                  onClick={() => setShowAdaptedTranscript(!showAdaptedTranscript)}
                >
                  <MessageCircle className="h-3.5 w-3.5 text-purple-500" />
                  Adapted Transcript
                  {showAdaptedTranscript ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showAdaptedTranscript && (
                  <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-md p-3 text-xs whitespace-pre-line leading-relaxed mt-1 max-h-60 overflow-y-auto">
                    {ba.adapted_transcript}
                  </div>
                )}
              </div>
            )}

            {/* What changes vs stays */}
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              {ba.what_to_change?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">What to Change</div>
                  <TagList items={ba.what_to_change} color="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" />
                </div>
              )}
              {ba.what_stays_same?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">What Stays Same</div>
                  <TagList items={ba.what_stays_same} color="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" />
                </div>
              )}
            </div>

            {/* Filming requirements */}
            {fr.location && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Filming Requirements</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <div className="text-muted-foreground mb-0.5">Location</div>
                    <div className="flex items-start gap-1"><MapPin className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />{fr.location}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-0.5">People needed</div>
                    <div className="flex items-center gap-1"><Users className="h-3 w-3 text-muted-foreground" />{fr.num_people}</div>
                  </div>
                </div>

                {fr.wardrobe_from_original?.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Wardrobe (from original)</div>
                    <div className="space-y-0.5 text-[11px]">
                      {fr.wardrobe_from_original.map((w: string, i: number) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="bg-purple-100 dark:bg-purple-900/30 px-1 py-0.5 rounded text-[9px] font-mono shrink-0">{i + 1}</span>
                          <span className="text-muted-foreground">{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fr.props_from_original?.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">Props (from original)</div>
                    <TagList items={fr.props_from_original} color="bg-blue-50 dark:bg-blue-900/20" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExtractedIdeasSection({
  brandUsername,
  competitorUsername,
}: {
  brandUsername: string;
  competitorUsername: string;
}) {
  const [ideas, setIdeas] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getDetailedIdeas(brandUsername, competitorUsername);
        if (!cancelled && res.status === "ready") {
          setIdeas(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch ideas:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [brandUsername, competitorUsername]);

  if (loading || !ideas?.ideas?.length) return null;

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        Extracted Content Ideas
        <span className="text-xs text-muted-foreground font-normal ml-auto">
          {ideas.ideas.length} ideas from @{competitorUsername}
        </span>
      </div>
      <div className="space-y-2">
        {ideas.ideas.map((idea: any, i: number) => (
          <IdeaCard key={i} idea={idea} index={i} />
        ))}
      </div>
    </div>
  );
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Research Assets Panel — AI pattern summary aggregation
// ---------------------------------------------------------------------------

function ResearchAssetsPanel({
  posts,
}: {
  posts: InstagramTopPost[];
}) {
  // Deduplicate by _id
  const seen = new Set<string>();
  const unique = posts.filter(p => { if (seen.has(p._id)) return false; seen.add(p._id); return true; });
  const analyzed = unique.filter(p => p.ai_analysis && !p.ai_analysis?.error);
  const hookCounts: Record<string, number> = {};
  const formatCounts: Record<string, number> = {};
  const colorCounts: Record<string, number> = {};
  const textureCounts: Record<string, number> = {};
  const objectCounts: Record<string, number> = {};
  const musicCounts: Record<string, number> = {};

  for (const p of analyzed) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ai = p.ai_analysis as any;
    if (ai.hook_type) hookCounts[ai.hook_type] = (hookCounts[ai.hook_type] || 0) + 1;
    if (ai.content_format) formatCounts[ai.content_format] = (formatCounts[ai.content_format] || 0) + 1;
    if (ai.colors) for (const c of ai.colors) colorCounts[c] = (colorCounts[c] || 0) + 1;
    if (ai.textures) for (const t of ai.textures) textureCounts[t] = (textureCounts[t] || 0) + 1;
    if (ai.objects) for (const o of ai.objects) objectCounts[o] = (objectCounts[o] || 0) + 1;
    if (ai.music_mood) musicCounts[ai.music_mood] = (musicCounts[ai.music_mood] || 0) + 1;
  }

  const sortedEntries = (counts: Record<string, number>) =>
    Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (analyzed.length === 0) return null;

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        AI Pattern Summary
        <span className="text-xs text-muted-foreground font-normal ml-auto">
          {analyzed.length} posts analyzed
        </span>
      </div>
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
  brandUsername?: string;
  brandCompetitors?: Array<{ instagram_username: string; name?: string; url?: string }>;
}

export default function ResearchStagePanel({
  workflowId,
  brandUsername: propBrandUsername,
  brandCompetitors,
}: ResearchStagePanelProps) {
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profiles from instagram_profiles collection
  const [profiles, setProfiles] = useState<Record<string, { profilePicUrl?: string; fullName?: string; biography?: string; verified?: boolean; followersCount?: number }>>({});

  // Background task
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [runProgress, setRunProgress] = useState(0);
  const [runMessage, setRunMessage] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
            map[p.username] = { profilePicUrl: p.profilePicUrl, fullName: p.fullName, biography: p.biography, verified: p.verified, followersCount: p.followersCount };
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
      const compUsernames = brandCompetitors?.map(c => c.instagram_username) || ["renttherunway"];
      const compNames = brandCompetitors?.map(c => c.name).filter(Boolean) || ["Rent The Runway"];
      const { task_id } = await runResearch(workflowId, {
        brand_username: brandUsername,
        competitor_usernames: compUsernames,
        financial_companies: [brandUsername, ...compNames],
      });
      setRunningTaskId(task_id);
      startPolling(task_id);
    } catch (err) {
      console.error("Run research failed:", err);
      setRunMessage("Failed to start");
    }
  };

  // --- Research data ---
  const brandIG = researchData?.brand_instagram;
  const competitors = researchData?.competitor_instagram || {};
  const brandUrlAnalysis = researchData?.brand_url_analysis;
  const financial = researchData?.financial || {};

  const isRunning = !!runningTaskId;

  const hasNoResearchData = !brandUrlAnalysis && Object.keys(competitors).length === 0 && Object.keys(financial).length === 0;

  // Derive brand/competitor usernames from brand data, falling back to research data
  const brandUsername = propBrandUsername || brandIG?.username || "stitchfix";
  const competitorUsername = brandCompetitors?.[0]?.instagram_username || Object.keys(competitors)[0] || "renttherunway";
  const brandFollowers = brandIG?.followers || profiles[brandUsername]?.followersCount || 0;
  const competitorFollowers = competitors[competitorUsername]?.followers || profiles[competitorUsername]?.followersCount || 0;

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

      {/* Competitive Analysis Chart — always shown, fetches its own data */}
      <CompetitiveAnalysisChart
        brandUsername={brandUsername}
        competitorUsername={competitorUsername}
        brandFollowers={brandFollowers}
        competitorFollowers={competitorFollowers}
      />

      {/* Top Posts by Likes — side by side */}
      <TopPostsComparison
        brandUsername={brandUsername}
        competitorUsername={competitorUsername}
      />

      {/* All AI Analyzed Posts — browsable grid with pattern summary */}
      <AIAnalyzedPostsSection
        brandUsername={brandUsername}
        competitorUsername={competitorUsername}
      />

      {/* Extracted Content Ideas — production briefs from competitor */}
      <ExtractedIdeasSection
        brandUsername={brandUsername}
        competitorUsername={competitorUsername}
      />

      {hasNoResearchData ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Click <strong>Run Research Agent</strong> for deeper analysis (top performers, AI insights, financials).
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

        </>
      )}
    </div>
  );
}
