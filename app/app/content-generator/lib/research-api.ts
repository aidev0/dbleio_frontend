import { apiGet, apiPost } from '../../video-simulation/lib/api';

// --- Research API client ---

export async function runResearch(
  workflowId: string,
  params: {
    brand_url?: string;
    brand_username?: string;
    competitor_usernames?: string[];
    financial_companies?: string[];
  },
): Promise<{ task_id: string; status: string }> {
  const res = await apiPost(`/api/research/${workflowId}/run`, params);
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try { detail = JSON.parse(text).detail || text; } catch { /* */ }
    throw new Error(detail);
  }
  return res.json();
}

export async function getResearchStatus(
  workflowId: string,
  taskId?: string,
): Promise<Record<string, unknown>> {
  const params = taskId ? `?task_id=${taskId}` : '';
  const res = await apiGet(`/api/research/${workflowId}/status${params}`);
  if (!res.ok) throw new Error('Failed to get research status');
  return res.json();
}

export async function getResearchResults(
  workflowId: string,
): Promise<Record<string, unknown>> {
  const res = await apiGet(`/api/research/${workflowId}/results`);
  if (!res.ok) throw new Error('Failed to get research results');
  return res.json();
}

export async function analyzeBrandUrl(
  workflowId: string,
  url: string,
): Promise<Record<string, unknown>> {
  const res = await apiPost(`/api/research/${workflowId}/analyze-brand-url`, { url });
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try { detail = JSON.parse(text).detail || text; } catch { /* */ }
    throw new Error(detail);
  }
  return res.json();
}

export async function getBrandInstagram(
  workflowId: string,
  username: string,
): Promise<Record<string, unknown>> {
  const res = await apiGet(`/api/research/${workflowId}/brand-instagram?username=${username}`);
  if (!res.ok) throw new Error('Failed to get brand Instagram data');
  return res.json();
}

export async function getCompetitorInstagram(
  workflowId: string,
  username: string,
): Promise<Record<string, unknown>> {
  const res = await apiGet(`/api/research/${workflowId}/competitor-instagram?username=${username}`);
  if (!res.ok) throw new Error('Failed to get competitor Instagram data');
  return res.json();
}

export async function analyzeVideo(
  workflowId: string,
  videoUrl: string,
): Promise<Record<string, unknown>> {
  const res = await apiPost(`/api/research/${workflowId}/analyze-video`, { video_url: videoUrl });
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try { detail = JSON.parse(text).detail || text; } catch { /* */ }
    throw new Error(detail);
  }
  return res.json();
}

export async function getEngagementTrends(
  workflowId: string,
  username: string,
  contentType?: string,
): Promise<Record<string, unknown>> {
  let url = `/api/research/${workflowId}/trends?username=${username}`;
  if (contentType) url += `&content_type=${contentType}`;
  const res = await apiGet(url);
  if (!res.ok) throw new Error('Failed to get engagement trends');
  return res.json();
}

export async function getFinancialData(
  workflowId: string,
  company?: string,
): Promise<Record<string, unknown>> {
  let url = `/api/research/${workflowId}/financial`;
  if (company) url += `?company=${encodeURIComponent(company)}`;
  const res = await apiGet(url);
  if (!res.ok) throw new Error('Failed to get financial data');
  return res.json();
}

export async function extractAssets(
  workflowId: string,
  username?: string,
  maxReels?: number,
  framesPerReel?: number,
): Promise<{ task_id: string; status: string }> {
  let url = `/api/research/${workflowId}/extract-assets`;
  const params = new URLSearchParams();
  if (username) params.set('username', username);
  if (maxReels) params.set('max_reels', maxReels.toString());
  if (framesPerReel) params.set('frames_per_reel', framesPerReel.toString());
  const qs = params.toString();
  if (qs) url += `?${qs}`;
  const res = await apiPost(url, {});
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try { detail = JSON.parse(text).detail || text; } catch { /* */ }
    throw new Error(detail);
  }
  return res.json();
}
