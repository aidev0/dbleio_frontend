"use client";

import { Checkbox } from '@/components/ui/checkbox';
import type { TodoItem } from '@/app/app/developer/lib/types';

interface TimelineCardTaskProps {
  content: string;
  todos: TodoItem[];
  onToggleTodo?: (todoId: string, completed: boolean) => void;
}

export default function TimelineCardTask({ content, todos, onToggleTodo }: TimelineCardTaskProps) {
  return (
    <div>
      {content && (
        <p className="mb-3 font-sans text-sm text-muted-foreground">{content}</p>
      )}
      <div className="space-y-2">
        {todos.map((todo) => (
          <label
            key={todo.id}
            className="flex items-start gap-2.5 cursor-pointer group"
          >
            <Checkbox
              checked={todo.completed}
              onCheckedChange={(checked) => onToggleTodo?.(todo.id, !!checked)}
              className="mt-0.5"
            />
            <span
              className={`font-sans text-sm leading-snug transition-all ${
                todo.completed
                  ? 'line-through text-muted-foreground/50'
                  : 'text-foreground group-hover:text-foreground/80'
              }`}
            >
              {todo.text}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
