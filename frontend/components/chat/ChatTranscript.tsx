"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
}

export default function ChatTranscript({ messages }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, collapsed]);

  // Only show the last 50 messages to keep things light
  const visibleMessages = messages.slice(-50);

  return (
    <div
      className="absolute bottom-16 left-4 z-20 flex flex-col"
      style={{ maxWidth: 360, maxHeight: "60vh" }}
    >
      {/* Collapsed state: small toggle icon */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center rounded-xl transition-all duration-300 hover:scale-105"
          style={{
            width: 40,
            height: 40,
            background: "rgba(13, 13, 15, 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
          title="Show chat transcript"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#A09A92"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Expanded state: full transcript panel */}
      <div
        className="flex flex-col overflow-hidden rounded-2xl transition-all duration-300"
        style={{
          opacity: collapsed ? 0 : 1,
          transform: collapsed ? "translateY(8px) scale(0.95)" : "translateY(0) scale(1)",
          pointerEvents: collapsed ? "none" : "auto",
          maxHeight: collapsed ? 0 : "60vh",
          background: "rgba(13, 13, 15, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span
            className="text-xs font-medium tracking-wide"
            style={{ color: "#A09A92" }}
          >
            Conversation
          </span>
          <button
            onClick={() => setCollapsed(true)}
            className="flex items-center justify-center rounded-lg transition-all duration-200 hover:opacity-80"
            style={{
              width: 24,
              height: 24,
              background: "rgba(255,255,255,0.04)",
            }}
            title="Collapse transcript"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#A09A92"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
          style={{
            maxHeight: "calc(60vh - 44px)",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.08) transparent",
          }}
        >
          {visibleMessages.length === 0 && (
            <p
              className="text-xs text-center py-6"
              style={{ color: "#A09A92" }}
            >
              Messages will appear here...
            </p>
          )}

          {visibleMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              {/* Productive correction indicator */}
              {msg.role === "assistant" && msg.correctionType === "productive" && (
                <div
                  className="flex items-center gap-1 mb-1 ml-1"
                  style={{ color: "#E8A94B" }}
                >
                  <span className="text-[10px] font-medium tracking-wide">
                    ✦ Understanding updated
                  </span>
                </div>
              )}

              <div
                className="rounded-xl px-3 py-2 max-w-[85%] transition-all duration-200"
                style={{
                  background: msg.role === "user" ? "#1C1C22" : "#141418",
                  border:
                    msg.role === "assistant" && msg.correctionType === "productive"
                      ? "1px solid rgba(232, 169, 75, 0.2)"
                      : "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <p
                  className="text-[13px] leading-relaxed break-words"
                  style={{
                    color: msg.role === "user" ? "#F0EDE8" : "rgba(240, 237, 232, 0.9)",
                  }}
                >
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
