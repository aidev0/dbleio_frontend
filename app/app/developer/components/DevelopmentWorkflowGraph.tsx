/**
 * Development Workflow Graph
 *
 * Frozen, hardcoded 13-stage pipeline for software development workflows.
 * Stages, bundles, and feedback loops are defined here — not from the DB.
 * Future generic workflows will be DB-driven and use a separate component.
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
import type { WorkflowNode as WFNode } from '../lib/types';
import { STAGE_LABELS } from '../lib/types';
import WorkflowGraphNode from './WorkflowGraphNode';
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

// ─── Bundle node (background group) ─────────────────────────────────
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

// ─── Long feedback edge (routes far left to avoid bundles) ──────────
function LongFeedbackEdge({ id, sourceX, sourceY, targetX, targetY, label, markerEnd, style }: EdgeProps) {
  const farLeft = 20; // route far to the left of all bundles
  const r = 10;       // corner radius
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

// ─── Node & edge types ──────────────────────────────────────────────
const nodeTypes = {
  workflowNode: WorkflowGraphNode,
  bundle: BundleNode,
};

const edgeTypes = {
  longFeedback: LongFeedbackEdge,
};

// ─── Development pipeline config (frozen) ───────────────────────────
const DEV_STAGE_ORDER = [
  'spec_intake', 'setup', 'planner', 'plan_reviewer', 'plan_approval',
  'developer', 'code_reviewer', 'validator', 'commit_pr', 'deployer',
  'qa_review', 'client_review', 'done',
];

interface Bundle {
  id: string;
  label: string;
  row: number;
  stages: string[];
}

const BUNDLES: Bundle[] = [
  { id: 'intake',      label: 'Input',       row: 0, stages: ['spec_intake', 'setup'] },
  { id: 'planning',    label: 'Planning',    row: 1, stages: ['planner', 'plan_reviewer', 'plan_approval'] },
  { id: 'development', label: 'Development', row: 2, stages: ['developer', 'code_reviewer', 'validator', 'commit_pr', 'deployer'] },
  { id: 'review',      label: 'Review',      row: 3, stages: ['qa_review', 'client_review', 'done'] },
];

// Short feedback loops (within same row — use top handles)
const SHORT_FEEDBACK_LOOPS: [string, string][] = [
  ['plan_reviewer', 'planner'],
  ['code_reviewer', 'developer'],
  ['client_review', 'qa_review'],
];

// Long feedback loops (across rows — route via left side to avoid cutting through bundles)
const LONG_FEEDBACK_LOOPS: [string, string][] = [
  ['qa_review', 'planner'],
];

// ─── Layout constants ───────────────────────────────────────────────
const NODE_W = 180;
const NODE_H = 52;
const NODE_GAP = 24;
const BUNDLE_PAD = 28;
const BUNDLE_GAP = 50;
const ROW_GAP = 80;
const LEFT_MARGIN = 80;
const TOP_OFFSET = 60;

// ─── Compute positions ──────────────────────────────────────────────
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

// ─── Helpers ────────────────────────────────────────────────────────
const NODE_TYPE_ICON: Record<string, typeof Cog> = { auto: Cog, agent: Bot, human: User };

// ─── Props ──────────────────────────────────────────────────────────
interface DevelopmentWorkflowGraphProps {
  nodes: WFNode[];
  onNodeClick?: (node: WFNode) => void;
}

export default function DevelopmentWorkflowGraph({ nodes, onNodeClick }: DevelopmentWorkflowGraphProps) {
  const [selectedNode, setSelectedNode] = useState<WFNode | null>(null);

  const nodeMap = useMemo(() => {
    const map: Record<string, WFNode> = {};
    for (const n of nodes) map[n.stage_name] = n;
    return map;
  }, [nodes]);

  const currentStage = useMemo(() => {
    // First check for actively running/waiting stages
    for (const stage of DEV_STAGE_ORDER) {
      const n = nodeMap[stage];
      if (n?.status === 'running' || n?.status === 'waiting_approval') return stage;
    }
    // Fall back to the first non-completed stage (the active frontier)
    for (const stage of DEV_STAGE_ORDER) {
      const n = nodeMap[stage];
      if (!n || n.status !== 'completed') return stage;
    }
    return null;
  }, [nodeMap]);

  const currentStageIndex = useMemo(
    () => currentStage ? DEV_STAGE_ORDER.indexOf(currentStage) : DEV_STAGE_ORDER.length,
    [currentStage],
  );

  const handleNodeClick = useCallback(
    (stageName: string) => {
      const node = nodeMap[stageName];
      if (node) { setSelectedNode(node); onNodeClick?.(node); }
    },
    [nodeMap, onNodeClick],
  );

  // ─── Progress ─────────────────────────────────────────────────
  const completedCount = useMemo(
    () => DEV_STAGE_ORDER.filter((s) => nodeMap[s]?.status === 'completed').length,
    [nodeMap],
  );

  // ─── Flow nodes ───────────────────────────────────────────────
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
    DEV_STAGE_ORDER.forEach((stageName, i) => {
      const pos = POSITIONS[stageName];
      const wfNode = nodeMap[stageName];
      result.push({
        id: stageName,
        type: 'workflowNode',
        position: pos,
        data: {
          stageName,
          status: wfNode?.status || 'pending',
          nodeType: wfNode?.node_type || 'auto',
          stepNumber: i + 1,
          isCurrent: stageName === currentStage,
          isUpcoming: i > currentStageIndex,
          onClick: () => handleNodeClick(stageName),
        },
      });
    });

    return result;
  }, [nodeMap, currentStage, handleNodeClick]);

  // ─── Flow edges ───────────────────────────────────────────────
  const flowEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    const arrow = { type: MarkerType.ArrowClosed as const, width: 16, height: 16 };

    for (let i = 0; i < DEV_STAGE_ORDER.length - 1; i++) {
      const src = DEV_STAGE_ORDER[i];
      const tgt = DEV_STAGE_ORDER[i + 1];
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

    // Short feedback loops (same row — top handles)
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
        label: 'revise',
        labelStyle: { fontSize: 9, fill: 'var(--muted-foreground)' },
      });
    }

    // Long feedback loops (cross-row — custom edge that routes far left to avoid bundles)
    for (const [from, to] of LONG_FEEDBACK_LOOPS) {
      edges.push({
        id: `loop-${from}-${to}`,
        source: from,
        target: to,
        sourceHandle: 'source-left',
        targetHandle: 'target-left',
        type: 'longFeedback',
        style: { stroke: 'var(--muted-foreground)', strokeWidth: 1.5, strokeDasharray: '6,3', opacity: 0.7 },
        markerEnd: { ...arrow, color: 'var(--muted-foreground)' },
        label: 'revise',
      });
    }

    return edges;
  }, [nodeMap]);

  // ─── Detail panel helpers ─────────────────────────────────────
  function formatDuration(startedAt?: string, completedAt?: string): string {
    if (!startedAt) return '--';
    const s = Math.floor((( completedAt ? new Date(completedAt).getTime() : Date.now()) - new Date(startedAt).getTime()) / 1000);
    return s < 0 ? '--' : `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  const selectedStepNumber = selectedNode ? DEV_STAGE_ORDER.indexOf(selectedNode.stage_name) + 1 : 0;
  const SelectedIcon = selectedNode ? NODE_TYPE_ICON[selectedNode.node_type] || Cog : Cog;

  return (
    <div className="relative h-full w-full">
      {/* Progress header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 py-2 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Pipeline</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {completedCount}/{DEV_STAGE_ORDER.length}
            {currentStage && <> &middot; {STAGE_LABELS[currentStage]}</>}
          </span>
        </div>
        <div className="h-[2px] w-full rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full bg-foreground transition-all duration-500" style={{ width: `${(completedCount / DEV_STAGE_ORDER.length) * 100}%` }} />
        </div>
      </div>

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
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
                    {STAGE_LABELS[selectedNode.stage_name] || selectedNode.stage_name}
                  </SheetTitle>
                  <SelectedIcon className="h-4 w-4 text-muted-foreground/40" />
                </div>
                <SheetDescription className="flex items-center gap-2">
                  <WorkflowStatusBadge status={selectedNode.status} />
                  <span className="font-mono text-[10px] text-muted-foreground">{formatDuration(selectedNode.started_at, selectedNode.completed_at)}</span>
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4 space-y-4">
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
                    {typeof selectedNode.output_data === 'object' && 'plan' in selectedNode.output_data ? (
                      <div className="prose prose-sm max-w-none rounded border border-border p-3 text-xs"><ReactMarkdown>{String(selectedNode.output_data.plan)}</ReactMarkdown></div>
                    ) : typeof selectedNode.output_data === 'object' && 'feedback' in selectedNode.output_data ? (
                      <div className="prose prose-sm max-w-none rounded border border-border p-3 text-xs"><ReactMarkdown>{String(selectedNode.output_data.feedback)}</ReactMarkdown></div>
                    ) : (
                      <pre className="max-h-48 overflow-auto rounded border border-border bg-muted p-3 font-mono text-[10px]">{JSON.stringify(selectedNode.output_data, null, 2)}</pre>
                    )}
                  </div>
                )}
                {selectedNode.input_data && Object.keys(selectedNode.input_data).length > 0 && (
                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Input</div>
                    <pre className="max-h-32 overflow-auto rounded border border-border bg-muted p-3 font-mono text-[10px]">{JSON.stringify(selectedNode.input_data, null, 2)}</pre>
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
