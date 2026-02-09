"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import WorkflowStatusBadge from './components/WorkflowStatusBadge';
import TimelineInput from '@/components/timeline/TimelineInput';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import {
  getWorkflows,
  getOrganizations,
  getProjects,
  createWorkflow,
  createOrganization,
  updateWorkflow,
  deleteWorkflow,
  getUserMe,
} from './lib/api';
import type { Workflow, Organization, Project } from './lib/types';
import { STAGE_LABELS } from './lib/types';

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  const date = new Date(utcStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '';
  const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  const d = new Date(utcStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function DeveloperPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [myOrgIds, setMyOrgIds] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Detect user's org IDs and roles
  useEffect(() => {
    (async () => {
      const me = await getUserMe();
      if (me?.organizations) {
        setMyOrgIds(me.organizations.map((o: Organization) => o._id));
      }
      if (me?.roles?.includes('admin')) {
        setIsAdmin(true);
      }
      setRoleLoaded(true);
    })();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [wfs, orgs, projs] = await Promise.all([
        getWorkflows(),
        getOrganizations(),
        getProjects(),
      ]);
      setWorkflows(wfs);
      setOrganizations(orgs);
      setProjects(projs);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const ensureOrg = async (): Promise<string | null> => {
    let org = selectedOrg || organizations.find((o) => myOrgIds.includes(o._id)) || organizations[0] || null;
    if (!org) {
      try {
        org = await createOrganization({ name: 'Default', slug: 'default' });
        setOrganizations((prev) => [...prev, org!]);
        setMyOrgIds((prev) => [...prev, org!._id]);
      } catch {
        const orgs = await getOrganizations();
        org = orgs[0] || null;
        if (!org) return null;
        setOrganizations(orgs);
      }
    }
    return org._id;
  };

  const handleQuickCreate = async (description: string, title?: string) => {
    setCreateError(null);
    try {
      const orgId = await ensureOrg();
      if (!orgId) {
        setCreateError('No organization found. Please create or join an organization first.');
        return;
      }

      const autoTitle = title || (description.length > 60 ? description.slice(0, 57) + '...' : description);
      const wf = await createWorkflow({
        organization_id: orgId,
        title: autoTitle,
        description,
        spec_title: autoTitle,
        spec_text: description,
      });
      router.push(`/app/developer/${wf._id}`);
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      if (errorObj?.status === 403) {
        setCreateError(errorObj.message || 'You don\u2019t have permission to create a workflow.');
      } else {
        setCreateError(errorObj?.message || 'Failed to create workflow. Please try again.');
      }
    }
  };

  const getProjectName = (projectId: string) => {
    const p = projects.find((proj) => proj._id === projectId);
    return p?.name || '';
  };

  const handleDelete = async (e: React.MouseEvent, workflowId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this workflow? This cannot be undone.')) return;
    try {
      await deleteWorkflow(workflowId);
      setWorkflows((prev) => prev.filter((wf) => wf._id !== workflowId));
    } catch (err) {
      console.error('Failed to delete workflow:', err);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, wf: Workflow) => {
    e.stopPropagation();
    setEditingId(wf._id);
    setEditTitle(wf.title);
  };

  const handleSaveEdit = async (e: React.MouseEvent, workflowId: string) => {
    e.stopPropagation();
    try {
      const updated = await updateWorkflow(workflowId, { title: editTitle });
      setWorkflows((prev) => prev.map((wf) => wf._id === workflowId ? { ...wf, title: updated.title } : wf));
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update workflow:', err);
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  // Filter workflows by selected org
  const filteredWorkflows = selectedOrg
    ? workflows.filter((wf) => wf.organization_id === selectedOrg._id)
    : workflows;

  if (!roleLoaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6">
      <div className="relative py-8 md:py-12">
        {/* Vertical timeline line — aligned with TimelineContainer axis */}
        <div className="absolute left-[1.875rem] md:left-[2.375rem] top-0 bottom-0 w-px bg-border" />

        {/* Workflows section */}
        <div className="relative">

          {/* Section label */}
          {selectedOrg && (
            <div className="mb-3 flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Workflows — {selectedOrg.brand_name || selectedOrg.name}
              </span>
              <button
                onClick={() => setSelectedOrg(null)}
                className="font-mono text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                (show all)
              </button>
            </div>
          )}

          {/* Create input at top */}
          <TimelineInput
            onSubmit={handleQuickCreate}
            placeholder="Describe a feature to build..."
            titleField
            titlePlaceholder="Title (optional)"
          />

          {createError && (
            <div className="my-3 ml-[calc(1.5rem+1.5rem)] md:ml-[calc(2rem+1.5rem)] rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              {createError}
            </div>
          )}

          {/* Loading */}
          {loading && workflows.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-b-2 border-foreground" />
                <span className="font-mono text-xs text-muted-foreground">Loading workflows...</span>
              </div>
            </div>
          )}

          {/* Workflow list as timeline cards */}
          {filteredWorkflows.map((wf, index) => (
            <div
              key={wf._id}
              className="relative flex items-start cursor-pointer"
              style={{
                animation: 'timeline-card-enter 0.4s ease-out both',
                animationDelay: `${Math.min(index * 50, 500)}ms`,
              }}
              onClick={() => router.push(`/app/developer/${wf._id}`)}
            >
              <div className="absolute left-6 md:left-8 top-4 z-10">
                <div
                  className="h-3 w-3 rounded-full bg-foreground"
                  style={{ animation: 'dot-appear 0.3s ease-out' }}
                />
              </div>
              <div className="ml-[calc(1.5rem+1.5rem)] md:ml-[calc(2rem+1.5rem)] w-[calc(100%-4.5rem)] md:w-[90%] py-3">
                <div className="group rounded-lg border border-border bg-background p-5 transition-all hover:border-foreground/20 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {editingId === wf._id ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 rounded border border-border bg-transparent px-2 py-1 text-base font-medium outline-none focus:border-foreground"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(e as unknown as React.MouseEvent, wf._id);
                              if (e.key === 'Escape') { setEditingId(null); }
                            }}
                          />
                          <button onClick={(e) => handleSaveEdit(e, wf._id)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={handleCancelEdit} className="rounded p-1 text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <h3 className="text-base font-medium">{wf.title}</h3>
                      )}
                      {getProjectName(wf.project_id) && (
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {getProjectName(wf.project_id)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleStartEdit(e, wf)}
                          className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={(e) => handleDelete(e, wf._id)}
                            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <WorkflowStatusBadge status={wf.status} />
                    </div>
                  </div>
                  {/* Current stage */}
                  {wf.current_stage && (
                    <div className="mt-2">
                      <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        {STAGE_LABELS[wf.current_stage] || wf.current_stage}
                      </span>
                    </div>
                  )}
                  {/* Description — 3 lines with expand */}
                  {wf.description && wf.description !== wf.title && (
                    <div className="mt-2">
                      <p className={`text-sm text-muted-foreground leading-relaxed ${expandedId === wf._id ? '' : 'line-clamp-3'}`}>
                        {wf.description}
                      </p>
                      {wf.description.length > 200 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === wf._id ? null : wf._id); }}
                          className="mt-1 font-mono text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors"
                        >
                          {expandedId === wf._id ? 'Show less' : 'Show more...'}
                        </button>
                      )}
                    </div>
                  )}
                  {/* Timestamps */}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground/50">
                    <span>Requested {formatShortDate(wf.created_at)}</span>
                    {wf.updated_at && wf.updated_at !== wf.created_at && (
                      <span>Updated {formatShortDate(wf.updated_at)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
