"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  getInstagramProfiles,
  getInstagramPosts,
  getInstagramReels,
  scrapeInstagramAccount,
  getScrapeStatus,
  type InstagramProfile,
  type InstagramPost,
  type InstagramReel,
} from "./lib/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Grid3x3,
  Film,
  Heart,
  MessageCircle,
  Eye,
  BadgeCheck,
  Layers,
  Check,
  Plus,
  Loader2,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Proxy Instagram CDN URLs through our backend to avoid referrer blocking */
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

type AnyItem = InstagramPost | InstagramReel;

function getVideoUrl(item: AnyItem): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (item as any).videoUrl || null;
}

function getPlayCount(item: AnyItem): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = item as any;
  return a.videoPlayCount || a.videoViewCount || 0;
}

function getThumb(item: AnyItem): string {
  return item.displayUrl || (item.images?.length ? item.images[0] : "");
}

// ---------------------------------------------------------------------------
// Grid Thumbnail
// ---------------------------------------------------------------------------

function GridThumbnail({
  item,
  isReelTab,
  onClick,
}: {
  item: AnyItem;
  isReelTab: boolean;
  onClick: () => void;
}) {
  const videoUrl = getVideoUrl(item);
  const isVideo = isReelTab || !!videoUrl;
  const isSidecar = (item as InstagramPost).type === "Sidecar";
  const thumb = getThumb(item);
  const aspect = isReelTab ? "9/16" : "3/4";

  return (
    <button
      className="relative overflow-hidden group cursor-pointer bg-muted rounded-sm"
      style={{ aspectRatio: aspect }}
      onClick={onClick}
    >
      {thumb && (
        <img
          src={proxyUrl(thumb)}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {(isVideo || isSidecar) && (
        <div className="absolute top-1.5 right-1.5 text-white drop-shadow-md">
          {isVideo ? <Play className="h-4 w-4 fill-white" /> : <Layers className="h-4 w-4" />}
        </div>
      )}

      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white text-xs font-semibold">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 fill-white" />
            {formatCount(item.likesCount)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5 fill-white" />
            {formatCount(item.commentsCount)}
          </span>
          {isVideo && getPlayCount(item) > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatCount(getPlayCount(item))}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Brand Column — everything scrolls together (profile + grid)
// ---------------------------------------------------------------------------

function BrandColumn({
  profile,
  onItemClick,
}: {
  profile: InstagramProfile;
  onItemClick: (item: AnyItem, type: "post" | "reel") => void;
}) {
  const [tab, setTab] = useState<"posts" | "reels">("posts");
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [reels, setReels] = useState<InstagramReel[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [reelsTotal, setReelsTotal] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingReels, setLoadingReels] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const colRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoadingPosts(true);
    setPosts([]);
    getInstagramPosts(profile.username, 0, 12).then((res) => {
      setPosts(res.items);
      setPostsTotal(res.total);
      setLoadingPosts(false);
    });
  }, [profile.username]);

  useEffect(() => {
    if (tab === "reels" && reels.length === 0 && reelsTotal === 0) {
      setLoadingReels(true);
      getInstagramReels(profile.username, 0, 12).then((res) => {
        setReels(res.items);
        setReelsTotal(res.total);
        setLoadingReels(false);
      });
    }
  }, [tab, profile.username, reels.length, reelsTotal]);

  const loadMore = useCallback(() => {
    if (loadingMore) return;
    if (tab === "posts" && posts.length >= postsTotal) return;
    if (tab === "reels" && reels.length >= reelsTotal) return;

    setLoadingMore(true);
    const skip = tab === "posts" ? posts.length : reels.length;
    const fetcher = tab === "posts" ? getInstagramPosts : getInstagramReels;

    fetcher(profile.username, skip, 12).then((res) => {
      if (tab === "posts") {
        setPosts((prev) => [...prev, ...(res.items as InstagramPost[])]);
      } else {
        setReels((prev) => [...prev, ...(res.items as InstagramReel[])]);
      }
      setLoadingMore(false);
    });
  }, [tab, posts, reels, postsTotal, reelsTotal, loadingMore, profile.username]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { root: colRef.current, rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const items: AnyItem[] = tab === "posts" ? posts : reels;
  const loading = tab === "posts" ? loadingPosts : loadingReels;

  return (
    <div ref={colRef} className="border rounded-lg bg-background overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
      {/* Profile header — scrolls with content */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={proxyUrl(profile.profilePicUrl)} alt={profile.username} />
            <AvatarFallback>{profile.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm truncate">@{profile.username}</span>
              {profile.verified && <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">{profile.fullName}</p>
          </div>
        </div>

        <div className="flex gap-4 text-xs">
          <div><span className="font-semibold">{formatCount(profile.postsCount)}</span> <span className="text-muted-foreground">posts</span></div>
          <div><span className="font-semibold">{formatCount(profile.followersCount)}</span> <span className="text-muted-foreground">followers</span></div>
          <div><span className="font-semibold">{formatCount(profile.followsCount)}</span> <span className="text-muted-foreground">following</span></div>
        </div>

        {profile.biography && (
          <p className="text-xs text-muted-foreground line-clamp-2">{profile.biography}</p>
        )}
      </div>

      {/* Sticky tabs */}
      <div className="sticky top-0 z-10 bg-background px-4 pb-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "posts" | "reels")}>
          <TabsList className="w-full">
            <TabsTrigger value="posts" className="flex-1 gap-1.5">
              <Grid3x3 className="h-3.5 w-3.5" /> Posts
            </TabsTrigger>
            <TabsTrigger value="reels" className="flex-1 gap-1.5">
              <Film className="h-3.5 w-3.5" /> Reels
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      <div className="px-1.5 pb-1.5">
        {loading ? (
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full rounded-sm" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {items.map((item) => (
              <GridThumbnail
                key={item._id}
                item={item}
                isReelTab={tab === "reels"}
                onClick={() => onItemClick(item, tab === "reels" ? "reel" : "post")}
              />
            ))}
          </div>
        )}
        <div ref={sentinelRef} className="h-4" />
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carousel for Sidecar posts
// ---------------------------------------------------------------------------

function Carousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  const total = images.length;

  const prev = () => setIdx((i) => (i > 0 ? i - 1 : i));
  const next = () => setIdx((i) => (i < total - 1 ? i + 1 : i));

  if (total === 0) return null;

  return (
    <div className="relative flex flex-col items-center">
      {/* Slide */}
      <div className="relative w-full flex items-center justify-center overflow-hidden rounded-md">
        <img
          src={proxyUrl(images[idx])}
          alt=""
          className="max-w-full max-h-[70vh] object-contain mx-auto"
        />

        {/* Left arrow */}
        {idx > 0 && (
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right arrow */}
        {idx < total - 1 && (
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Dots */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-3">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${
                i === idx
                  ? "w-2 h-2 bg-primary"
                  : "w-1.5 h-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Modal
// ---------------------------------------------------------------------------

function DetailModal({
  item,
  type,
  open,
  onClose,
}: {
  item: AnyItem | null;
  type: "post" | "reel";
  open: boolean;
  onClose: () => void;
}) {
  if (!item) return null;

  const videoUrl = getVideoUrl(item);
  const playCount = getPlayCount(item);
  const thumb = getThumb(item);
  const w = item.dimensionsWidth || 4;
  const h = item.dimensionsHeight || 5;

  const isSidecar = item.type === "Sidecar";
  const post = item as InstagramPost;
  const carouselImages: string[] = isSidecar
    ? (post.childPosts || []).map((c) => c.displayUrl).filter(Boolean)
    : [];
  // Fallback: if childPosts didn't have displayUrls, use images array
  const slides = carouselImages.length > 0 ? carouselImages : (isSidecar && post.images?.length ? post.images : []);

  // Narrow modal for tall content (9:16 videos/reels)
  const isPortrait = h > w;
  const maxWidth = isPortrait ? "max-w-sm" : "max-w-2xl";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={`${maxWidth} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            @{item.ownerUsername}
            <span className="text-muted-foreground font-normal">
              {type === "reel" ? "Reel" : isSidecar ? `Carousel (${slides.length})` : item.type === "Video" ? "Video" : "Post"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Media */}
        {isSidecar && slides.length > 0 ? (
          <Carousel images={slides} />
        ) : videoUrl ? (
          <div className="flex justify-center rounded-md overflow-hidden">
            <video
              key={videoUrl}
              src={proxyUrl(videoUrl)}
              controls
              autoPlay
              playsInline
              poster={proxyUrl(thumb)}
              className="max-w-full rounded-md mx-auto"
              style={{ aspectRatio: `${w}/${h}`, maxHeight: "70vh" }}
            />
          </div>
        ) : thumb ? (
          <div className="flex justify-center rounded-md overflow-hidden">
            <img
              src={proxyUrl(thumb)}
              alt=""
              className="max-w-full rounded-md mx-auto"
              style={{ aspectRatio: `${w}/${h}`, maxHeight: "70vh", objectFit: "contain" }}
            />
          </div>
        ) : null}

        {/* Stats */}
        <div className="flex gap-5 text-sm py-2">
          <span className="flex items-center gap-1.5">
            <Heart className="h-4 w-4" /> {formatCount(item.likesCount)}
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" /> {formatCount(item.commentsCount)}
          </span>
          {playCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" /> {formatCount(playCount)}
            </span>
          )}
        </div>

        {item.caption && (
          <p className="text-sm whitespace-pre-line line-clamp-6">{item.caption}</p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>
            {item.timestamp ? new Date(item.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : ""}
          </span>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              View on Instagram
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add Brand Dialog
// ---------------------------------------------------------------------------

function AddBrandDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setError("");
    setScraping(true);
    try {
      const res = await scrapeInstagramAccount(url.trim());
      const username = res.username;
      pollRef.current = setInterval(async () => {
        try {
          const status = await getScrapeStatus(username);
          if (status.ready) {
            if (pollRef.current) clearInterval(pollRef.current);
            setScraping(false);
            setUrl("");
            onAdded();
            onClose();
          }
        } catch { /* keep polling */ }
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scrape failed");
      setScraping(false);
    }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !scraping && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Instagram Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Instagram URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/username/"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={scraping}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={handleSubmit} disabled={scraping || !url.trim()} className="w-full">
            {scraping ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Scraping... this may take a few minutes</> : "Scrape Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CompareBrandsPage() {
  const [profiles, setProfiles] = useState<InstagramProfile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [modalItem, setModalItem] = useState<{ item: AnyItem; type: "post" | "reel" } | null>(null);

  const fetchProfiles = useCallback(async () => {
    try {
      const data = await getInstagramProfiles();
      setProfiles(data);
      setSelected(data.map((p) => p.username));
    } catch (e) {
      console.error("Failed to load profiles:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const toggleBrand = (username: string) => {
    setSelected((prev) => {
      if (prev.includes(username)) return prev.filter((u) => u !== username);
      return [...prev, username];
    });
  };

  const profileMap = new Map(profiles.map((p) => [p.username, p]));
  const selectedProfiles = selected.map((u) => profileMap.get(u)).filter(Boolean) as InstagramProfile[];
  const colsClass =
    selectedProfiles.length === 1 ? "grid-cols-1 max-w-xl"
    : selectedProfiles.length === 2 ? "grid-cols-2"
    : "grid-cols-3";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-4">Competitive Analysis</h1>
        <div className="flex flex-wrap items-center gap-2">
          {profiles.map((p) => {
            const active = selected.includes(p.username);
            return (
              <button
                key={p.username}
                onClick={() => toggleBrand(p.username)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {active && <Check className="h-3.5 w-3.5" />}
                <Avatar className="h-5 w-5">
                  <AvatarImage src={proxyUrl(p.profilePicUrl)} />
                  <AvatarFallback className="text-[10px]">{p.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                @{p.username}
              </button>
            );
          })}
          <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 text-center py-20">
          <div className="rounded-full bg-muted p-6"><Plus className="h-10 w-10 text-muted-foreground" /></div>
          <div>
            <h2 className="text-lg font-semibold">No brands yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Add your first Instagram account to get started</p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Instagram Account</Button>
        </div>
      ) : selectedProfiles.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Select at least one brand above to compare</div>
      ) : (
        <div className={`grid ${colsClass} gap-6`}>
          {selectedProfiles.map((p) => (
            <BrandColumn key={p.username} profile={p} onItemClick={(item, type) => setModalItem({ item, type })} />
          ))}
        </div>
      )}

      <DetailModal item={modalItem?.item ?? null} type={modalItem?.type ?? "post"} open={!!modalItem} onClose={() => setModalItem(null)} />
      <AddBrandDialog open={addOpen} onClose={() => setAddOpen(false)} onAdded={fetchProfiles} />
    </div>
  );
}
