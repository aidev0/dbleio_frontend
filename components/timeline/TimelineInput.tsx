"use client";

import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';

interface TimelineInputProps {
  onSubmit: (content: string, title?: string) => void;
  placeholder?: string;
  className?: string;
  titleField?: boolean;
  titlePlaceholder?: string;
}

export default function TimelineInput({ onSubmit, placeholder = "Type a message...", className = "", titleField = false, titlePlaceholder = "Title (optional)" }: TimelineInputProps) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');
  const [title, setTitle] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (expanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [expanded]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const trimmedTitle = title.trim() || undefined;
    onSubmit(trimmed, trimmedTitle);
    setValue('');
    setTitle('');
    setExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setValue('');
      setExpanded(false);
    }
  };

  const handleBlur = () => {
    if (!value.trim()) {
      setExpanded(false);
    }
  };

  if (!expanded) {
    return (
      <div className={`relative flex items-center ${className}`}>
        {/* Center the 2rem button on the timeline axis (1.875rem / 2.375rem) */}
        <div className="absolute left-[0.875rem] md:left-[1.375rem] z-10">
          <button
            onClick={() => setExpanded(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-background transition-all hover:border-foreground hover:scale-110"
            style={{ animation: 'dot-appear 0.3s ease-out' }}
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="ml-[calc(1.5rem+2.5rem)] md:ml-[calc(2rem+2.5rem)] py-2">
          <button
            onClick={() => setExpanded(true)}
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {placeholder}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex items-start ${className}`} style={{ animation: 'timeline-card-enter 0.3s ease-out' }}>
      <div className="absolute left-[2.125rem] md:left-[2.625rem] top-3 z-10">
        <div className="h-3 w-3 rounded-full bg-foreground" style={{ animation: 'dot-appear 0.2s ease-out' }} />
      </div>
      <div className="ml-[calc(1.5rem+1.5rem)] md:ml-[calc(2rem+1.5rem)] w-[calc(100%-4.5rem)] md:w-[80%] py-1">
        {titleField && (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={titlePlaceholder}
            className="mb-2 w-full bg-transparent font-sans text-base font-medium outline-none placeholder:text-muted-foreground/40"
          />
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none bg-transparent font-sans text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
