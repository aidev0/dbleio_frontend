import { apiGet, apiPost, apiFetch, apiDelete } from '../../video-simulation/lib/api';
import type { ContentWorkflow, ContentWorkflowNode, ContentTimelineEntry, WorkflowStateSnapshot } from './types';
import type { Brand } from '../../brands/lib/types';

// --- User ---

interface UserOrganization {
  _id: string;
  name: string;
  slug?: string;
  role?: string;
  [key: string]: unknown;
}

export async function getUserMe(): Promise<{
  _id: string;
  workos_user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  roles: string[];
  organizations: UserOrganization[];
} | null> {
  try {
    const res = await apiGet('/api/users/me');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// --- Organizations ---

export async function getOrganizations(): Promise<UserOrganization[]> {
  try {
    const res = await apiGet('/api/organizations');
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// --- Organizations ---

export async function createOrganization(data: { name: string; slug?: string }): Promise<{ _id: string; name: string; slug?: string }> {
  const res = await apiPost('/api/organizations', data);
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try { detail = JSON.parse(body).detail || body; } catch { /* */ }
    throw new Error(detail);
  }
  return res.json();
}

// --- Brands ---

export async function createBrand(data: {
  organization_id: string;
  name: string;
  slug?: string;
}): Promise<Brand> {
  const res = await apiPost('/api/brands', data);
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try { detail = JSON.parse(body).detail || body; } catch { /* */ }
    throw new Error(detail);
  }
  return res.json();
}

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

// --- Campaigns ---

export interface CampaignStrategy {
  name?: string;
  budget_amount?: number;
  budget_type?: string;
}

export interface Campaign {
  _id: string;
  id: string;
  name: string;
  description?: string;
  brand_id?: string;
  platform?: string;
  campaign_goal?: string;
  strategies?: CampaignStrategy[];
  created_at: string;
  updated_at: string;
}

export async function getCampaigns(brandId?: string): Promise<Campaign[]> {
  try {
    const params = brandId ? `?brand_id=${brandId}` : '';
    const res = await apiGet(`/api/campaigns${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// --- Content Workflows ---

export async function getContentWorkflows(brandId?: string): Promise<ContentWorkflow[]> {
  try {
    const params = brandId ? `?brand_id=${brandId}` : '';
    const res = await apiGet(`/api/content/workflows${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getContentWorkflow(workflowId: string): Promise<ContentWorkflow | null> {
  try {
    const res = await apiGet(`/api/content/workflows/${workflowId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function createContentWorkflow(data: {
  brand_id: string;
  title: string;
  description?: string;
  config?: Record<string, unknown>;
}): Promise<ContentWorkflow> {
  const res = await apiPost('/api/content/workflows', data);
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try { detail = JSON.parse(body).detail || body; } catch { /* */ }
    throw new Error(detail);
  }
  return res.json();
}

export async function updateContentWorkflow(workflowId: string, data: Partial<ContentWorkflow>): Promise<ContentWorkflow> {
  const res = await apiFetch(`/api/content/workflows/${workflowId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update workflow');
  return res.json();
}

export async function deleteContentWorkflow(workflowId: string): Promise<void> {
  const res = await apiDelete(`/api/content/workflows/${workflowId}`);
  if (!res.ok) throw new Error('Failed to delete workflow');
}

// --- Pipeline Control ---

export async function getContentNodes(workflowId: string): Promise<ContentWorkflowNode[]> {
  try {
    const res = await apiGet(`/api/content/workflows/${workflowId}/nodes`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function runContentPipeline(workflowId: string): Promise<Record<string, unknown>> {
  const res = await apiPost(`/api/content/workflows/${workflowId}/run`);
  if (!res.ok) throw new Error('Failed to run pipeline');
  return res.json();
}

export async function advanceContentStage(workflowId: string): Promise<Record<string, unknown>> {
  const res = await apiPost(`/api/content/workflows/${workflowId}/advance`);
  if (!res.ok) throw new Error('Failed to advance stage');
  return res.json();
}

export async function approveContentStage(workflowId: string, stageKey: string, approved: boolean, note?: string): Promise<Record<string, unknown>> {
  const res = await apiPost(`/api/content/workflows/${workflowId}/stages/${stageKey}/approve`, { approved, note });
  if (!res.ok) throw new Error('Failed to submit approval');
  return res.json();
}

export async function submitStageInput(workflowId: string, stageKey: string, inputData: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await apiPost(`/api/content/workflows/${workflowId}/stages/${stageKey}/input`, { input_data: inputData });
  if (!res.ok) throw new Error('Failed to submit input');
  return res.json();
}

// --- State ---

export async function getContentWorkflowState(workflowId: string): Promise<WorkflowStateSnapshot | null> {
  try {
    const res = await apiGet(`/api/content/workflows/${workflowId}/state`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getAgentStates(workflowId: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await apiGet(`/api/content/workflows/${workflowId}/agent-states`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getTransitionHistory(workflowId: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await apiGet(`/api/content/workflows/${workflowId}/transitions`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// --- Chat ---

export async function sendContentChat(workflowId: string, message: string, role: string = 'user'): Promise<Record<string, unknown>> {
  const res = await apiPost(`/api/content/workflows/${workflowId}/chat`, { message, role });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

// --- Timeline ---

export async function getContentTimeline(workflowId: string, visibility?: string): Promise<ContentTimelineEntry[]> {
  try {
    const params = visibility ? `?visibility=${visibility}` : '';
    const res = await apiGet(`/api/content/workflows/${workflowId}/timeline${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createContentTimelineEntry(workflowId: string, data: {
  card_type?: string;
  content: string;
  visibility?: string;
}): Promise<ContentTimelineEntry> {
  const res = await apiPost(`/api/content/workflows/${workflowId}/timeline`, data);
  if (!res.ok) throw new Error('Failed to create entry');
  return res.json();
}

export async function updateContentTimelineEntry(
  workflowId: string,
  entryId: string,
  data: { content?: string; visibility?: string }
): Promise<ContentTimelineEntry> {
  const res = await apiFetch(`/api/content/workflows/${workflowId}/timeline/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update timeline entry');
  return res.json();
}

export async function deleteContentTimelineEntry(workflowId: string, entryId: string): Promise<void> {
  const res = await apiDelete(`/api/content/workflows/${workflowId}/timeline/${entryId}`);
  if (!res.ok) throw new Error('Failed to delete timeline entry');
}

export async function publishContentTimelineEntry(workflowId: string, entryId: string): Promise<ContentTimelineEntry> {
  const res = await apiPost(`/api/content/workflows/${workflowId}/timeline/${entryId}/publish`);
  if (!res.ok) throw new Error('Failed to publish timeline entry');
  return res.json();
}
