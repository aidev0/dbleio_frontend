"use client";

import { EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';

export default function FeedbackLoopEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.5,
  });

  return (
    <>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={2}
        strokeDasharray="8,4"
        opacity={0.5}
        style={{ animation: 'edge-flow 1s linear infinite' }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
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
