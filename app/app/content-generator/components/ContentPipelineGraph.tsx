/**
 * Content Pipeline Workflow Graph
 *
 * Frozen, hardcoded 14-stage pipeline for content generation workflows.
 * Stages, bundles, and feedback loops are defined here -- not from the DB.
 * Mirrors the DevelopmentWorkflowGraph.tsx design from the developer module.
 */
"use client";

import { useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  MarkerType,
  EdgeLabelRenderer,
  type Node,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ContentWorkflowNode } from '../lib/types';
import { CONTENT_PIPELINE_STAGES, CONTENT_STAGE_LABELS } from '../lib/types';
import ContentWorkflowStatusBadge from './ContentWorkflowStatusBadge';
import { Handle, Position } from '@xyflow/react';
import { Cog, Bot, User } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

// ---- Stage order (source of truth) ----------------------------------------
const CONTENT_STAGE_ORDER = CONTENT_PIPELINE_STAGES.map((s) => s.key);

// ---- Stage type lookup -----------------------------------------------------
const STAGE_TYPE_MAP: Record<string, string> = Object.fromEntries(
  CONTENT_PIPELINE_STAGES.map((s) => [s.key, s.stageType])
);

// ---- Node type icons -------------------------------------------------------
const NODE_TYPE_ICON: Record<string, typeof Cog> = { auto: Cog, agent: Bot, human: User };

// ---- WorkflowGraphNode (inline, same as developer) -------------------------
interface WorkflowGraphNodeData {
  stageName: string;
  status: string;
  nodeType: string;
  stepNumber: number;
  isCurrent: boolean;
  isUpcoming?: boolean;
  onClick?: () => void;
  [key: string]: unknown;
}

function ContentWorkflowGraphNode({ data }: { data: WorkflowGraphNodeData }) {
  const { stageName, status, nodeType, stepNumber, isCurrent, onClick } = data;
  const isUpcoming = data.isUpcoming as boolean;
  const label = CONTENT_STAGE_LABELS[stageName] || stageName;
  const Icon = NODE_TYPE_ICON[nodeType] || Bot;

  let borderColor = 'var(--muted-foreground)';
  let bgClass = 'bg-background';
  let labelClass = 'text-foreground';
  let numClass = 'text-muted-foreground';
  let dotClass = 'bg-muted-foreground';
  let statusText = 'Pending';
  let shadow = '';
  let scale = '';
  let opacity = '';

  if (status === 'completed') {
    borderColor = 'var(--foreground)';
    labelClass = 'text-foreground';
    dotClass = 'bg-foreground';
    statusText = 'Done';
  } else if (isCurrent && status === 'running') {
    borderColor = 'var(--foreground)';
    bgClass = 'bg-foreground';
    labelClass = 'text-background';
    numClass = 'text-background/70';
    dotClass = 'bg-background';
    statusText = 'Running';
    shadow = 'shadow-lg';
    scale = 'scale-105';
  } else if (isCurrent && status === 'waiting_approval') {
    borderColor = 'var(--chart-1)';
    labelClass = 'text-foreground';
    numClass = 'text-foreground/70';
    dotClass = 'bg-chart-1';
    statusText = 'Awaiting';
    shadow = 'shadow-md';
    scale = 'scale-105';
  } else if (isCurrent) {
    borderColor = 'var(--foreground)';
    labelClass = 'text-foreground';
    dotClass = 'bg-foreground';
    statusText = 'Active';
    shadow = 'shadow-md';
    scale = 'scale-105';
  } else if (status === 'failed') {
    borderColor = 'var(--destructive)';
    labelClass = 'text-foreground';
    dotClass = 'bg-destructive';
    statusText = 'Failed';
  } else if (isUpcoming) {
    borderColor = 'var(--border)';
    labelClass = 'text-muted-foreground';
    numClass = 'text-muted-foreground/50';
    dotClass = 'bg-border';
    opacity = 'opacity-50';
  }

  return (
    <>
      <Handle id="target-top" type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" />
      <Handle id="target-left" type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
      <div
        onClick={onClick}
        className={`w-[180px] cursor-pointer rounded-lg border-2 ${bgClass} px-3 py-2 transition-all hover:shadow-md ${shadow} ${scale} ${opacity}`}
        style={{
          borderColor,
          animation: isCurrent && status === 'running' ? 'node-pulse 2s ease-in-out infinite' : undefined,
        }}
      >
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`font-mono text-[9px] ${numClass}`}>{String(stepNumber).padStart(2, '0')}</span>
            <span className={`text-[12px] font-semibold leading-tight ${labelClass}`}>{label}</span>
          </div>
          <Icon className={`h-3 w-3 ${isCurrent && status === 'running' ? 'text-background/60' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass} ${isCurrent && status === 'running' ? 'animate-pulse' : ''}`} />
          <span className={`font-mono text-[9px] ${isCurrent ? labelClass : 'text-muted-foreground'}`}>{statusText}</span>
        </div>
      </div>
      <Handle id="source-right" type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
      <Handle id="source-bottom" type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
      <Handle id="source-left" type="source" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
      <Handle id="loop-source" type="source" position={Position.Top} className="!opacity-0 !w-0 !h-0" style={{ left: '70%' }} />
      <Handle id="loop-target" type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" style={{ left: '30%' }} />
    </>
  );
}

