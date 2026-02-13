"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const AUDIENCE_TEMPLATES: Record<string, {
  name: string;
  description: string;
  demographics: {
    age_range?: number[];
    gender?: string[];
    generation?: string;
    locations?: string[];
    interests?: string[];
  };
  size_estimate?: number;
}> = {
  gen_z: {
    name: 'Gen Z',
    description: 'Digital natives born 1997–2012. Heavy on social media, short-form video, and authenticity.',
    demographics: { age_range: [13, 28], gender: ['All'], generation: 'Gen Z', interests: ['social media', 'short-form video', 'gaming', 'sustainability'] },
  },
  gen_alpha: {
    name: 'Gen Alpha',
    description: 'Born 2013+. Tablet-first generation, influenced by YouTube and gaming creators.',
    demographics: { age_range: [0, 12], gender: ['All'], generation: 'Gen Alpha', interests: ['gaming', 'YouTube', 'education', 'toys'] },
  },
  millennials: {
    name: 'Millennials',
    description: 'Born 1981–1996. Value experiences, digital-savvy, brand-loyal when engaged.',
    demographics: { age_range: [29, 44], gender: ['All'], generation: 'Millennial', interests: ['experiences', 'wellness', 'tech', 'travel'] },
  },
  gen_x: {
    name: 'Gen X',
    description: 'Born 1965–1980. High purchasing power, values quality and reliability.',
    demographics: { age_range: [45, 60], gender: ['All'], generation: 'Gen X', interests: ['finance', 'home improvement', 'travel', 'health'] },
  },
  influencers: {
    name: 'Influencers & Creators',
    description: 'Content creators and micro/macro influencers across platforms.',
    demographics: { age_range: [18, 40], gender: ['All'], generation: 'Mixed', interests: ['content creation', 'social media', 'brand partnerships', 'personal branding'] },
  },
  parents: {
    name: 'Parents',
    description: 'Parents with children at home. Focus on family, education, and convenience.',
    demographics: { age_range: [25, 50], gender: ['All'], generation: 'Mixed', interests: ['parenting', 'education', 'family activities', 'health'] },
  },
};

interface AudienceFormProps {
  brandId: string;
  onSubmit: (data: {
    brand_id: string;
    name: string;
    description?: string;
    demographics?: {
      age_range?: number[];
      gender?: string[];
      generation?: string;
      locations?: string[];
      income_level?: string[];
      interests?: string[];
      behaviors?: string[];
    };
    size_estimate?: number;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  initialValues?: {
    name?: string;
    description?: string;
    demographics?: {
      age_range?: number[];
      gender?: string[];
      generation?: string;
      locations?: string[];
      interests?: string[];
    };
    size_estimate?: number;
  };
  submitLabel?: string;
}

const GENDER_OPTIONS = ['All', 'Male', 'Female', 'Non-binary'];

export default function AudienceForm({ brandId, onSubmit, onCancel, loading, initialValues, submitLabel }: AudienceFormProps) {
  const [name, setName] = useState(initialValues?.name || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [ageMin, setAgeMin] = useState(initialValues?.demographics?.age_range?.[0] != null ? String(initialValues.demographics.age_range[0]) : '');
  const [ageMax, setAgeMax] = useState(initialValues?.demographics?.age_range?.[1] != null ? String(initialValues.demographics.age_range[1]) : '');
  const [gender, setGender] = useState<string[]>(initialValues?.demographics?.gender || ['All']);
  const [generation, setGeneration] = useState(initialValues?.demographics?.generation || '');
  const [locations, setLocations] = useState(initialValues?.demographics?.locations?.join(', ') || '');
  const [interests, setInterests] = useState(initialValues?.demographics?.interests?.join(', ') || '');
  const [sizeEstimate, setSizeEstimate] = useState(initialValues?.size_estimate != null ? String(initialValues.size_estimate) : '');

  const applyTemplate = (key: string) => {
    const t = AUDIENCE_TEMPLATES[key];
    if (!t) return;
    setName(t.name);
    setDescription(t.description);
    if (t.demographics.age_range) {
      setAgeMin(String(t.demographics.age_range[0]));
      setAgeMax(String(t.demographics.age_range[1]));
    }
    setGender(t.demographics.gender || ['All']);
    setGeneration(t.demographics.generation || '');
    setLocations(t.demographics.locations?.join(', ') || '');
    setInterests(t.demographics.interests?.join(', ') || '');
    if (t.size_estimate) setSizeEstimate(String(t.size_estimate));
  };

  const toggleGender = (g: string) => {
    if (g === 'All') {
      setGender(['All']);
      return;
    }
    const without = gender.filter(x => x !== 'All' && x !== g);
    if (gender.includes(g)) {
      setGender(without.length > 0 ? without : ['All']);
    } else {
      setGender([...without, g]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const demographics: Record<string, unknown> = {};
    if (ageMin || ageMax) demographics.age_range = [Number(ageMin) || 0, Number(ageMax) || 65];
    if (gender.length > 0 && !(gender.length === 1 && gender[0] === 'All')) demographics.gender = gender;
    else demographics.gender = ['All'];
    if (generation) demographics.generation = generation;
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
      {/* Templates */}
      {!initialValues && (
        <div>
          <Label className="text-xs text-muted-foreground">Quick start from template</Label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {Object.entries(AUDIENCE_TEMPLATES).map(([key, t]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyTemplate(key)}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
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
      {/* Generation */}
      <div>
        <Label htmlFor="generation">Generation</Label>
        <select
          id="generation"
          value={generation}
          onChange={e => setGeneration(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
        >
          <option value="">Select...</option>
          <option value="Gen Alpha">Gen Alpha (2013+)</option>
          <option value="Gen Z">Gen Z (1997–2012)</option>
          <option value="Millennial">Millennial (1981–1996)</option>
          <option value="Gen X">Gen X (1965–1980)</option>
          <option value="Boomer">Boomer (1946–1964)</option>
          <option value="Mixed">Mixed</option>
        </select>
      </div>
      {/* Gender */}
      <div>
        <Label>Gender</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {GENDER_OPTIONS.map(g => (
            <button
              key={g}
              type="button"
              onClick={() => toggleGender(g)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                gender.includes(g)
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
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
          {loading ? 'Saving...' : (submitLabel || 'Create Audience')}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
