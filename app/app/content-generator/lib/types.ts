// Content Generation Workflow Types

export type ContentWorkflowStatus = 'pending' | 'running' | 'paused' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';

export type StageType = 'human' | 'agent' | 'auto' | 'both';

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
  approvalRequired: boolean;
  available: boolean;
  rejectTarget?: string;
  feedbackTarget?: string;
}

export const CONTENT_PIPELINE_STAGES: StageDefinition[] = [
  { key: 'brand', label: 'Brand', stageType: 'human', description: 'Review brand details, URLs, and social profiles.', approvalRequired: false, available: true },
  { key: 'campaign_strategy', label: 'Campaign & Strategy', stageType: 'human', description: 'Select campaign, strategy, and manage brand assets.', approvalRequired: false, available: true },
  { key: 'research', label: 'Research', stageType: 'agent', description: 'Discover trends and identify patterns relevant to your audience.', approvalRequired: false, available: false },
  { key: 'scheduling', label: 'Scheduling', stageType: 'human', description: 'Plan the content calendar.', approvalRequired: false, available: true },
  { key: 'concepts', label: 'Concepts', stageType: 'both', description: 'Generate ideas and develop scripts for content pieces.', approvalRequired: false, available: true },
  { key: 'image_generation', label: 'Image Generation', stageType: 'agent', description: 'Generate concept art and reference images for each concept before storyboarding.', approvalRequired: false, available: true },
  { key: 'storyboard', label: 'Storyboard', stageType: 'both', description: 'Generate detailed storylines with scenes, characters, and visual assets for each concept.', approvalRequired: false, available: true },
  { key: 'video_generation', label: 'Video Generation', stageType: 'agent', description: 'Produce videos and voiceovers using AI.', approvalRequired: false, available: true },
  { key: 'simulation_testing', label: 'Simulation & Testing', stageType: 'both', description: 'Model audience personas and run A/B testing to predict content performance.', approvalRequired: false, available: true },
  { key: 'brand_qa', label: 'Brand QA', stageType: 'human', description: 'Ensure content aligns with brand guidelines and safety requirements.', approvalRequired: true, available: false, rejectTarget: 'concepts' },
  { key: 'fdm_review', label: 'FDM Review', stageType: 'human', description: 'Team members review, edit, or override AI decisions and run compliance checks.', approvalRequired: true, available: false, rejectTarget: 'concepts' },
  { key: 'publish', label: 'Publish', stageType: 'auto', description: 'Deploy content across channels (3 reels/week, daily stories).', approvalRequired: false, available: false },
  { key: 'metrics', label: 'Metrics', stageType: 'auto', description: 'Track performance data and ROI for each piece of content.', approvalRequired: false, available: false },
  { key: 'analytics', label: 'Analytics', stageType: 'agent', description: 'Generate insights and build predictive models from the data.', approvalRequired: false, available: false, feedbackTarget: 'scheduling' },
  { key: 'channel_learning', label: 'Channel-Specific Learning', stageType: 'agent', description: 'Adapt strategies based on what works on each platform.', approvalRequired: false, available: false },
  { key: 'ab_testing', label: 'A/B Testing', stageType: 'agent', description: 'Test content variations to identify top performers and optimize future content.', approvalRequired: false, available: false },
  { key: 'reinforcement_learning', label: 'Reinforcement Learning', stageType: 'auto', description: 'Continuously fine-tune the system to improve future outputs.', approvalRequired: false, available: false, feedbackTarget: 'research' },
];

export const CONTENT_STAGE_MAP = Object.fromEntries(CONTENT_PIPELINE_STAGES.map(s => [s.key, s]));
export const CONTENT_STAGE_LABELS = Object.fromEntries(CONTENT_PIPELINE_STAGES.map(s => [s.key, s.label]));
