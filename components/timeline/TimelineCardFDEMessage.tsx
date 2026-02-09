"use client";

interface TimelineCardFDEMessageProps {
  content: string;
}

export default function TimelineCardFDEMessage({ content }: TimelineCardFDEMessageProps) {
  return (
    <div className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
      {content}
    </div>
  );
}
