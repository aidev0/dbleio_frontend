"use client";

import { useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { WorkflowNode as WFNode } from '../lib/types';
import { STAGE_LABELS } from '../lib/types';
import WorkflowGraphNode from './WorkflowGraphNode';
import FeedbackLoopEdge from './WorkflowGraphEdge';
import WorkflowStatusBadge from './WorkflowStatusBadge';
import ReactMarkdown from 'react-markdown';
import { Cog, Bot, User } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

// ─── Phase group node component (MUST be defined before nodeTypes) ───
function PhaseGroupNode({ data }: { data: { label: string; color: string; width: number; height: number; [key: string]: unknown } }) {
  return (
    <div
      className="rounded-xl"
      style={{
        width: data.width,
        height: data.height,
        border: `1.5px dashed ${data.color}`,
        backgroundColor: `color-mix(in oklch, ${data.color} 5%, transparent)`,
        position: 'relative',
      }}
    >
      <span
        className="absolute -top-3 left-3 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
        style={{
          backgroundColor: 'var(--background)',
          color: data.color,
          border: `1px solid ${data.color}`,
        }}
      >
        {data.label}
      </span>
    </div>
  );
}

// ─── Node & edge types (PhaseGroupNode is already defined above) ─────
const nodeTypes = {
  workflowNode: WorkflowGraphNode,
  phaseGroup: PhaseGroupNode,
};
const edgeTypes = { feedbackLoop: FeedbackLoopEdge };

// ─── Stage order ────────────────────────────────────────────────────
const STAGE_ORDER = [
  'spec_intake', 'setup', 'planner', 'plan_reviewer', 'plan_approval',
  'developer', 'code_reviewer', 'validator', 'commit_pr', 'deployer',
  'qa_review', 'client_review',
];

// ─── Layout: 3-row snake (4 nodes per row) ─────────────────────────
const NODE_W = 220;
const H_SPACING = 290;
const V_SPACING = 180;
const PHASE_GAP = 40;

// Row 0 (L→R): spec_intake, setup, planner, plan_reviewer
// Row 1 (R→L): plan_approval, developer, code_reviewer, validator
// Row 2 (L→R): commit_pr, deployer, qa_review, client_review
const LAYOUT: Record<string, { row: number; col: number }> = {
  spec_intake:    { row: 0, col: 0 },
  setup:          { row: 0, col: 1 },
  planner:        { row: 0, col: 2 },
  plan_reviewer:  { row: 0, col: 3 },
  plan_approval:  { row: 1, col: 3 },
  developer:      { row: 1, col: 2 },
  code_reviewer:  { row: 1, col: 1 },
  validator:      { row: 1, col: 0 },
  commit_pr:      { row: 2, col: 0 },
  deployer:       { row: 2, col: 1 },
  qa_review:      { row: 2, col: 2 },
  client_review:  { row: 2, col: 3 },
};

function colToX(col: number): number {
  let x = col * H_SPACING;
  // Gap between Intake (cols 0-1) and Planning (cols 2-3) on row 0
  if (col >= 2) x += PHASE_GAP;
  return x;
}

function rowToY(row: number): number {
  return row * V_SPACING + 80;
}

// ─── Phase group definitions ────────────────────────────────────────
interface Phase {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function getPhases(): Phase[] {
  const pad = 24;
  const nodeH = 76;
  return [
    {
      id: 'phase-intake',
      label: 'Intake',
      color: 'var(--chart-4)',
      x: colToX(0) - pad,
      y: rowToY(0) - pad,
      width: (colToX(1) - colToX(0)) + NODE_W + pad * 2,
      height: nodeH + pad * 2,
    },
    {
      id: 'phase-planning',
      label: 'Planning',
      color: 'var(--chart-3)',
      x: colToX(2) - pad,
      y: rowToY(0) - pad,
      width: (colToX(3) - colToX(2)) + NODE_W + pad * 2,
      height: nodeH + pad * 2,
    },
    {
      id: 'phase-development',
      label: 'Development',
      color: 'var(--chart-2)',
      x: colToX(0) - pad,
      y: rowToY(1) - pad,
      width: (colToX(3) - colToX(0)) + NODE_W + pad * 2,
      height: nodeH + pad * 2,
    },
    {
      id: 'phase-delivery',
      label: 'Delivery',
      color: 'var(--chart-1)',
      x: colToX(0) - pad,
      y: rowToY(2) - pad,
      width: (colToX(3) - colToX(0)) + NODE_W + pad * 2,
      height: nodeH + pad * 2,
    },
  ];
}

// ─── Feedback loops ─────────────────────────────────────────────────
const LOOP_BACK_EDGES: [string, string][] = [
  ['plan_reviewer', 'planner'],
  ['code_reviewer', 'developer'],
];

// ─── Node type icon helper ──────────────────────────────────────────
const NODE_TYPE_ICON: Record<string, typeof Cog> = {
  auto: Cog,
  agent: Bot,
  human: User,
};

// ─── Props ──────────────────────────────────────────────────────────
interface WorkflowGraphRadicalProps {
  nodes: WFNode[];
  onNodeClick?: (node: WFNode) => void;
}

export default function WorkflowGraphRadical({ nodes, onNodeClick }: WorkflowGraphRadicalProps) {
  const [selectedNode, setSelectedNode] = useState<WFNode | null>(null);

  const nodeMap = useMemo(() => {
    const map: Record<string, WFNode> = {};
    for (const n of nodes) {
      map[n.stage_name] = n;
    }
    return map;
  }, [nodes]);

  const handleNodeClick = useCallback(
    (stageName: string) => {
      const node = nodeMap[stageName];
      if (node) {
        setSelectedNode(node);
        onNodeClick?.(node);
      }
    },
    [nodeMap, onNodeClick]
  );

  // ─── Progress stats ────────────────────────────────────────────
  const { completedCount, totalCount, runningStage } = useMemo(() => {
    let completed = 0;
    let running: string | null = null;
    for (const stage of STAGE_ORDER) {
      const wfNode = nodeMap[stage];
      if (wfNode?.status === 'completed') completed++;
      if (wfNode?.status === 'running' && !running) running = stage;
    }
    return { completedCount: completed, totalCount: STAGE_ORDER.length, runningStage: running };
  }, [nodeMap]);

  // ─── Flow nodes ────────────────────────────────────────────────
  const flowNodes: Node[] = useMemo(() => {
    const result: Node[] = [];

    // Phase group background nodes
    for (const phase of getPhases()) {
      result.push({
        id: phase.id,
        type: 'phaseGroup',
        position: { x: phase.x, y: phase.y },
        data: { label: phase.label, color: phase.color, width: phase.width, height: phase.height },
        selectable: false,
        draggable: false,
        style: { zIndex: -1 },
      });
    }

    // Workflow stage nodes
    for (let i = 0; i < STAGE_ORDER.length; i++) {
      const stageName = STAGE_ORDER[i];
      const layout = LAYOUT[stageName];
      const wfNode = nodeMap[stageName];

      result.push({
        id: stageName,
        type: 'workflowNode',
        position: { x: colToX(layout.col), y: rowToY(layout.row) },
        data: {
          stageName,
          status: wfNode?.status || 'pending',
          nodeType: wfNode?.node_type || 'auto',
          iteration: wfNode?.iteration || 0,
          stepNumber: i + 1,
          startedAt: wfNode?.started_at,
          completedAt: wfNode?.completed_at,
          onClick: () => handleNodeClick(stageName),
        },
      });
    }

    return result;
  }, [nodeMap, handleNodeClick]);

  // ─── Flow edges ────────────────────────────────────────────────
  const flowEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
      const src = STAGE_ORDER[i];
      const tgt = STAGE_ORDER[i + 1];
      const srcLayout = LAYOUT[src];
      const tgtLayout = LAYOUT[tgt];
      const sourceNode = nodeMap[src];
      const isActive = sourceNode?.status === 'running' || sourceNode?.status === 'completed';

      let sourceHandle: string;
      let targetHandle: string;

      if (srcLayout.row === tgtLayout.row) {
        // Same row: check direction
        if (tgtLayout.col > srcLayout.col) {
          // Left to right (rows 0 and 2)
          sourceHandle = 'source-right';
          targetHandle = 'target-left';
        } else {
          // Right to left (row 1)
          sourceHandle = 'source-left';
          targetHandle = 'target-right';
        }
      } else {
        // Row transition: drop down
        sourceHandle = 'source-bottom';
        targetHandle = 'target-top';
      }

      const edgeColor = isActive ? 'var(--foreground)' : 'var(--border)';

      edges.push({
        id: `e-${src}-${tgt}`,
        source: src,
        target: tgt,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        style: {
          stroke: edgeColor,
          strokeWidth: isActive ? 3 : 2,
        },
        animated: sourceNode?.status === 'running',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 24,
          height: 24,
          color: edgeColor,
        },
      });
    }

    // Feedback loop edges
    for (const [from, to] of LOOP_BACK_EDGES) {
      edges.push({
        id: `loop-${from}-${to}`,
        source: from,
        target: to,
        sourceHandle: 'loop-source',
        targetHandle: 'loop-target',
        type: 'feedbackLoop',
        label: 'revise',
      });
    }

    return edges;
  }, [nodeMap]);

  // ─── Elapsed time for detail panel ─────────────────────────────
  function formatDuration(startedAt?: string, completedAt?: string): string {
    if (!startedAt) return '--';
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 0) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  const selectedStepNumber = selectedNode
    ? STAGE_ORDER.indexOf(selectedNode.stage_name) + 1
    : 0;
  const SelectedIcon = selectedNode
    ? NODE_TYPE_ICON[selectedNode.node_type] || Cog
    : Cog;

  return (
    <div className="relative h-full w-full">
      {/* Progress header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 py-2 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Pipeline Progress
          </span>
          <div className="flex items-center gap-2">
            {runningStage && (
              <span className="font-mono text-[10px] text-foreground">
                {STAGE_LABELS[runningStage] || runningStage}
              </span>
            )}
            <span className="font-mono text-[10px] text-muted-foreground">
              {completedCount}/{totalCount} stages
            </span>
          </div>
        </div>
        <div className="h-[3px] w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-500"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background gap={30} size={1} color="var(--border)" />
      </ReactFlow>

      {/* Detail panel using Sheet */}
      <Sheet open={!!selectedNode} onOpenChange={(open) => { if (!open) setSelectedNode(null); }}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-sm">
          {selectedNode && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground/50">
                    {String(selectedStepNumber).padStart(2, '0')}
                  </span>
                  <SheetTitle className="font-mono text-sm uppercase tracking-wider">
                    {STAGE_LABELS[selectedNode.stage_name] || selectedNode.stage_name}
                  </SheetTitle>
                  <SelectedIcon className="h-4 w-4 text-muted-foreground/40" />
                </div>
                <SheetDescription className="flex items-center gap-2">
                  <WorkflowStatusBadge status={selectedNode.status} />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {formatDuration(selectedNode.started_at, selectedNode.completed_at)}
                  </span>
                  {selectedNode.iteration > 0 && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Iteration {selectedNode.iteration + 1}
                    </span>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-4 space-y-4">
                {/* Timing */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Started</div>
                    <div className="font-mono text-[10px]">
                      {selectedNode.started_at ? new Date(selectedNode.started_at).toLocaleString() : '--'}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Completed</div>
                    <div className="font-mono text-[10px]">
                      {selectedNode.completed_at ? new Date(selectedNode.completed_at).toLocaleString() : '--'}
                    </div>
                  </div>
                </div>

                {/* Output data */}
                {selectedNode.output_data && Object.keys(selectedNode.output_data).length > 0 && (
                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Output</div>
                    {typeof selectedNode.output_data === 'object' && 'plan' in selectedNode.output_data ? (
                      <div className="prose prose-sm max-w-none rounded border border-border p-3 text-xs">
                        <ReactMarkdown>{String(selectedNode.output_data.plan)}</ReactMarkdown>
                      </div>
                    ) : typeof selectedNode.output_data === 'object' && 'feedback' in selectedNode.output_data ? (
                      <div className="prose prose-sm max-w-none rounded border border-border p-3 text-xs">
                        <ReactMarkdown>{String(selectedNode.output_data.feedback)}</ReactMarkdown>
                      </div>
                    ) : (
                      <pre className="max-h-48 overflow-auto rounded border border-border bg-muted p-3 font-mono text-[10px]">
                        {JSON.stringify(selectedNode.output_data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                {/* Input data */}
                {selectedNode.input_data && Object.keys(selectedNode.input_data).length > 0 && (
                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Input</div>
                    <pre className="max-h-32 overflow-auto rounded border border-border bg-muted p-3 font-mono text-[10px]">
                      {JSON.stringify(selectedNode.input_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
