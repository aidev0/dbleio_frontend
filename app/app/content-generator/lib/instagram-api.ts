import { apiGet } from '../../video-simulation/lib/api';

// --- Instagram engagement data for charting ---

export interface InstagramEngagementPoint {
  timestamp: string;
  likesCount: number;
  commentsCount: number;
  views: number;
  type: string; // "Video" | "Image" | "Sidecar"
}

export type ContentTypeFilter = 'all' | 'post' | 'reel';
export type MetricKey = 'views' | 'likes' | 'comments' | 'likesPerView';
export type Frequency = 'daily' | 'weekly' | 'monthly';

export async function getPostsEngagement(
  username: string,
  contentType?: ContentTypeFilter,
): Promise<InstagramEngagementPoint[]> {
  let url = `/api/instagram/posts/engagement?username=${encodeURIComponent(username)}`;
  if (contentType && contentType !== 'all') url += `&content_type=${contentType}`;
  const res = await apiGet(url);
  if (!res.ok) throw new Error('Failed to fetch engagement data');
  return res.json();
}

// --- Top posts by likes ---

export interface InstagramTopPost {
  _id: string;
  id: string;
  type: string;
  shortCode: string;
  caption: string;
  url: string;
  likesCount: number;
  commentsCount: number;
  videoViewCount: number;
  videoPlayCount: number;
  displayUrl: string | null;
  videoUrl: string | null;
  images: string[];
  timestamp: string;
  ownerUsername: string;
  ai_analysis?: Record<string, unknown> | null;
}

export async function getTopPosts(
  username: string,
  limit: number = 4,
  contentType?: ContentTypeFilter,
  sort: 'desc' | 'asc' = 'desc',
): Promise<InstagramTopPost[]> {
  let url = `/api/instagram/posts/top?username=${encodeURIComponent(username)}&limit=${limit}&sort=${sort}`;
  if (contentType && contentType !== 'all') url += `&content_type=${contentType}`;
  const res = await apiGet(url);
  if (!res.ok) throw new Error('Failed to fetch top posts');
  return res.json();
}

// --- All AI-analyzed posts ---

export async function getAnalyzedPosts(
  username: string,
  contentType?: ContentTypeFilter,
): Promise<InstagramTopPost[]> {
  let url = `/api/instagram/posts/analyzed?username=${encodeURIComponent(username)}`;
  if (contentType && contentType !== 'all') url += `&content_type=${contentType}`;
  const res = await apiGet(url);
  if (!res.ok) throw new Error('Failed to fetch analyzed posts');
  return res.json();
}

// --- Detailed production ideas ---

export async function getDetailedIdeas(
  brandUsername: string,
  competitorUsername: string,
): Promise<{ status: string; data?: Record<string, unknown>; created_at?: string }> {
  const url = `/api/instagram/posts/detailed-ideas?brand_username=${encodeURIComponent(brandUsername)}&competitor_username=${encodeURIComponent(competitorUsername)}`;
  const res = await apiGet(url);
  if (!res.ok) throw new Error('Failed to fetch ideas');
  return res.json();
}

// --- Client-side aggregation ---

export interface AggregatedPoint {
  date: string;
  likes: number;
  comments: number;
  views: number;
  count: number;
}

function dateToWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function dateToMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

export function aggregateEngagement(
  points: InstagramEngagementPoint[],
  frequency: Frequency,
): AggregatedPoint[] {
  const buckets = new Map<string, AggregatedPoint>();

  for (const p of points) {
    if (!p.timestamp) continue;
    const dateStr = p.timestamp.slice(0, 10);

    let key: string;
    if (frequency === 'weekly') key = dateToWeekKey(dateStr);
    else if (frequency === 'monthly') key = dateToMonthKey(dateStr);
    else key = dateStr;

    const existing = buckets.get(key);
    if (existing) {
      existing.likes += p.likesCount;
      existing.comments += p.commentsCount;
      existing.views += p.views;
      existing.count += 1;
    } else {
      buckets.set(key, {
        date: key,
        likes: p.likesCount,
        comments: p.commentsCount,
        views: p.views,
        count: 1,
      });
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}
