"use client";

interface TimelineCardUserMessageProps {
  content: string;
}

export default function TimelineCardUserMessage({ content }: TimelineCardUserMessageProps) {
  return (
    <div className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
      {content}
    </div>
  );
}
