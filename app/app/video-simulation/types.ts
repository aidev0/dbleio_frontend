/**
 * Shared TypeScript types matching backend models
 */

// Campaign types
export interface Advertiser {
  business_name?: string;
  website_url?: string;
}

export interface PerformanceObjective {
  value?: number;
  kpi?: string; // ROAS, CPA, CPL, CPC, CTR, etc.
}

export interface AudienceControl {
  location?: string[];
  zip_codes?: string[];
  in_market_interests?: string[];
}

export interface Strategy {
  name?: string;
  budget_amount?: number;
  budget_type?: string; // daily, weekly, monthly
  audience_control?: AudienceControl;
}

export interface Campaign {
  id: string;
  _id?: string; // MongoDB ObjectId
  name: string;
  description?: string;
  platform?: string; // vibe.co, facebook, instagram, linkedin, tiktok, x
  advertiser?: Advertiser;
  campaign_goal?: string; // awareness, traffic, leads, sales, retargeting, app_promotion
  performance_objective?: PerformanceObjective;
  strategies?: Strategy[];
  created_at?: string;
  updated_at?: string;
}

// Persona types
export interface Demographics {
  // New format - arrays for multi-select
  age?: string[];
  gender?: string[];
  locations?: string[];
  country?: string[];
  region?: string[];
  zip_codes?: string[];
  race?: string[];
  careers?: string[];
  education?: string[];
  income_level?: string[];
  household_count?: string[];
  household_type?: string[];
  custom_fields?: { [key: string]: string[] };

  // Original demo format - statistical fields (optional)
  age_mean?: number;
  age_std?: number;
  num_orders_mean?: number;
  num_orders_std?: number;
  revenue_per_customer_mean?: number;
  revenue_per_customer_std?: number;
  weight?: number;
}

export interface Persona {
  id: string;
  _id?: string; // MongoDB ObjectId
  campaign_id?: string;
  name: string;
  demographics: Demographics;
  description?: string;
  ai_generated: boolean;
  model_provider?: string;
  model_name?: string;
  created_at?: string;
  updated_at?: string;
}

// Video types
export interface Video {
  id: string;
  title: string;
  name?: string;
  url: string;
  campaign_id: string;
  gs_uri: string;
  thumbnail_url: string | null | undefined;
  duration?: number;
  path?: string;
  analysis?: any;
  created_at?: string;
  updated_at?: string;
}

// Chat types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Evaluation types
export interface ModelEvaluation {
  persona_id: string; // Changed from number to string to match Persona.id
  persona_name: string;
  provider: string;
  model: string;
  model_full_name?: string;
  evaluation: {
    most_preferred_video: string | number;
    preference_ranking: (string | number)[];
    confidence_score: number;
    video_opinions: { [key: string]: string };
    reasoning: string;
    semantic_analysis: string;
  };
}
