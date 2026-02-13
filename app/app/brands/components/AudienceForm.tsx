"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AudienceFormProps {
  brandId: string;
  onSubmit: (data: {
    brand_id: string;
    name: string;
    description?: string;
    demographics?: {
      age_range?: number[];
      gender?: string[];
      locations?: string[];
      income_level?: string[];
      interests?: string[];
      behaviors?: string[];
    };
    size_estimate?: number;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function AudienceForm({ brandId, onSubmit, onCancel, loading }: AudienceFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [locations, setLocations] = useState('');
  const [interests, setInterests] = useState('');
  const [sizeEstimate, setSizeEstimate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const demographics: Record<string, unknown> = {};
    if (ageMin || ageMax) demographics.age_range = [Number(ageMin) || 18, Number(ageMax) || 65];
    if (locations) demographics.locations = locations.split(',').map(l => l.trim()).filter(Boolean);
    if (interests) demographics.interests = interests.split(',').map(i => i.trim()).filter(Boolean);

    await onSubmit({
      brand_id: brandId,
      name,
      description: description || undefined,
      demographics: Object.keys(demographics).length > 0 ? demographics : undefined,
      size_estimate: sizeEstimate ? Number(sizeEstimate) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="audience-name">Audience Name *</Label>
        <Input
          id="audience-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Young Professionals"
          required
        />
      </div>
      <div>
        <Label htmlFor="audience-desc">Description</Label>
        <Textarea
          id="audience-desc"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe this audience segment..."
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="age-min">Age Min</Label>
          <Input id="age-min" type="number" value={ageMin} onChange={e => setAgeMin(e.target.value)} placeholder="18" />
        </div>
        <div>
          <Label htmlFor="age-max">Age Max</Label>
          <Input id="age-max" type="number" value={ageMax} onChange={e => setAgeMax(e.target.value)} placeholder="45" />
        </div>
      </div>
      <div>
        <Label htmlFor="locations">Locations (comma-separated)</Label>
        <Input id="locations" value={locations} onChange={e => setLocations(e.target.value)} placeholder="US, UK, Canada" />
      </div>
      <div>
        <Label htmlFor="interests">Interests (comma-separated)</Label>
        <Input id="interests" value={interests} onChange={e => setInterests(e.target.value)} placeholder="fitness, tech, fashion" />
      </div>
      <div>
        <Label htmlFor="size-est">Estimated Audience Size</Label>
        <Input id="size-est" type="number" value={sizeEstimate} onChange={e => setSizeEstimate(e.target.value)} placeholder="50000" />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={!name.trim() || loading}>
          {loading ? 'Creating...' : 'Create Audience'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
