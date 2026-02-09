import { apiGet, apiPost, apiFetch, apiDelete } from '../../video-simulation/lib/api';
import type {
  Organization,
  Project,
  Workflow,
  WorkflowNode,
  WorkflowJob,
  WorkflowEvent,
  Specification,
  TimelineEntry,
} from './types';

// --- Organizations ---

export async function getOrganizations(): Promise<Organization[]> {
  try {
    const res = await apiGet('/api/organizations');
    if (!res.ok) {
      console.warn(`getOrganizations: ${res.status} ${res.statusText}`);
      return [];
    }
    return res.json();
  } catch (err) {
    console.warn('getOrganizations failed:', err);
    return [];
  }
}

export async function createOrganization(data: {
  name: string;
  slug?: string;
  description?: string;
  url?: string;
  brand_name?: string;
  brand_description?: string;
  product_description?: string;
  industry?: string;
  logo_url?: string;
}): Promise<Organization> {
  const res = await apiPost('/api/organizations', data);
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

// --- Projects ---

export async function getProjects(organizationId?: string): Promise<Project[]> {
  try {
    const params = organizationId ? `?organization_id=${organizationId}` : '';
    const res = await apiGet(`/api/projects${params}`);
    if (!res.ok) {
      console.warn(`getProjects: ${res.status} ${res.statusText}`);
      return [];
    }
    return res.json();
  } catch (err) {
    console.warn('getProjects failed:', err);
    return [];
  }
}

export async function createProject(data: {
  organization_id: string;
  name: string;
  slug?: string;
  description?: string;
  repos?: { name: string; url: string; branch?: string }[];
}): Promise<Project> {
  const res = await apiPost('/api/projects', data);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create project: ${res.status} ${body}`);
  }
  return res.json();
}

// --- Specifications ---

export async function getSpecification(specId: string): Promise<Specification | null> {
  try {
    const res = await apiGet(`/api/development/specifications/${specId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// --- Workflows ---

export async function getWorkflows(params?: {
  status?: string;
  project_id?: string;
}): Promise<Workflow[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.project_id) searchParams.set('project_id', params.project_id);
    const qs = searchParams.toString();
    const res = await apiGet(`/api/development/workflows${qs ? `?${qs}` : ''}`);
    if (!res.ok) {
      console.warn(`getWorkflows: ${res.status} ${res.statusText}`);
      return [];
    }
    return res.json();
  } catch (err) {
    console.warn('getWorkflows failed:', err);
    return [];
  }
}

export async function getWorkflow(workflowId: string): Promise<Workflow> {
  const res = await apiGet(`/api/development/workflows/${workflowId}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch workflow: ${res.status} ${body}`);
  }
  return res.json();
}

export async function createWorkflow(data: {
  organization_id: string;
  project_id?: string;
  title: string;
  description?: string;
  spec_title: string;
  spec_text: string;
  acceptance_criteria?: string;
  target_repos?: string[];
  priority?: string;
  agent_config?: Record<string, unknown>;
}): Promise<Workflow> {
  const res = await apiPost('/api/development/workflows', data);
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

export async function updateWorkflow(workflowId: string, data: { title?: string; description?: string }): Promise<Workflow> {
  const res = await apiFetch(`/api/development/workflows/${workflowId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update workflow: ${res.status} ${body}`);
  }
  return res.json();
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  const res = await apiDelete(`/api/development/workflows/${workflowId}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to delete workflow: ${res.status} ${body}`);
  }
}

