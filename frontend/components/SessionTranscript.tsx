"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
  isProcessing: boolean;
  activeAgent?: string | null;
}

export default function SessionTranscript({ messages, isProcessing, activeAgent }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isProcessing]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--glass-border)]">
        <p className="section-label">Session Transcript</p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-[var(--color-text-tertiary)] italic text-center leading-relaxed">
              Begin the session by addressing<br />a part or asking a question.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const showTimestamp = idx === 0 || (msg.timestamp - messages[idx - 1].timestamp > 30000);
          return (
            <div key={msg.id}>
              {showTimestamp && (
                <div className="text-center my-2">
                  <span className="text-[9px] font-mono text-[var(--color-text-tertiary)]">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}

              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="message-user rounded-xl rounded-br-sm px-3 py-2 max-w-[85%]">
                    <p className="text-[11px] font-medium text-[var(--color-accent)] mb-0.5">Clinician</p>
                    <p className="text-[13px] text-[var(--color-text-primary)] leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-start">
                  <div
                    className="message-part rounded-xl rounded-bl-sm px-3 py-2 max-w-[90%]"
                    style={{ borderLeftColor: msg.partColor || "var(--color-text-tertiary)" }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: msg.partColor || "var(--color-text-tertiary)" }}
                      />
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: msg.partColor || "var(--color-text-secondary)" }}
                      >
                        {msg.partName || msg.part}
                      </span>
                    </div>
                    <p className="text-[13px] text-[var(--color-text-primary)]/85 leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="message-part rounded-xl rounded-bl-sm px-3 py-2.5 border-l-[var(--color-text-tertiary)]" style={{ borderLeftColor: "var(--color-text-tertiary)" }}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" style={{ animation: "typing-dot 1.4s ease-in-out infinite", animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" style={{ animation: "typing-dot 1.4s ease-in-out infinite", animationDelay: "200ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" style={{ animation: "typing-dot 1.4s ease-in-out infinite", animationDelay: "400ms" }} />
                </div>
                {activeAgent && (
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">{activeAgent}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