// ---- Bundle node (background group) ----------------------------------------
function BundleNode({ data }: { data: { label: string; width: number; height: number; [key: string]: unknown } }) {
  return (
    <div
      className="rounded-xl border-2 border-muted-foreground/30 bg-muted/40"
      style={{ width: data.width, height: data.height, position: 'relative' }}
    >
      <span className="absolute -top-2.5 left-3 rounded px-2 py-0 bg-background font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {data.label}
      </span>
    </div>
  );
}

// ---- Long feedback edge (routes far left to avoid bundles) -----------------
function LongFeedbackEdge({ id, sourceX, sourceY, targetX, targetY, label, markerEnd, style }: EdgeProps) {
  const farLeft = 20;
  const r = 10;
  const path = [
    `M ${sourceX},${sourceY}`,
    `H ${farLeft + r}`,
    `Q ${farLeft},${sourceY} ${farLeft},${sourceY - r}`,
    `V ${targetY + r}`,
    `Q ${farLeft},${targetY} ${farLeft + r},${targetY}`,
    `H ${targetX}`,
  ].join(' ');

  const midY = (sourceY + targetY) / 2;

  return (
    <>
      <path id={id} d={path} fill="none" style={style} markerEnd={markerEnd as string} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute"
            style={{ transform: `translate(-50%, -50%) translate(${farLeft}px,${midY}px)` }}
          >
            <span className="rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
              {label}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// ---- Node & edge types -----------------------------------------------------
const nodeTypes = {
  workflowNode: ContentWorkflowGraphNode,
  bundle: BundleNode,
};

const edgeTypes = {
  longFeedback: LongFeedbackEdge,
};

// ---- Content pipeline bundles (frozen) -------------------------------------
interface Bundle {
  id: string;
  label: string;
  row: number;
  stages: string[];
}

const BUNDLES: Bundle[] = [
  { id: 'input',          label: 'Input',              row: 0, stages: ['strategy_assets', 'scheduling'] },
  { id: 'research',       label: 'Research & Creation', row: 1, stages: ['research', 'concepts', 'content_generation', 'simulation_testing'] },
  { id: 'review',         label: 'Review',             row: 2, stages: ['brand_qa', 'fdm_review'] },
  { id: 'distribution',   label: 'Distribution',       row: 3, stages: ['publish', 'metrics'] },
  { id: 'learning',       label: 'Learning',           row: 4, stages: ['analytics', 'channel_learning', 'ab_testing', 'reinforcement_learning'] },
];

// Short feedback loops (same row -- use top handles)
// Note: brand_qa/fdm_review -> concepts are cross-row but short distance,
// so we use the long feedback edge to route them properly
const SHORT_FEEDBACK_LOOPS: [string, string][] = [];

// Long feedback loops (across rows -- route via left side)
const LONG_FEEDBACK_LOOPS: [string, string][] = [
  ['brand_qa', 'concepts'],
  ['fdm_review', 'concepts'],
  ['analytics', 'scheduling'],
  ['reinforcement_learning', 'research'],
];

// ---- Layout constants ------------------------------------------------------
const NODE_W = 180;
const NODE_H = 52;
const NODE_GAP = 24;
const BUNDLE_PAD = 28;
const BUNDLE_GAP = 50;
const ROW_GAP = 80;
const LEFT_MARGIN = 80;
const TOP_OFFSET = 60;

// ---- Compute positions -----------------------------------------------------
function computeLayout() {
  const nodePositions: Record<string, { x: number; y: number }> = {};
  const bundleRects: { id: string; label: string; x: number; y: number; w: number; h: number }[] = [];

  const rows: Bundle[][] = [];
  for (const b of BUNDLES) {
    if (!rows[b.row]) rows[b.row] = [];
    rows[b.row].push(b);
  }

  let rowY = TOP_OFFSET;
  for (const row of rows) {
    let cursorX = LEFT_MARGIN;
    for (const bundle of row) {
      const contentW = bundle.stages.length * NODE_W + (bundle.stages.length - 1) * NODE_GAP;
      const bw = contentW + BUNDLE_PAD * 2;
      const bh = NODE_H + BUNDLE_PAD * 2;

      bundleRects.push({ id: bundle.id, label: bundle.label, x: cursorX, y: rowY, w: bw, h: bh });

      bundle.stages.forEach((stage, i) => {
        nodePositions[stage] = {
          x: cursorX + BUNDLE_PAD + i * (NODE_W + NODE_GAP),
          y: rowY + BUNDLE_PAD,
        };
      });

      cursorX += bw + BUNDLE_GAP;
    }
    rowY += NODE_H + BUNDLE_PAD * 2 + ROW_GAP;
  }

  return { nodePositions, bundleRects };
}

const { nodePositions: POSITIONS, bundleRects: BUNDLE_RECTS } = computeLayout();

// ---- Props -----------------------------------------------------------------
interface ContentPipelineGraphProps {
  nodes: ContentWorkflowNode[];
  onNodeClick?: (node: ContentWorkflowNode) => void;
}

export default function ContentPipelineGraph({ nodes, onNodeClick }: ContentPipelineGraphProps) {
  const [selectedNode, setSelectedNode] = useState<ContentWorkflowNode | null>(null);

  const nodeMap = useMemo(() => {
    const map: Record<string, ContentWorkflowNode> = {};
    for (const n of nodes) map[n.stage_key] = n;
    return map;
  }, [nodes]);

  const currentStage = useMemo(() => {
    // First check for actively running/waiting stages
    for (const stage of CONTENT_STAGE_ORDER) {
      const n = nodeMap[stage];
      if (n?.status === 'running' || n?.status === 'waiting_approval') return stage;
    }
    // Fall back to the first non-completed stage (the active frontier)
    for (const stage of CONTENT_STAGE_ORDER) {
      const n = nodeMap[stage];
      if (!n || n.status !== 'completed') return stage;
    }
    return null;
  }, [nodeMap]);

  const currentStageIndex = useMemo(
    () => currentStage ? CONTENT_STAGE_ORDER.indexOf(currentStage) : CONTENT_STAGE_ORDER.length,
    [currentStage],
  );

  const handleNodeClick = useCallback(
    (stageName: string) => {
      const node = nodeMap[stageName];
      if (node) { setSelectedNode(node); onNodeClick?.(node); }
    },
    [nodeMap, onNodeClick],
  );

  // ---- Flow nodes ----------------------------------------------------------
  const flowNodes: Node[] = useMemo(() => {
    const result: Node[] = [];

    // Bundle backgrounds
    for (const br of BUNDLE_RECTS) {
      result.push({
        id: `bundle-${br.id}`,
        type: 'bundle',
        position: { x: br.x, y: br.y },
        data: { label: br.label, width: br.w, height: br.h },
        selectable: false,
        draggable: false,
        style: { zIndex: -1 },
      });
    }

    // Stage nodes
    CONTENT_STAGE_ORDER.forEach((stageName, i) => {
      const pos = POSITIONS[stageName];
      const wfNode = nodeMap[stageName];
      result.push({
        id: stageName,
        type: 'workflowNode',
        position: pos,
        data: {
          stageName,
          status: wfNode?.status || 'pending',
          nodeType: STAGE_TYPE_MAP[stageName] || 'auto',
          stepNumber: i + 1,
          isCurrent: stageName === currentStage,
          isUpcoming: i > currentStageIndex,
          onClick: () => handleNodeClick(stageName),
        },
      });
    });

    return result;
  }, [nodeMap, currentStage, currentStageIndex, handleNodeClick]);

  // ---- Flow edges ----------------------------------------------------------
  const flowEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    const arrow = { type: MarkerType.ArrowClosed as const, width: 16, height: 16 };

    for (let i = 0; i < CONTENT_STAGE_ORDER.length - 1; i++) {
      const src = CONTENT_STAGE_ORDER[i];
      const tgt = CONTENT_STAGE_ORDER[i + 1];
      const srcPos = POSITIONS[src];
      const tgtPos = POSITIONS[tgt];
      const srcNode = nodeMap[src];
      const isActive = srcNode?.status === 'completed' || srcNode?.status === 'running';

      const sameRow = Math.abs(srcPos.y - tgtPos.y) < 10;
      const edgeColor = isActive ? 'var(--foreground)' : 'var(--muted-foreground)';

      edges.push({
        id: `e-${src}-${tgt}`,
        source: src,
        target: tgt,
        sourceHandle: sameRow ? 'source-right' : 'source-bottom',
        targetHandle: sameRow ? 'target-left' : 'target-top',
        type: 'smoothstep',
        style: { stroke: edgeColor, strokeWidth: isActive ? 3 : 2 },
        markerEnd: { ...arrow, color: edgeColor },
        animated: srcNode?.status === 'running',
      });
    }

    // Short feedback loops (same row -- top handles)
    for (const [from, to] of SHORT_FEEDBACK_LOOPS) {
      edges.push({
        id: `loop-${from}-${to}`,
        source: from,
        target: to,
        sourceHandle: 'loop-source',
        targetHandle: 'loop-target',
        type: 'smoothstep',
        style: { stroke: 'var(--muted-foreground)', strokeWidth: 1.5, strokeDasharray: '6,3', opacity: 0.7 },
        markerEnd: { ...arrow, color: 'var(--muted-foreground)' },
        label: 'reject',
        labelStyle: { fontSize: 9, fill: 'var(--muted-foreground)' },
      });
    }

    // Long feedback loops (cross-row -- custom edge that routes far left)
    const LOOP_LABELS: Record<string, string> = {
      'brand_qa-concepts': 'reject',
      'fdm_review-concepts': 'reject',
      'analytics-scheduling': 'feedback',
      'reinforcement_learning-research': 'feedback',
    };
    for (const [from, to] of LONG_FEEDBACK_LOOPS) {
      const loopLabel = LOOP_LABELS[`${from}-${to}`] || 'feedback';
      edges.push({
        id: `loop-${from}-${to}`,
        source: from,
        target: to,
        sourceHandle: 'source-left',
        targetHandle: 'target-left',
        type: 'longFeedback',
        style: { stroke: 'var(--muted-foreground)', strokeWidth: 1.5, strokeDasharray: '6,3', opacity: 0.7 },
        markerEnd: { ...arrow, color: 'var(--muted-foreground)' },
        label: loopLabel,
      });
    }

    return edges;
  }, [nodeMap]);

  // ---- Detail panel helpers ------------------------------------------------
  function formatDuration(startedAt?: string, completedAt?: string): string {
    if (!startedAt) return '--';
    const s = Math.floor(((completedAt ? new Date(completedAt).getTime() : Date.now()) - new Date(startedAt).getTime()) / 1000);
    return s < 0 ? '--' : `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  const selectedStepNumber = selectedNode ? CONTENT_STAGE_ORDER.indexOf(selectedNode.stage_key) + 1 : 0;
  const selectedStageType = selectedNode ? STAGE_TYPE_MAP[selectedNode.stage_key] || 'auto' : 'auto';
  const SelectedIcon = NODE_TYPE_ICON[selectedStageType] || Cog;

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background gap={30} size={1} color="var(--border)" />
      </ReactFlow>

      <Sheet open={!!selectedNode} onOpenChange={(open) => { if (!open) setSelectedNode(null); }}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-sm">
          {selectedNode && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground/50">{String(selectedStepNumber).padStart(2, '0')}</span>
                  <SheetTitle className="font-mono text-sm uppercase tracking-wider">
                    {CONTENT_STAGE_LABELS[selectedNode.stage_key] || selectedNode.stage_key}
                  </SheetTitle>
                  <SelectedIcon className="h-4 w-4 text-muted-foreground/40" />
                </div>
                <SheetDescription className="flex items-center gap-2">
                  <ContentWorkflowStatusBadge status={selectedNode.status} />
                  <span className="font-mono text-[10px] text-muted-foreground">{formatDuration(selectedNode.started_at, selectedNode.completed_at)}</span>
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4 space-y-4">
                {/* Stage description */}
                {CONTENT_PIPELINE_STAGES.find((s) => s.key === selectedNode.stage_key)?.description && (
                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Description</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {CONTENT_PIPELINE_STAGES.find((s) => s.key === selectedNode.stage_key)?.description}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Started</div>
                    <div className="font-mono text-[10px]">{selectedNode.started_at ? new Date(selectedNode.started_at).toLocaleString() : '--'}</div>
                  </div>
                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Completed</div>
                    <div className="font-mono text-[10px]">{selectedNode.completed_at ? new Date(selectedNode.completed_at).toLocaleString() : '--'}</div>
                  </div>
                </div>
                {selectedNode.output_data && Object.keys(selectedNode.output_data).length > 0 && (
                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Output</div>
                    <pre className="max-h-48 overflow-auto rounded border border-border bg-muted p-3 font-mono text-[10px]">{JSON.stringify(selectedNode.output_data, null, 2)}</pre>
                  </div>
                )}
                {selectedNode.input_data && Object.keys(selectedNode.input_data).length > 0 && (
                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Input</div>
                    <pre className="max-h-32 overflow-auto rounded border border-border bg-muted p-3 font-mono text-[10px]">{JSON.stringify(selectedNode.input_data, null, 2)}</pre>
                  </div>
                )}
                {selectedNode.error && (
                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-destructive">Error</div>
                    <pre className="max-h-32 overflow-auto rounded border border-destructive/30 bg-destructive/5 p-3 font-mono text-[10px] text-destructive">{selectedNode.error}</pre>
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
