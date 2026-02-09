// Custom Workflow Types

export type CustomWorkflowStatus = 'draft' | 'active' | 'archived';

export type CustomNodeType = 'step' | 'decision' | 'start' | 'end';

export type CustomNodeStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface CustomWorkflow {
  _id: string;
  organization_id: string;
  title: string;
  description?: string;
  status: CustomWorkflowStatus;
  source_dev_workflow_id?: string;
  created_by?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomGraphNode {
  _id: string;
  workflow_id: string;
  label: string;
  node_type: CustomNodeType;
  status: CustomNodeStatus;
  position_x: number;
  position_y: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CustomGraphEdge {
  _id: string;
  workflow_id: string;
  source_node_id: string;
  target_node_id: string;
  label?: string;
  condition?: string;
  edge_type: 'default' | 'conditional';
  created_at: string;
}

export interface CustomWorkflowGraph {
  nodes: CustomGraphNode[];
  edges: CustomGraphEdge[];
}

// Re-export shared timeline types from developer
export type { TimelineEntry, TodoItem, CardType, Visibility } from '../../developer/lib/types';
