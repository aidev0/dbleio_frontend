// Brand, Seat, Audience, and Asset types

export interface Brand {
  _id: string;
  organization_id: string;
  name: string;
  slug?: string;
  url?: string;
  product_name?: string;
  description?: string;
  industry?: string;
  logo_url?: string;
  platforms: string[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Seat {
  _id: string;
  brand_id: string;
  organization_id?: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'invited' | 'suspended';
  invited_by?: string;
  invited_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AudienceDemographics {
  age_range?: number[];
  gender: string[];
  generation?: string;
  locations: string[];
  income_level: string[];
  interests: string[];
  behaviors: string[];
}

export interface Audience {
  _id: string;
  brand_id: string;
  campaign_id?: string;
  name: string;
  description?: string;
  demographics: AudienceDemographics;
  size_estimate?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StrategyAudienceControl {
  location: string[];
  zip_codes: string[];
  in_market_interests: string[];
}

export interface StrategyPerformanceObjective {
  value?: number;
  kpi?: string;
}

export interface Strategy {
  _id: string;
  campaign_id: string;
  name: string;
  budget_amount?: number;
  budget_type?: string;
  performance_objective?: StrategyPerformanceObjective;
  audience_control?: StrategyAudienceControl;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BrandAsset {
  _id: string;
  brand_id: string;
  name: string;
  asset_type: string;
  url?: string;
  file_name?: string;
  file_size?: number;
  content_type?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}
