"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, User, Loader2, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface ChatMessage {
  _id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  author_name?: string;
  created_at?: string;
  processing?: boolean;
}

interface ChatProps {
  messages: ChatMessage[];
  onSend: (content: string) => void | Promise<void>;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  inputOnly?: boolean;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  const d = new Date(utcStr);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-full bg-muted px-3 py-1 font-mono text-[10px] text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
        isUser ? 'bg-foreground' : 'bg-muted border border-border'
      }`}>
        {isUser ? (
          <User className="h-3.5 w-3.5 text-background" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>

      <div className={`group relative ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-foreground text-background rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm'
        }`}>
          {message.processing ? (
            <div className="flex items-center gap-1 px-1 py-0.5">
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
            </div>
          ) : isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : (
            <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&_p]:my-0.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_code]:text-xs [&_pre]:my-1 [&_pre]:text-xs">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {message.created_at && (
          <span className={`mt-0.5 block font-mono text-[9px] text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 ${
            isUser ? 'text-right' : 'text-left'
          }`}>
            {formatTime(message.created_at)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Chat({
  messages,
  onSend,
  placeholder = "Type a message...",
  loading = false,
  disabled = false,
  className = "",
  inputOnly = false,
}: ChatProps) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [value, resizeTextarea]);

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      await onSend(trimmed);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Messages */}
      {!inputOnly && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          {loading && !hasMessages && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty state — minimal */}
          {!loading && !hasMessages && (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px]" />
          )}

          <div className="space-y-3">
            {messages.map((msg) => (
              <MessageBubble key={msg._id} message={msg} />
            ))}
          </div>
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-background px-4 md:px-6 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sending ? "Sending..." : placeholder}
            disabled={disabled || sending}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-foreground/30 disabled:opacity-50"
            style={{ maxHeight: '160px' }}
          />
          <button
            onClick={handleSend}
            disabled={!value.trim() || sending || disabled}
            className="md:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background disabled:opacity-30 transition-opacity"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
