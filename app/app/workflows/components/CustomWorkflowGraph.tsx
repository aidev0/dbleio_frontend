"use client";

import { useMemo } from 'react';
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
import CustomGraphNode from './CustomGraphNode';
import type { CustomGraphNode as DBNode, CustomGraphEdge as DBEdge } from '../lib/types';

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
}

export default function CustomWorkflowGraph({ nodes: dbNodes, edges: dbEdges }: CustomWorkflowGraphProps) {

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

    // Group bundles into rows (bundles sharing similar position_y)
    const bundleRows: BundleConfig[][] = [];
    let currentRowBundles: BundleConfig[] = [];
    let lastRowY = -Infinity;

    for (const bundle of sortedBundles) {
      const bundleNodes = bundleMap.get(bundle.label)!;
      const avgY = bundleNodes.reduce((s, n) => s + n.position_y, 0) / bundleNodes.length;
      if (Math.abs(avgY - lastRowY) > 100 && currentRowBundles.length > 0) {
        bundleRows.push(currentRowBundles);
        currentRowBundles = [];
      }
      currentRowBundles.push(bundle);
      lastRowY = avgY;
    }
    if (currentRowBundles.length > 0) bundleRows.push(currentRowBundles);

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

    // ─── Build ReactFlow edges ──────────────────────────────────
    const arrow = { type: MarkerType.ArrowClosed as const, width: 16, height: 16 };
    const flowEdges: Edge[] = dbEdges.map((e) => {
      const isConditional = e.edge_type === 'conditional';
      const srcPos = nodePositions[e.source_node_id];
      const tgtPos = nodePositions[e.target_node_id];
      const sameRow = srcPos && tgtPos && Math.abs(srcPos.y - tgtPos.y) < 10;
      const isBackward = srcPos && tgtPos && tgtPos.x < srcPos.x;

      let sourceHandle = sameRow ? 'source-right' : 'source-bottom';
      let targetHandle = sameRow ? 'target-left' : 'target-top';

      if (isConditional && isBackward) {
        sourceHandle = 'loop-source';
        targetHandle = 'loop-target';
      }

      return {
        id: e._id,
        source: e.source_node_id,
        target: e.target_node_id,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        label: e.label || undefined,
        style: isConditional
          ? { stroke: 'var(--muted-foreground)', strokeWidth: 1.5, strokeDasharray: '6,3', opacity: 0.7 }
          : { stroke: 'var(--foreground)', strokeWidth: 2 },
        markerEnd: {
          ...arrow,
          color: isConditional ? 'var(--muted-foreground)' : 'var(--foreground)',
        },
        labelStyle: isConditional ? { fontSize: 9, fill: 'var(--muted-foreground)' } : undefined,
      };
    });

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

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
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
