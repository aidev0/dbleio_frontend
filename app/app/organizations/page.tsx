"use client";

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { getOrganizations, getUserMe } from '../developer/lib/api';
import type { Organization } from '../developer/lib/types';

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [orgs, me] = await Promise.all([getOrganizations(), getUserMe()]);
        setOrganizations(orgs);
        if (me?.email) setUserEmail(me.email);
      } catch (err) {
        console.error('Failed to load organizations:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-light">Organizations</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Organizations you have access to.
          </p>
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
              No organizations found
            </p>
          </div>
        )}

        {!loading && organizations.length > 0 && (
          <div className="space-y-3">
            {organizations.map((org) => (
              <div
                key={org._id}
                className="rounded-lg border border-border bg-background p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
                style={{ animation: 'timeline-card-enter 0.4s ease-out both' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {org.logo_url ? (
                      <img
                        src={org.logo_url}
                        alt={org.name}
                        className="h-8 w-8 shrink-0 rounded object-contain"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-base font-medium truncate">
                        {org.brand_name || org.name}
                      </h3>
                      {org.slug && (
                        <p className="font-mono text-[10px] text-muted-foreground">
                          /{org.slug}
                        </p>
                      )}
                    </div>
                  </div>
                  {org.industry && (
                    <span className="inline-flex shrink-0 rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {org.industry}
                    </span>
                  )}
                </div>

                {org.brand_description && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {org.brand_description}
                  </p>
                )}

                {org.url && (
                  <div className="mt-3">
                    <a
                      href={org.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                      {org.url}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