export async function getWorkflowNodes(workflowId: string): Promise<WorkflowNode[]> {
  try {
    const res = await apiGet(`/api/development/workflows/${workflowId}/nodes`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getWorkflowEvents(workflowId: string, limit = 100): Promise<WorkflowEvent[]> {
  try {
    const res = await apiGet(`/api/development/workflows/${workflowId}/events?limit=${limit}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getWorkflowJobs(workflowId: string): Promise<WorkflowJob[]> {
  try {
    const res = await apiGet(`/api/development/workflows/${workflowId}/jobs`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// --- Approvals ---

export async function approveWorkflowPlan(workflowId: string, approved: boolean, note?: string) {
  const res = await apiPost(`/api/development/workflows/${workflowId}/approve-plan`, { approved, note });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to submit plan approval: ${res.status} ${body}`);
  }
  return res.json();
}

export async function approveWorkflowPR(workflowId: string, approved: boolean, note?: string) {
  const res = await apiPost(`/api/development/workflows/${workflowId}/approve-pr`, { approved, note });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to submit PR approval: ${res.status} ${body}`);
  }
  return res.json();
}

export async function approveWorkflowQA(workflowId: string, approved: boolean, note?: string) {
  const res = await apiPost(`/api/development/workflows/${workflowId}/approve-qa`, { approved, note });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to submit QA approval: ${res.status} ${body}`);
  }
  return res.json();
}

export async function approveWorkflowClient(workflowId: string, approved: boolean, note?: string) {
  const res = await apiPost(`/api/development/workflows/${workflowId}/approve-client`, { approved, note });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to submit client approval: ${res.status} ${body}`);
  }
  return res.json();
}

// --- Retry / Cancel ---

export async function retryWorkflow(workflowId: string, jobId?: string) {
  const res = await apiPost(`/api/development/workflows/${workflowId}/retry`, { job_id: jobId });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to retry workflow: ${res.status} ${body}`);
  }
  return res.json();
}

export async function cancelWorkflow(workflowId: string) {
  const res = await apiPost(`/api/development/workflows/${workflowId}/cancel`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to cancel workflow: ${res.status} ${body}`);
  }
  return res.json();
}

// --- Timeline ---

export async function getTimelineEntries(workflowId: string, visibility?: string): Promise<TimelineEntry[]> {
  try {
    const params = visibility ? `?visibility=${visibility}` : '';
    const res = await apiGet(`/api/development/workflows/${workflowId}/timeline${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createTimelineEntry(
  workflowId: string,
  data: { card_type?: string; content: string; visibility?: string; todos?: Array<{ id: string; text: string; completed: boolean }>; parent_entry_id?: string }
): Promise<TimelineEntry> {
  const res = await apiPost(`/api/development/workflows/${workflowId}/timeline`, data);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create timeline entry: ${res.status} ${body}`);
  }
  return res.json();
}

export async function updateTimelineEntry(
  workflowId: string,
  entryId: string,
  data: { content?: string; visibility?: string; todos?: Array<{ id: string; text: string; completed: boolean }> }
): Promise<TimelineEntry> {
  const res = await apiFetch(`/api/development/workflows/${workflowId}/timeline/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update timeline entry: ${res.status} ${body}`);
  }
  return res.json();
}

export async function deleteTimelineEntry(workflowId: string, entryId: string): Promise<void> {
  const res = await apiDelete(`/api/development/workflows/${workflowId}/timeline/${entryId}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to delete timeline entry: ${res.status} ${body}`);
  }
}

export async function publishTimelineEntry(workflowId: string, entryId: string): Promise<TimelineEntry> {
  const res = await apiPost(`/api/development/workflows/${workflowId}/timeline/${entryId}/publish`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to publish timeline entry: ${res.status} ${body}`);
  }
  return res.json();
}

export async function toggleTodo(workflowId: string, entryId: string, todoId: string, completed: boolean): Promise<TimelineEntry> {
  const res = await apiFetch(`/api/development/workflows/${workflowId}/timeline/${entryId}/todos/${todoId}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to toggle todo: ${res.status} ${body}`);
  }
  return res.json();
}

// --- User ---

export async function getUserMe(): Promise<{ _id: string; workos_user_id: string; email: string; roles: string[]; organizations: Organization[] } | null> {
  try {
    const res = await apiGet('/api/users/me');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
