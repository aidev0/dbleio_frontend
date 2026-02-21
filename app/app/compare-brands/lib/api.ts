import { apiGet, apiPost } from "@/app/app/video-simulation/lib/api";

// --- Types ---

export interface InstagramProfile {
  _id: string;
  username: string;
  fullName: string;
  profilePicUrl: string;
  postsCount: number;
  followersCount: number;
  followsCount: number;
  biography: string;
  verified: boolean;
  isBusinessAccount: boolean;
  private: boolean;
}

export interface InstagramChildPost {
  id: string;
  type: string;
  displayUrl: string;
  dimensionsHeight: number;
  dimensionsWidth: number;
}

export interface InstagramPost {
  _id: string;
  id: string;
  type: string;
  shortCode: string;
  caption: string;
  hashtags: string[];
  url: string;
  commentsCount: number;
  likesCount: number;
  timestamp: string;
  displayUrl: string;
  images: string[];
  videoUrl: string | null;
  videoViewCount: number;
  videoPlayCount: number;
  dimensionsHeight: number;
  dimensionsWidth: number;
  ownerUsername: string;
  ownerFullName: string;
  childPosts: InstagramChildPost[] | null;
}

export interface InstagramReel {
  _id: string;
  id: string;
  type: string;
  shortCode: string;
  caption: string;
  hashtags: string[];
  url: string;
  commentsCount: number;
  likesCount: number;
  timestamp: string;
  displayUrl: string;
  images: string[];
  videoUrl: string;
  videoDuration: number;
  videoViewCount: number;
  videoPlayCount: number;
  dimensionsHeight: number;
  dimensionsWidth: number;
  ownerUsername: string;
  ownerFullName: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

// --- Fetch functions ---

export async function getInstagramProfiles(): Promise<InstagramProfile[]> {
  const res = await apiGet("/api/instagram/profiles");
  if (!res.ok) throw new Error("Failed to fetch profiles");
  return res.json();
}

export async function getInstagramPosts(
  username: string,
  skip = 0,
  limit = 12
): Promise<PaginatedResponse<InstagramPost>> {
  const res = await apiGet(
    `/api/instagram/posts?username=${encodeURIComponent(username)}&skip=${skip}&limit=${limit}`
  );
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
}

export async function getInstagramReels(
  username: string,
  skip = 0,
  limit = 12
): Promise<PaginatedResponse<InstagramReel>> {
  const res = await apiGet(
    `/api/instagram/reels?username=${encodeURIComponent(username)}&skip=${skip}&limit=${limit}`
  );
  if (!res.ok) throw new Error("Failed to fetch reels");
  return res.json();
}

export async function scrapeInstagramAccount(
  instagramUrl: string
): Promise<{ status: string; username: string }> {
  const res = await apiPost("/api/instagram/scrape", {
    instagram_url: instagramUrl,
  });
  if (!res.ok) throw new Error("Failed to start scrape");
  return res.json();
}

export async function getScrapeStatus(
  username: string
): Promise<{
  username: string;
  ready: boolean;
  has_profile: boolean;
  has_posts: boolean;
  has_reels: boolean;
}> {
  const res = await apiGet(
    `/api/instagram/scrape-status?username=${encodeURIComponent(username)}`
  );
  if (!res.ok) throw new Error("Failed to fetch scrape status");
  return res.json();
}
