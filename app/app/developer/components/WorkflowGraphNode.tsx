"use client";

import { Handle, Position } from '@xyflow/react';
import { Bot, User } from 'lucide-react';
import type { NodeStatus, NodeType } from '../lib/types';
import { STAGE_LABELS } from '../lib/types';

const NODE_TYPE_ICON: Record<string, typeof Bot> = {
  auto: Bot,
  agent: Bot,
  human: User,
};

interface WorkflowGraphNodeData {
  stageName: string;
  status: NodeStatus;
  nodeType: NodeType;
  stepNumber: number;
  isCurrent: boolean;
  onClick?: () => void;
  [key: string]: unknown;
}

export default function WorkflowGraphNode({ data }: { data: WorkflowGraphNodeData }) {
  const { stageName, status, nodeType, stepNumber, isCurrent, onClick } = data;
  const isUpcoming = data.isUpcoming as boolean;
  const label = STAGE_LABELS[stageName] || stageName;
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
  } else if (isCurrent && (status === 'waiting_approval')) {
    borderColor = 'var(--chart-1)';
    labelClass = 'text-foreground';
    numClass = 'text-foreground/70';
    dotClass = 'bg-chart-1';
    statusText = 'Awaiting';
    shadow = 'shadow-md';
    scale = 'scale-105';
  } else if (isCurrent) {
    // Current stage but pending — highlight it as active
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
    // Future stages — dimmed
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
