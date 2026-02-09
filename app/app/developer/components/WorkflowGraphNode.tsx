"use client";

import { Handle, Position } from '@xyflow/react';
import { Cog, Bot, User } from 'lucide-react';
import type { NodeStatus, NodeType } from '../lib/types';
import { STAGE_LABELS } from '../lib/types';

const STATUS_COLORS: Record<string, string> = {
  pending:          'color-mix(in oklch, var(--muted-foreground) 20%, transparent)',
  running:          'var(--foreground)',
  completed:        'var(--foreground)',
  failed:           'var(--destructive)',
  waiting_approval: 'var(--chart-1)',
};

const STATUS_DOT: Record<string, string> = {
  pending:          'bg-muted-foreground/30',
  running:          'bg-foreground',
  completed:        'bg-foreground',
  failed:           'bg-destructive',
  waiting_approval: 'bg-chart-1',
};

const STATUS_LABEL: Record<string, string> = {
  pending:          'Pending',
  running:          'Running',
  completed:        'Done',
  failed:           'Failed',
  waiting_approval: 'Awaiting',
};

const STATUS_PROGRESS: Record<string, number> = {
  pending:          0,
  running:          50,
  completed:        100,
  failed:           75,
  waiting_approval: 75,
};

const NODE_TYPE_ICON: Record<string, typeof Cog> = {
  auto: Cog,
  agent: Bot,
  human: User,
};

function formatElapsed(startedAt?: string, completedAt?: string): string | null {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface WorkflowGraphNodeData {
  stageName: string;
  status: NodeStatus;
  nodeType: NodeType;
  iteration: number;
  stepNumber: number;
  startedAt?: string;
  completedAt?: string;
  onClick?: () => void;
  [key: string]: unknown;
}

export default function WorkflowGraphNode({ data }: { data: WorkflowGraphNodeData }) {
  const { stageName, status, nodeType, iteration, stepNumber, startedAt, completedAt, onClick } = data;
  const label = STAGE_LABELS[stageName] || stageName;
  const borderColor = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const dotClass = STATUS_DOT[status] || STATUS_DOT.pending;
  const statusLabel = STATUS_LABEL[status] || 'Pending';
  const progress = STATUS_PROGRESS[status] ?? 0;
  const elapsed = formatElapsed(startedAt, completedAt);
  const Icon = NODE_TYPE_ICON[nodeType] || Cog;
  const isActive = status === 'running' || status === 'waiting_approval';

  return (
    <>
      {/* Target handles */}
      <Handle id="target-top" type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" />
      <Handle id="target-left" type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
      <Handle id="target-right" type="target" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
      <Handle id="loop-target" type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" style={{ left: '30%' }} />

      <div
        onClick={onClick}
        className={`w-[220px] cursor-pointer rounded-lg border border-border border-l-[3px] bg-background p-3 transition-all hover:shadow-md ${isActive ? 'shadow-sm' : ''}`}
        style={{
          borderLeftColor: borderColor,
          animation: isActive ? 'node-pulse 2s ease-in-out infinite' : undefined,
        }}
      >
        {/* Row 1: step number + label + icon */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-muted-foreground/50">{String(stepNumber).padStart(2, '0')}</span>
            <span className="text-[13px] font-medium leading-tight">{label}</span>
          </div>
          <Icon className="h-3.5 w-3.5 text-muted-foreground/40" />
        </div>

        {/* Row 2: micro progress bar */}
        <div className="mb-1.5 h-[2px] w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: borderColor,
              animation: status === 'running' ? 'progress-shimmer 2s ease-in-out infinite' : undefined,
            }}
          />
        </div>

        {/* Row 3: status dot + label + iteration + elapsed */}
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass} ${status === 'running' ? 'animate-pulse' : ''}`} />
          <span className="font-mono text-[10px] text-muted-foreground">{statusLabel}</span>
          {iteration > 0 && (
            <span className="font-mono text-[9px] text-muted-foreground/50">x{iteration + 1}</span>
          )}
          {elapsed && (
            <span className="ml-auto font-mono text-[9px] text-muted-foreground/40">{elapsed}</span>
          )}
        </div>
      </div>

      {/* Source handles */}
      <Handle id="source-right" type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
      <Handle id="source-left" type="source" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
      <Handle id="source-bottom" type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
      <Handle id="loop-source" type="source" position={Position.Top} className="!opacity-0 !w-0 !h-0" style={{ left: '70%' }} />
    </>
  );
}
