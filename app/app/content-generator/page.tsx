"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import {
  getContentWorkflows,
  getBrands,
  createContentWorkflow,
  getUserMe,
  getOrganizations,
  createOrganization,
  createBrand,
} from './lib/api';
import type { ContentWorkflow } from './lib/types';
import type { Brand } from '../brands/lib/types';

export default function ContentGeneratorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [myOrgIds, setMyOrgIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        // Load user info for org context
        const me = await getUserMe();
        if (me?.organizations) {
          setMyOrgIds(me.organizations.map((o: { _id: string }) => o._id));
        }

        // Load workflows and redirect to the latest one
        const workflows = await getContentWorkflows();
        if (workflows.length > 0) {
          const active = workflows.find((w) =>
            ['running', 'waiting_approval', 'pending'].includes(w.status)
          );
          const pick = active || workflows[0];
          router.replace(`/app/content-generator/${pick._id}`);
          return;
        }

        // No workflows — load brands for creation
        const brs = await getBrands();
        setBrands(brs);
      } catch (err) {
        console.error('Failed to load:', err);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const ensureBrand = async (): Promise<string | null> => {
    if (brands.length > 0) return brands[0]._id;
    try {
      const orgs = await getOrganizations();
      let orgId = orgs.find((o) => myOrgIds.includes(o._id))?._id || orgs[0]?._id;
      if (!orgId) {
        const newOrg = await createOrganization({ name: 'Default', slug: 'default' });
        orgId = newOrg._id;
      }
      const newBrand = await createBrand({ organization_id: orgId!, name: 'Default Brand', slug: 'default-brand' });
      setBrands([newBrand]);
      return newBrand._id;
    } catch {
      return null;
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const brandId = await ensureBrand();
      if (!brandId) {
        setError('Could not find or create a brand.');
        setCreating(false);
        return;
      }
      const wf = await createContentWorkflow({
        brand_id: brandId,
        title: 'New Content Pipeline',
        config: {},
      });
      router.replace(`/app/content-generator/${wf._id}`);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj?.message || 'Failed to create workflow.');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No workflows exist — show create prompt
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center space-y-4 max-w-sm">
        <h2 className="text-lg font-medium">Content Generator</h2>
        <p className="text-sm text-muted-foreground">
          No content pipelines yet. Create your first one to get started.
        </p>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create Content Pipeline
        </button>
      </div>
    </div>
  );
}
