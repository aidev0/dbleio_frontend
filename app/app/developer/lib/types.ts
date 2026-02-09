// Developer Workflow Types

export type UserRole = 'admin' | 'fde' | 'fdm' | 'qa' | 'client';

export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type NodeType = 'auto' | 'agent' | 'human';

export type NodeStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'waiting_approval';

export type AgentProvider =
  | 'claude_api'
  | 'gemini_api'
  | 'gpt_api'
  | 'claude_code_cli'
  | 'gemini_cli'
  | 'codex_cli';

export type ApprovalType = 'fde_plan' | 'fde_pr' | 'qa' | 'client';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  url?: string;
  brand_name?: string;
  brand_description?: string;
  product_description?: string;
  industry?: string;
  logo_url?: string;
  role?: string;
  joined_at?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  _id: string;
  organization_id: string;
  name: string;
  slug?: string;
  description?: string;
  repos: RepoConfig[];
  deployment_config?: DeploymentConfig;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RepoConfig {
  name: string;
  url: string;
  branch?: string;
  path?: string;
}

export interface DeploymentTarget {
  name: string;
  provider: string;
  url?: string;
  health_check_url?: string;
  config?: Record<string, unknown>;
}

export interface DeploymentConfig {
  targets: DeploymentTarget[];
}

export interface Specification {
  _id: string;
  organization_id: string;
  project_id: string;
  title: string;
  spec_text: string;
  acceptance_criteria?: string;
  target_repos: string[];
  priority: Priority;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Workflow {
  _id: string;
  organization_id: string;
  project_id: string;
  specification_id: string;
  title: string;
  description?: string;
  status: WorkflowStatus;
  current_stage: string;
  current_stage_index: number;
  agent_config?: Record<string, unknown>;
  nodes?: WorkflowNode[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowNode {
  _id: string;
  workflow_id: string;
  stage_name: string;
  stage_index: number;
  node_type: NodeType;
  status: NodeStatus;
  iteration: number;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  started_at?: string;
  completed_at?: string;
}

export interface WorkflowJob {
  _id: string;
  workflow_id: string;
  job_type: string;
  stage_name: string;
  status: string;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  attempt: number;
  max_attempts: number;
  claimed_by?: string;
  error?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface WorkflowEvent {
  _id: string;
  workflow_id: string;
  event_type: string;
  actor_type: string;
  actor_id: string;
  message: string;
  node_id?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface WorkflowApproval {
  _id: string;
  workflow_id: string;
  approval_type: ApprovalType;
  approved: boolean;
  note?: string;
  approved_by: string;
  created_at: string;
}

// --- Timeline types ---

export type CardType = 'user_message' | 'ai_message' | 'fde_message' | 'task_card' | 'approval_card' | 'status_update';
export type Visibility = 'public' | 'internal';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  completed_at?: string;
}

export interface TimelineEntry {
  _id: string;
  workflow_id: string;
  card_type: CardType;
  content: string;
  author_id: string;
  author_name: string;
  author_role: string;
  visibility: Visibility;
  todos?: TodoItem[];
  approval_data?: { type: string; approved?: boolean; note?: string };
  status_data?: { stage: string; status: string; message: string };
  parent_entry_id?: string;
  ai_model?: string;
  edited_by?: string;
  is_deleted?: boolean;
  processing?: boolean;
  created_at: string;
  updated_at: string;
}

// Stage display metadata
export const STAGE_LABELS: Record<string, string> = {
  spec_intake: 'Spec Intake',
  setup: 'Setup',
  planner: 'Planner',
  plan_reviewer: 'Plan Review',
  plan_approval: 'Plan Approval',
  developer: 'Developer',
  code_reviewer: 'Code Review',
  validator: 'Validator',
  commit_pr: 'Commit & PR',
  deployer: 'Deploy',
  qa_review: 'QA Review',
  client_review: 'Client Review',
};
