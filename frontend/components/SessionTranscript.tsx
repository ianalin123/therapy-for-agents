"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
  isProcessing: boolean;
}

export default function SessionTranscript({ messages, isProcessing }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isProcessing]);

  return (
    <div
      ref={scrollRef}
      className="absolute top-16 right-4 bottom-20 w-72 z-20 overflow-y-auto rounded-xl p-4 glass-panel"
    >
      <p className="section-label mb-3">Session Transcript</p>

      {messages.length === 0 && (
        <p className="text-xs text-[var(--color-text-secondary)]/60 italic">
          No messages yet. Begin by addressing a part.
        </p>
      )}

      {messages.map((msg) => (
        <div key={msg.id} className="mb-3">
          {msg.role === "user" ? (
            <div>
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">You</span>
              <p className="text-sm text-[var(--color-text-primary)] mt-0.5 leading-relaxed">{msg.content}</p>
            </div>
          ) : (
            <div>
              <span className="text-xs font-medium" style={{ color: msg.partColor || "var(--color-text-secondary)" }}>
                {msg.partName || msg.part}
              </span>
              <p className="text-sm text-[var(--color-text-primary)]/80 mt-0.5 leading-relaxed">{msg.content}</p>
            </div>
          )}
        </div>
      ))}

      {isProcessing && (
        <div className="flex gap-1.5 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      )}
    </div>
  );
}
