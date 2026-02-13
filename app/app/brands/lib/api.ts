import { apiGet, apiPost, apiFetch, apiDelete, getApiHeadersAsync } from '../../video-simulation/lib/api';
import type { Brand, Seat, Audience, BrandAsset, Strategy } from './types';

// --- Brands ---

export async function getBrands(organizationId?: string): Promise<Brand[]> {
  try {
    const params = organizationId ? `?organization_id=${organizationId}` : '';
    const res = await apiGet(`/api/brands${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getBrand(brandId: string): Promise<Brand | null> {
  try {
    const res = await apiGet(`/api/brands/${brandId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function createBrand(data: {
  organization_id: string;
  name: string;
  slug?: string;
  url?: string;
  product_name?: string;
  description?: string;
  industry?: string;
  logo_url?: string;
  platforms?: string[];
}): Promise<Brand> {
  const res = await apiPost('/api/brands', data);
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try { detail = JSON.parse(body).detail || body; } catch { /* use raw body */ }
    throw new Error(detail);
  }
  return res.json();
}

export async function updateBrand(brandId: string, data: Partial<Brand>): Promise<Brand> {
  const res = await apiFetch(`/api/brands/${brandId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update brand: ${res.status} ${body}`);
  }
  return res.json();
}

export async function deleteBrand(brandId: string): Promise<void> {
  const res = await apiDelete(`/api/brands/${brandId}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to delete brand: ${res.status} ${body}`);
  }
}

// --- Seats ---

export async function getSeats(brandId?: string): Promise<Seat[]> {
  try {
    const params = brandId ? `?brand_id=${brandId}` : '';
    const res = await apiGet(`/api/seats${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createSeat(data: {
  brand_id: string;
  user_id: string;
  role?: string;
}): Promise<Seat> {
  const res = await apiPost('/api/seats', data);
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try { detail = JSON.parse(body).detail || body; } catch { /* use raw body */ }
    throw new Error(detail);
  }
  return res.json();
}

export async function deleteSeat(seatId: string): Promise<void> {
  const res = await apiDelete(`/api/seats/${seatId}`);
  if (!res.ok) throw new Error('Failed to remove seat');
}

// --- Audiences ---

export async function getAudiences(brandId?: string): Promise<Audience[]> {
  try {
    const params = brandId ? `?brand_id=${brandId}` : '';
    const res = await apiGet(`/api/audiences${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getAudience(audienceId: string): Promise<Audience | null> {
  try {
    const res = await apiGet(`/api/audiences/${audienceId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function createAudience(data: {
  brand_id: string;
  name: string;
  description?: string;
  demographics?: Record<string, unknown>;
  size_estimate?: number;
}): Promise<Audience> {
  const res = await apiPost('/api/audiences', data);
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try { detail = JSON.parse(body).detail || body; } catch { /* use raw body */ }
    throw new Error(detail);
  }
  return res.json();
}

export async function updateAudience(audienceId: string, data: Partial<Audience>): Promise<Audience> {
  const res = await apiFetch(`/api/audiences/${audienceId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update audience');
  return res.json();
}

export async function deleteAudience(audienceId: string): Promise<void> {
  const res = await apiDelete(`/api/audiences/${audienceId}`);
  if (!res.ok) throw new Error('Failed to delete audience');
}

// --- Strategies ---

export async function getStrategies(campaignId?: string): Promise<Strategy[]> {
  try {
    const params = campaignId ? `?campaign_id=${campaignId}` : '';
    const res = await apiGet(`/api/strategies${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createStrategy(data: {
  campaign_id: string;
  name: string;
  budget_amount?: number;
  budget_type?: string;
  performance_objective?: Record<string, unknown>;
  audience_control?: Record<string, unknown>;
}): Promise<Strategy> {
  const res = await apiPost('/api/strategies', data);
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try { detail = JSON.parse(body).detail || body; } catch { /* use raw body */ }
    throw new Error(detail);
  }
  return res.json();
}

export async function updateStrategy(strategyId: string, data: Partial<Strategy>): Promise<Strategy> {
  const res = await apiFetch(`/api/strategies/${strategyId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update strategy');
  return res.json();
}

export async function deleteStrategy(strategyId: string): Promise<void> {
  const res = await apiDelete(`/api/strategies/${strategyId}`);
  if (!res.ok) throw new Error('Failed to delete strategy');
}

// --- Brand Assets ---

export async function getBrandAssets(brandId?: string): Promise<BrandAsset[]> {
  try {
    const params = brandId ? `?brand_id=${brandId}` : '';
    const res = await apiGet(`/api/brand-assets${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createBrandAsset(data: {
  brand_id: string;
  name: string;
  asset_type?: string;
  url?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<BrandAsset> {
  const res = await apiPost('/api/brand-assets', data);
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try { detail = JSON.parse(body).detail || body; } catch { /* use raw body */ }
    throw new Error(detail);
  }
  return res.json();
}

export async function uploadBrandAsset(
  file: File,
  brandId: string,
  name?: string,
  description?: string,
  assetType?: string,
  onProgress?: (percent: number) => void,
): Promise<BrandAsset> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('brand_id', brandId);
  if (name) formData.append('name', name);
  if (description) formData.append('description', description);
  if (assetType) formData.append('asset_type', assetType);

  // Build auth headers without Content-Type (browser sets multipart boundary)
  const allHeaders = await getApiHeadersAsync();
  const headers: Record<string, string> = {};
  const h = allHeaders as Record<string, string>;
  if (h['Authorization']) headers['Authorization'] = h['Authorization'];
  if (h['X-API-Key']) headers['X-API-Key'] = h['X-API-Key'];

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/api/brand-assets/upload`);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        let detail = xhr.responseText;
        try { detail = JSON.parse(xhr.responseText).detail || detail; } catch { /* use raw */ }
        reject(new Error(detail));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(formData);
  });
}

export async function deleteBrandAsset(assetId: string): Promise<void> {
  const res = await apiDelete(`/api/brand-assets/${assetId}`);
  if (!res.ok) throw new Error('Failed to delete asset');
}
