"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface BrandFormProps {
  organizationId: string;
  onSubmit: (data: {
    organization_id: string;
    name: string;
    url?: string;
    product_name?: string;
    description?: string;
    industry?: string;
    platforms?: string[];
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function BrandForm({ organizationId, onSubmit, onCancel, loading }: BrandFormProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [platforms, setPlatforms] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      organization_id: organizationId,
      name,
      url: url || undefined,
      product_name: productName || undefined,
      description: description || undefined,
      industry: industry || undefined,
      platforms: platforms ? platforms.split(',').map(p => p.trim()).filter(Boolean) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="brand-name">Brand Name *</Label>
        <Input
          id="brand-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Acme Co"
          required
        />
      </div>
      <div>
        <Label htmlFor="brand-url">Website URL</Label>
        <Input
          id="brand-url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://example.com"
        />
      </div>
      <div>
        <Label htmlFor="product-name">Product / Product Line</Label>
        <Input
          id="product-name"
          value={productName}
          onChange={e => setProductName(e.target.value)}
          placeholder="e.g., Premium Skincare"
        />
      </div>
      <div>
        <Label htmlFor="industry">Industry</Label>
        <Input
          id="industry"
          value={industry}
          onChange={e => setIndustry(e.target.value)}
          placeholder="e.g., E-commerce, SaaS"
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Brief description of this brand..."
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor="platforms">Platforms (comma-separated)</Label>
        <Input
          id="platforms"
          value={platforms}
          onChange={e => setPlatforms(e.target.value)}
          placeholder="shopify, amazon, instagram"
        />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={!name.trim() || loading}>
          {loading ? 'Creating...' : 'Create Brand'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
