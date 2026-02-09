"use client";

import type { Workflow } from '../lib/types';
import WorkflowStatusBadge from './WorkflowStatusBadge';

interface WorkflowListProps {
  workflows: Workflow[];
  selectedId?: string;
  onSelect: (workflow: Workflow) => void;
}

export default function WorkflowList({ workflows, selectedId, onSelect }: WorkflowListProps) {
  if (workflows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="font-mono text-xs text-muted-foreground">No workflows yet</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {workflows.map((wf) => (
        <button
          key={wf._id}
          onClick={() => onSelect(wf)}
          className={`block w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary ${
            selectedId === wf._id ? 'bg-secondary' : ''
          }`}
        >
          <div className="mb-1 truncate text-sm font-medium">{wf.title}</div>
          <div className="flex items-center justify-between">
            <WorkflowStatusBadge status={wf.status} />
            <span className="font-mono text-[10px] text-muted-foreground">
              {wf.created_at ? new Date(wf.created_at).toLocaleDateString() : ''}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
