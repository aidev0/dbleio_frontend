"use client";

import { useEffect, useState } from 'react';
import { Building2, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiGet, apiPost, apiFetch, apiDelete } from '../video-simulation/lib/api';

interface Organization {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  url?: string;
  industry?: string;
  logo_url?: string;
  role?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

async function getOrganizations(): Promise<Organization[]> {
  try {
    const res = await apiGet('/api/organizations');
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

async function createOrganization(data: Record<string, unknown>): Promise<Organization> {
  const res = await apiPost('/api/organizations', data);
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try { detail = JSON.parse(body).detail || body; } catch { /* */ }
    throw new Error(detail);
  }
  return res.json();
}

async function updateOrganization(orgId: string, data: Record<string, unknown>): Promise<Organization> {
  const res = await apiFetch(`/api/organizations/${orgId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update organization');
  return res.json();
}

async function deleteOrganization(orgId: string): Promise<void> {
  const res = await apiDelete(`/api/organizations/${orgId}`);
  if (!res.ok) throw new Error('Failed to delete organization');
}

async function getUserMe() {
  try {
    const res = await apiGet('/api/users/me');
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<Record<string, boolean>>({});

  // Form state (shared for create + edit)
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formIndustry, setFormIndustry] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [orgs, me] = await Promise.all([getOrganizations(), getUserMe()]);
      setOrganizations(orgs);
      // Check ownership from user's embedded orgs
      if (me?.organizations) {
        const ownership: Record<string, boolean> = {};
        for (const o of me.organizations) {
          if (o.role === 'owner' || o.role === 'admin') ownership[o._id] = true;
        }
        setIsOwner(ownership);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setFormName('');
    setFormUrl('');
    setFormIndustry('');
    setFormDescription('');
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      await createOrganization({
        name: formName,
        url: formUrl || undefined,
        industry: formIndustry || undefined,
        description: formDescription || undefined,
      });
      setShowCreate(false);
      resetForm();
      await load();
    } catch (err: unknown) {
      setFormError((err as Error).message || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (org: Organization) => {
    setEditingId(org._id);
    setFormName(org.name);
    setFormUrl(org.url || '');
    setFormIndustry(org.industry || '');
    setFormDescription(org.description || '');
    setFormError(null);
  };

  const handleSaveEdit = async (orgId: string) => {
    setFormError(null);
    try {
      await updateOrganization(orgId, {
        name: formName,
        url: formUrl || undefined,
        industry: formIndustry || undefined,
        description: formDescription || undefined,
      });
      setEditingId(null);
      resetForm();
      await load();
    } catch (err: unknown) {
      setFormError((err as Error).message || 'Failed to update');
    }
  };

  const handleDelete = async (orgId: string) => {
    if (!confirm('Delete this organization? This cannot be undone.')) return;
    try {
      await deleteOrganization(orgId);
      await load();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 md:px-6 py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-light">Organizations</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Create and manage your organizations. You become the owner of any org you create.
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowCreate(true); }} size="sm" className="gap-1">
            <Plus className="h-3.5 w-3.5" /> New Org
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-foreground" />
          </div>
        )}

        {!loading && organizations.length === 0 && (
          <div className="rounded-lg border border-border p-12 text-center">
            <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              No organizations yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first organization to get started.
            </p>
            <Button onClick={() => setShowCreate(true)} size="sm" className="mt-4 gap-1">
              <Plus className="h-3.5 w-3.5" /> Create Organization
            </Button>
          </div>
        )}

        {!loading && organizations.length > 0 && (
          <div className="space-y-3">
            {organizations.map((org) => (
              <div
                key={org._id}
                className="group rounded-lg border border-border bg-background p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
              >
                {editingId === org._id ? (
                  <div className="space-y-3">
                    <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Organization Name" />
                    <Input value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="Website URL" />
                    <Input value={formIndustry} onChange={e => setFormIndustry(e.target.value)} placeholder="Industry" />
                    <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Description" rows={2} />
                    {formError && <p className="text-xs text-destructive">{formError}</p>}
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(org._id)} disabled={!formName.trim()}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); resetForm(); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {org.logo_url ? (
                          <img src={org.logo_url} alt={org.name} className="h-8 w-8 shrink-0 rounded object-contain" />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="text-base font-medium truncate">
                            {org.name}
                          </h3>
                          {org.slug && (
                            <p className="font-mono text-[10px] text-muted-foreground">/{org.slug}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {org.role && (
                          <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                            {org.role}
                          </span>
                        )}
                        {org.industry && (
                          <span className="inline-flex rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {org.industry}
                          </span>
                        )}
                        {isOwner[org._id] && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleStartEdit(org)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(org._id)} className="rounded p-1 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {org.description && (
                      <p className="mt-3 text-sm text-muted-foreground">{org.description}</p>
                    )}
                    {org.url && (
                      <a href={org.url} target="_blank" rel="noopener noreferrer" className="mt-2 block font-mono text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors">
                        {org.url}
                      </a>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="org-name">Organization Name *</Label>
                <Input id="org-name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g., My Company" required />
              </div>
              <div>
                <Label htmlFor="org-url">Website URL</Label>
                <Input id="org-url" value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="https://example.com" />
              </div>
              <div>
                <Label htmlFor="org-industry">Industry</Label>
                <Input id="org-industry" value={formIndustry} onChange={e => setFormIndustry(e.target.value)} placeholder="e.g., E-commerce, SaaS" />
              </div>
              <div>
                <Label htmlFor="org-desc">Description</Label>
                <Textarea id="org-desc" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Brief description..." rows={3} />
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={!formName.trim() || creating}>
                  {creating ? 'Creating...' : 'Create Organization'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
