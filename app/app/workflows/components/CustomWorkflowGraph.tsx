"use client";

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  EdgeLabelRenderer,
  MarkerType,
  type Node,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomGraphNode from './CustomGraphNode';
import type { CustomGraphNode as DBNode, CustomGraphEdge as DBEdge } from '../lib/types';

// ─── Long feedback edge (routes far left to avoid bundles) ──────────
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

// ─── Bundle background node ─────────────────────────────────────────
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

// ─── Node & edge types ──────────────────────────────────────────────
const nodeTypes = {
  customNode: CustomGraphNode,
  bundle: BundleNode,
};

const edgeTypes = {
  longFeedback: LongFeedbackEdge,
};

// ─── Layout constants (same as developer graph) ─────────────────────
const NODE_W = 180;
const NODE_H = 52;
const NODE_GAP = 24;
const BUNDLE_PAD = 28;
const BUNDLE_GAP = 50;
const ROW_GAP = 80;
const LEFT_MARGIN = 80;
const TOP_OFFSET = 60;

interface BundleConfig {
  id: string;
  label: string;
  nodeIds: string[];
}

interface CustomWorkflowGraphProps {
  nodes: DBNode[];
  edges: DBEdge[];
  hideProgressBar?: boolean;
}

export default function CustomWorkflowGraph({ nodes: dbNodes, edges: dbEdges, hideProgressBar }: CustomWorkflowGraphProps) {

  // ─── Derive bundles from DB node config.bundle field ─────────────
  // Nodes store their bundle in config.bundle (string) and config.bundle_order (number)
  // Nodes within the same bundle are grouped; bundles are ordered by the min position_y then position_x
  const { flowNodes, flowEdges, completedCount, totalCount } = useMemo(() => {
    if (dbNodes.length === 0) return { flowNodes: [], flowEdges: [], completedCount: 0, totalCount: 0 };

    // Group nodes by bundle
    const bundleMap = new Map<string, DBNode[]>();
    const unbundled: DBNode[] = [];
    for (const n of dbNodes) {
      const bundleName = (n.config?.bundle as string) || '';
      if (bundleName) {
        if (!bundleMap.has(bundleName)) bundleMap.set(bundleName, []);
        bundleMap.get(bundleName)!.push(n);
      } else {
        unbundled.push(n);
      }
    }

    // Sort nodes within each bundle by position_x
    for (const nodes of bundleMap.values()) {
      nodes.sort((a, b) => a.position_x - b.position_x);
    }

    // Sort bundles by their first node's position_y then position_x
    const sortedBundles: BundleConfig[] = Array.from(bundleMap.entries())
      .sort((a, b) => {
        const ay = Math.min(...a[1].map((n) => n.position_y));
        const ax = Math.min(...a[1].map((n) => n.position_x));
        const by = Math.min(...b[1].map((n) => n.position_y));
        const bx = Math.min(...b[1].map((n) => n.position_x));
        return ay - by || ax - bx;
      })
      .map(([label, nodes]) => ({
        id: label.toLowerCase().replace(/\s+/g, '-'),
        label,
        nodeIds: nodes.map((n) => n._id),
      }));

    // Compute layout — bundles organized in rows by position_y groups
    const nodePositions: Record<string, { x: number; y: number }> = {};
    const bundleRects: { id: string; label: string; x: number; y: number; w: number; h: number }[] = [];

    // Each bundle gets its own row
    const bundleRows: BundleConfig[][] = sortedBundles.map((b) => [b]);

    // Lay out bundles in rows
    let rowY = TOP_OFFSET;
    for (const row of bundleRows) {
      let cursorX = LEFT_MARGIN;
      for (const bundle of row) {
        const bundleNodes = bundleMap.get(bundle.label)!;
        const contentW = bundleNodes.length * NODE_W + (bundleNodes.length - 1) * NODE_GAP;
        const bw = contentW + BUNDLE_PAD * 2;
        const bh = NODE_H + BUNDLE_PAD * 2;

        bundleRects.push({ id: bundle.id, label: bundle.label, x: cursorX, y: rowY, w: bw, h: bh });

        bundleNodes.forEach((node, i) => {
          nodePositions[node._id] = {
            x: cursorX + BUNDLE_PAD + i * (NODE_W + NODE_GAP),
            y: rowY + BUNDLE_PAD,
          };
        });

        cursorX += bw + BUNDLE_GAP;
      }
      rowY += NODE_H + BUNDLE_PAD * 2 + ROW_GAP;
    }

    // Place unbundled nodes at their DB positions (fallback)
    for (const n of unbundled) {
      if (!nodePositions[n._id]) {
        nodePositions[n._id] = { x: n.position_x, y: n.position_y };
      }
    }

    // Build ordered node list for step numbering
    const orderedNodes = [...dbNodes].sort((a, b) => {
      const pa = nodePositions[a._id] || { x: a.position_x, y: a.position_y };
      const pb = nodePositions[b._id] || { x: b.position_x, y: b.position_y };
      return pa.y - pb.y || pa.x - pb.x;
    });

    const nodeIndexMap = new Map<string, number>();
    orderedNodes.forEach((n, i) => nodeIndexMap.set(n._id, i));

    // Determine current stage (first non-completed)
    let currentNodeId: string | null = null;
    for (const n of orderedNodes) {
      if (n.status === 'running') { currentNodeId = n._id; break; }
    }
    if (!currentNodeId) {
      for (const n of orderedNodes) {
        if (n.status !== 'completed') { currentNodeId = n._id; break; }
      }
    }
    const currentIdx = currentNodeId ? nodeIndexMap.get(currentNodeId) ?? -1 : -1;

    const completedCount = orderedNodes.filter((n) => n.status === 'completed').length;

    // ─── Build ReactFlow nodes ──────────────────────────────────
    const result: Node[] = [];

    // Bundle backgrounds
    for (const br of bundleRects) {
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
    for (const n of orderedNodes) {
      const pos = nodePositions[n._id] || { x: n.position_x, y: n.position_y };
      const idx = nodeIndexMap.get(n._id) ?? 0;
      result.push({
        id: n._id,
        type: 'customNode',
        position: pos,
        data: {
          label: n.label,
          status: n.status,
          executorType: (n.config?.executor_type as string) || 'auto',
          stepNumber: idx + 1,
          isCurrent: n._id === currentNodeId,
          isUpcoming: idx > currentIdx,
        },
      });
    }

    // ─── Build ReactFlow edges (matches dev workflow exactly) ───
    // Same approach as DevelopmentWorkflowGraph:
    //   1. Intra-bundle: sequential left-to-right within each bundle
    //   2. Cross-bundle: last node of bundle[i] → first node of bundle[i+1]
    //   3. Conditional/feedback DB edges: rendered with dashed style
    const arrow = { type: MarkerType.ArrowClosed as const, width: 16, height: 16 };
    const flowEdges: Edge[] = [];

    // Build node→bundle lookup
    const nodeBundleMap = new Map<string, string>();
    for (const bundle of sortedBundles) {
      for (const nid of bundle.nodeIds) {
        nodeBundleMap.set(nid, bundle.id);
      }
    }

    // 1. Intra-bundle forward edges (sequential left-to-right)
    for (const bundle of sortedBundles) {
      for (let i = 0; i < bundle.nodeIds.length - 1; i++) {
        const src = bundle.nodeIds[i];
        const tgt = bundle.nodeIds[i + 1];
        flowEdges.push({
          id: `intra-${src}-${tgt}`,
          source: src,
          target: tgt,
          sourceHandle: 'source-right',
          targetHandle: 'target-left',
          type: 'smoothstep',
          style: { stroke: 'var(--foreground)', strokeWidth: 2 },
          markerEnd: { ...arrow, color: 'var(--foreground)' },
        });
      }
    }

    // 2. Cross-bundle forward edges (last node → first node of next bundle)
    for (let i = 0; i < sortedBundles.length - 1; i++) {
      const srcBundle = sortedBundles[i];
      const tgtBundle = sortedBundles[i + 1];
      const src = srcBundle.nodeIds[srcBundle.nodeIds.length - 1];
      const tgt = tgtBundle.nodeIds[0];

      // Find the DB edge for this cross-bundle connection (if any) to get label
      const dbEdge = dbEdges.find((e) =>
        e.edge_type !== 'conditional' &&
        nodeBundleMap.get(e.source_node_id) === srcBundle.id &&
        nodeBundleMap.get(e.target_node_id) === tgtBundle.id
      );

      flowEdges.push({
        id: `cross-${src}-${tgt}`,
        source: src,
        target: tgt,
        sourceHandle: 'source-bottom',
        targetHandle: 'target-top',
        type: 'smoothstep',
        label: dbEdge?.label || undefined,
        style: { stroke: 'var(--foreground)', strokeWidth: 2 },
        markerEnd: { ...arrow, color: 'var(--foreground)' },
      });
    }

    // 3. Conditional / feedback DB edges (dashed)
    for (const e of dbEdges) {
      if (e.edge_type !== 'conditional') continue;

      const srcPos = nodePositions[e.source_node_id];
      const tgtPos = nodePositions[e.target_node_id];
      const sameRow = srcPos && tgtPos && Math.abs(srcPos.y - tgtPos.y) < 10;
      const isBackward = srcPos && tgtPos && tgtPos.x < srcPos.x;

      let sourceHandle: string;
      let targetHandle: string;
      let edgeType = 'smoothstep';

      if (isBackward && sameRow) {
        // Short feedback loops (same row) — top handles
        sourceHandle = 'loop-source';
        targetHandle = 'loop-target';
      } else if (isBackward && !sameRow) {
        // Long feedback loops (cross-row) — route far left
        sourceHandle = 'source-left';
        targetHandle = 'target-left';
        edgeType = 'longFeedback';
      } else {
        sourceHandle = 'source-right';
        targetHandle = 'target-left';
      }

      flowEdges.push({
        id: e._id,
        source: e.source_node_id,
        target: e.target_node_id,
        sourceHandle,
        targetHandle,
        type: edgeType,
        label: e.label || undefined,
        style: { stroke: 'var(--muted-foreground)', strokeWidth: 1.5, strokeDasharray: '6,3', opacity: 0.7 },
        markerEnd: { ...arrow, color: 'var(--muted-foreground)' },
        labelStyle: { fontSize: 9, fill: 'var(--muted-foreground)' },
      });
    }

    return { flowNodes: result, flowEdges, completedCount, totalCount: orderedNodes.length };
  }, [dbNodes, dbEdges]);

  if (dbNodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-xs text-muted-foreground">No graph nodes yet.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Progress header */}
      {!hideProgressBar && (
        <div className="absolute top-0 left-0 right-0 z-10 px-4 py-2 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Pipeline</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="h-[2px] w-full rounded-full bg-border overflow-hidden">
            <div className="h-full rounded-full bg-foreground transition-all duration-500" style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }} />
          </div>
        </div>
      )}

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
    </div>
  );
}
