"use client";

import { Handle, Position } from '@xyflow/react';
import { Cog, Bot, User } from 'lucide-react';
import type { CustomNodeStatus } from '../lib/types';

const EXECUTOR_ICON: Record<string, typeof Cog> = {
  auto: Cog,
  agent: Bot,
  human: User,
};

interface CustomGraphNodeData {
  label: string;
  status: CustomNodeStatus;
  executorType: string;
  stepNumber: number;
  isCurrent: boolean;
  isUpcoming: boolean;
  [key: string]: unknown;
}

export default function CustomGraphNode({ data }: { data: CustomGraphNodeData }) {
  const { label, status, executorType, stepNumber, isCurrent, isUpcoming } = data;
  const Icon = EXECUTOR_ICON[executorType] || Cog;

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
    statusText = 'Under Progress';
    shadow = 'shadow-lg';
    scale = 'scale-105';
  } else if (isCurrent) {
    borderColor = 'var(--foreground)';
    labelClass = 'text-foreground';
    dotClass = 'bg-foreground';
    statusText = 'Under Progress';
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
