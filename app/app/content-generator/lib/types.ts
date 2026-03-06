// Content Generation Workflow Types

export type ContentWorkflowStatus = 'pending' | 'running' | 'paused' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';

export type StageType = 'human' | 'agent' | 'both';

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval';

export interface ContentWorkflow {
  _id: string;
  brand_id: string;
  organization_id: string;
  title: string;
  description?: string;
  status: ContentWorkflowStatus;
  current_stage: string;
  current_stage_index: number;
  config: Record<string, unknown>;
  nodes?: ContentWorkflowNode[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContentWorkflowNode {
  _id: string;
  workflow_id: string;
  stage_key: string;
  stage_index: number;
  stage_type: StageType;
  status: NodeStatus;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  error?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContentTimelineEntry {
  _id: string;
  workflow_id: string;
  card_type: string;
  content: string;
  author_id: string;
  author_name?: string;
  author_role: string;
  visibility: 'public' | 'internal';
  parent_entry_id?: string;
  is_deleted?: boolean;
  todos?: Array<{ id: string; text: string; completed: boolean; completed_at?: string }>;
  approval_data?: { type: string; approved?: boolean; note?: string };
  status_data?: { stage: string; status: string; message: string };
  processing?: boolean;
  edited_by?: string;
  ai_model?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStateSnapshot {
  workflow_id: string;
  state: {
    current_stage: string;
    status: string;
    stage_outputs: Record<string, unknown>;
    approval_history: Array<{
      stage: string;
      approved: boolean;
      actor_id: string;
      note?: string;
      timestamp: string;
    }>;
    feedback_loops: Array<{
      from_stage: string;
      to_stage: string;
      reason: string;
      timestamp: string;
    }>;
  };
  created_at?: string;
  updated_at?: string;
}

// --- 15-Stage Pipeline (source of truth for frontend) ---

export interface StageDefinition {
  key: string;
  label: string;
  stageType: StageType;
  description: string;
  category: string;
  approvalRequired: boolean;
  available: boolean;
  rejectTarget?: string;
  feedbackTarget?: string;
}

export const CONTENT_PIPELINE_STAGES: StageDefinition[] = [
  // --- Input ---
  { key: 'brand', label: 'Brand', stageType: 'human', description: 'Review brand details, URLs, and social profiles.', category: 'Input', approvalRequired: false, available: true },
  { key: 'campaign_strategy', label: 'Campaign & Strategy & Assets', stageType: 'human', description: 'Select campaign, strategy, and manage brand assets.', category: 'Input', approvalRequired: false, available: true },
  { key: 'research', label: 'Research', stageType: 'agent', description: 'Discover trends and identify patterns relevant to your audience.', category: 'Input', approvalRequired: false, available: true },
  { key: 'scheduling', label: 'Scheduling', stageType: 'human', description: 'Plan the content calendar.', category: 'Input', approvalRequired: false, available: true },
  // --- Content Generation ---
  { key: 'concepts', label: 'Concepts', stageType: 'both', description: 'Generate ideas and develop scripts for content pieces.', category: 'Content Generation', approvalRequired: false, available: true },
  { key: 'image_generation', label: 'Image Generation', stageType: 'agent', description: 'Generate concept art and reference images for each concept before storyboarding.', category: 'Content Generation', approvalRequired: false, available: true },
  { key: 'storyboard', label: 'Storyboard', stageType: 'both', description: 'Generate detailed storylines with scenes, characters, and visual assets for each concept.', category: 'Content Generation', approvalRequired: false, available: true },
  { key: 'video_generation', label: 'Video Generation', stageType: 'agent', description: 'Produce videos and voiceovers using AI.', category: 'Content Generation', approvalRequired: false, available: true },
  // --- Simulation ---
  { key: 'simulation_testing', label: 'Simulation & Testing', stageType: 'both', description: 'Model audience personas and run A/B testing to predict content performance.', category: 'Simulation', approvalRequired: false, available: true },
  { key: 'predictive_modeling', label: 'Predictive Modeling', stageType: 'agent', description: 'Build predictive models to forecast content performance across channels.', category: 'Simulation', approvalRequired: false, available: true },
  { key: 'content_ranking', label: 'Content Ranking', stageType: 'agent', description: 'Rank and prioritize content variants based on predicted performance.', category: 'Simulation', approvalRequired: false, available: true },
  // --- Review & Publish ---
  { key: 'fdm_review', label: 'FDM Review', stageType: 'human', description: 'Team members review, edit, or override AI decisions and run compliance checks.', category: 'Review & Publish', approvalRequired: true, available: true, rejectTarget: 'concepts' },
  { key: 'brand_qa', label: 'Brand QA', stageType: 'human', description: 'Ensure content aligns with brand guidelines and safety requirements.', category: 'Review & Publish', approvalRequired: true, available: true, rejectTarget: 'concepts' },
  { key: 'publish', label: 'Publish', stageType: 'agent', description: 'Deploy content across channels (3 reels/week, daily stories).', category: 'Review & Publish', approvalRequired: false, available: false },
  // --- Analysis ---
  { key: 'analytics', label: 'A/B Testing & Analytics', stageType: 'agent', description: 'Run A/B tests, generate insights, and build predictive models from performance data.', category: 'Analysis', approvalRequired: false, available: false, feedbackTarget: 'research' },
];

export const CONTENT_STAGE_MAP = Object.fromEntries(CONTENT_PIPELINE_STAGES.map(s => [s.key, s]));
export const CONTENT_STAGE_LABELS = Object.fromEntries(CONTENT_PIPELINE_STAGES.map(s => [s.key, s.label]));

// --- Research types ---

export interface ResearchVideoAI {
  hook_type?: string;
  hook_text?: string;
  hook_effectiveness?: string;
  num_scenes?: number;
  duration?: number;
  pacing?: string;
  characters?: Array<{ age_range: string; gender: string; description: string }>;
  textures?: string[];
  objects?: string[];
  colors?: string[];
  transcription?: string;
  music_mood?: string;
  cta?: string;
  content_format?: string;
  success_factors?: string[];
  improvement_suggestions?: string[];
  error?: string;
}

export interface ResearchTopPerformer {
  id: string;
  type: 'post' | 'reel';
  shortCode?: string;
  engagement_score: number;
  likesCount: number;
  commentsCount: number;
  videoPlayCount: number;
  caption: string;
  displayUrl?: string;
  videoUrl?: string;
  timestamp?: string;
  hashtags?: string[];
  url?: string;
  videoDuration?: number;
  ai_analysis?: ResearchVideoAI;
  extracted_frames?: Array<{ frame_index: number; timestamp_sec: number; signed_url: string; gs_uri: string; gcs_blob_name: string }>;
}

export interface ResearchInstagramData {
  username: string;
  followers: number;
  total_reels: number;
  top_count?: number;
  top_performers: ResearchTopPerformer[];
  success_analysis?: Record<string, unknown>;
  error?: string;
}

export interface ResearchBrandUrlAnalysis {
  url?: string;
  products?: string[];
  style?: string;
  colors?: string[];
  fonts?: string[];
  target_audience?: string;
  brand_voice?: string;
  key_messaging?: string[];
  raw_insights?: string;
  error?: string;
}

export interface ResearchTrendPoint {
  date: string;
  likes: number;
  comments: number;
  views: number;
  count: number;
}

export interface ResearchFinancialData {
  company_name?: string;
  revenue?: string | null;
  revenue_yoy_growth?: string | null;
  active_subscribers?: string | null;
  market_cap?: string | null;
  stock_price?: string | null;
  key_metrics?: Array<{ metric: string; value: string; period: string }>;
  recent_highlights?: string[];
  data_date?: string | null;
  source_quality?: string | null;
  error?: string;
}

export interface ResearchData {
  brand_url_analysis?: ResearchBrandUrlAnalysis;
  brand_instagram?: ResearchInstagramData;
  competitor_instagram?: Record<string, ResearchInstagramData>;
  trends?: Record<string, ResearchTrendPoint[]>;
  financial?: Record<string, ResearchFinancialData>;
}

// --- WS1: Content Calendar Item ---

export interface ContentCalendarItem {
  _id: string;
  workflow_id: string;
  brand_id?: string;
  organization_id?: string;
  platform: string;
  content_type: string;
  frequency?: string;
  days?: number[];
  start_date?: string;
  end_date?: string;
  post_time?: string;
  title?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

// --- Content Piece ---

export interface ContentPiece {
  _id: string;
  content_id: string;  // same as _id
  schedule_id: string;
  workflow_id: string;
  brand_id?: string;
  organization_id?: string;
  platform: string;
  content_type: string;
  date: string;
  post_time?: string;
  title?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

// --- WS3: Enhanced Storyboard Scene ---

export interface StoryboardCharacterDescription {
  character_id: string;
  appearance_in_scene: string;
}

export interface StoryboardScene {
  id: string;
  scene_number: number;
  title: string;
  description: string;
  dialog?: string;
  lighting?: string;
  time_of_day?: string;
  camera_move?: string;
  character_descriptions?: StoryboardCharacterDescription[];
  shot_type: string;
  duration_hint: string;
  character_ids: string[];
  image_prompt: string;
  image_url?: string | null;
  gs_uri?: string | null;
  image_model?: string;
}

// --- WS4: Feedback Types ---

export interface FeedbackItem {
  _id: string;
  workflow_id: string;
  content_id?: string;
  stage_key: string;
  item_type: string;
  item_id: string;
  user_id: string;
  user_name?: string;
  reaction?: 'like' | 'dislike' | null;
  comment?: string | null;
  source?: 'fdm' | 'client';
  created_at: string;
  updated_at: string;
}

export interface FeedbackSummaryItem {
  item_id: string;
  likes: number;
  dislikes: number;
  comments: number;
}
