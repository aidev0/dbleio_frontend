import { apiGet, apiPost, apiFetch, apiDelete } from '../../video-simulation/lib/api';
import type {
  CustomWorkflow,
  CustomWorkflowGraph,
  TimelineEntry,
} from './types';

// --- Custom Workflows ---

export async function getCustomWorkflows(status?: string): Promise<CustomWorkflow[]> {
  try {
    const params = status ? `?status=${status}` : '';
    const res = await apiGet(`/api/custom-workflows${params}`);
    if (!res.ok) {
      console.warn(`getCustomWorkflows: ${res.status} ${res.statusText}`);
      return [];
    }
    return res.json();
  } catch (err) {
    console.warn('getCustomWorkflows failed:', err);
    return [];
  }
}

export async function getCustomWorkflow(workflowId: string): Promise<CustomWorkflow> {
  const res = await apiGet(`/api/custom-workflows/${workflowId}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch custom workflow: ${res.status} ${body}`);
  }
  return res.json();
}

export async function createCustomWorkflow(data: {
  organization_id: string;
  title: string;
  description?: string;
  status?: string;
  source_dev_workflow_id?: string;
}): Promise<CustomWorkflow> {
  const res = await apiPost('/api/custom-workflows', data);
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try { detail = JSON.parse(body).detail || body; } catch { /* use raw body */ }
    const err = new Error(detail) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function updateCustomWorkflow(
  workflowId: string,
  data: { title?: string; description?: string; status?: string }
): Promise<CustomWorkflow> {
  const res = await apiFetch(`/api/custom-workflows/${workflowId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update custom workflow: ${res.status} ${body}`);
  }
  return res.json();
}

export async function deleteCustomWorkflow(workflowId: string): Promise<void> {
  const res = await apiDelete(`/api/custom-workflows/${workflowId}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to delete custom workflow: ${res.status} ${body}`);
  }
}

// --- Graph ---

export async function getCustomWorkflowGraph(workflowId: string): Promise<CustomWorkflowGraph> {
  try {
    const res = await apiGet(`/api/custom-workflows/${workflowId}/graph`);
    if (!res.ok) return { nodes: [], edges: [] };
    return res.json();
  } catch {
    return { nodes: [], edges: [] };
  }
}

// --- Timeline ---

export async function getCustomTimelineEntries(workflowId: string, visibility?: string): Promise<TimelineEntry[]> {
  try {
    const params = visibility ? `?visibility=${visibility}` : '';
    const res = await apiGet(`/api/custom-workflows/${workflowId}/timeline${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createCustomTimelineEntry(
  workflowId: string,
  data: { card_type?: string; content: string; visibility?: string; todos?: Array<{ id: string; text: string; completed: boolean }>; parent_entry_id?: string }
): Promise<TimelineEntry> {
  const res = await apiPost(`/api/custom-workflows/${workflowId}/timeline`, data);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create timeline entry: ${res.status} ${body}`);
  }
  return res.json();
}

export async function updateCustomTimelineEntry(
  workflowId: string,
  entryId: string,
  data: { content?: string; visibility?: string; todos?: Array<{ id: string; text: string; completed: boolean }> }
): Promise<TimelineEntry> {
  const res = await apiFetch(`/api/custom-workflows/${workflowId}/timeline/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update timeline entry: ${res.status} ${body}`);
  }
  return res.json();
}

export async function deleteCustomTimelineEntry(workflowId: string, entryId: string): Promise<void> {
  const res = await apiDelete(`/api/custom-workflows/${workflowId}/timeline/${entryId}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to delete timeline entry: ${res.status} ${body}`);
  }
}

export async function publishCustomTimelineEntry(workflowId: string, entryId: string): Promise<TimelineEntry> {
  const res = await apiPost(`/api/custom-workflows/${workflowId}/timeline/${entryId}/publish`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to publish timeline entry: ${res.status} ${body}`);
  }
  return res.json();
}

export async function toggleCustomTodo(workflowId: string, entryId: string, todoId: string, completed: boolean): Promise<TimelineEntry> {
  const res = await apiFetch(`/api/custom-workflows/${workflowId}/timeline/${entryId}/todos/${todoId}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to toggle todo: ${res.status} ${body}`);
  }
  return res.json();
}
