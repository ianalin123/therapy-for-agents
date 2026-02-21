"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/lib/types";
import { getWebSocket } from "@/lib/websocket";

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = getWebSocket();

    ws.on("assistant_message", (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content,
          timestamp: Date.now(),
          correctionType: data.correctionType || null,
        },
      ]);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, msg]);

    const ws = getWebSocket();
    ws.send({ type: "user_message", content: input });

    setInput("");
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#0D0D0F" }}>
      {/* Header */}
      <div className="p-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <h1 className="text-xl font-serif tracking-wide" style={{ color: "#F0EDE8", fontFamily: "var(--font-lora), Georgia, serif" }}>
          Briefly
        </h1>
        <p className="text-xs mt-1" style={{ color: "#A09A92" }}>
          Tell me about someone you want to remember
        </p>
      </div>

      {/* Voice Orb Area */}
      <div className="flex items-center justify-center py-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          className="relative w-16 h-16 rounded-full transition-all duration-500 hover:scale-105 group"
          style={{ background: "radial-gradient(circle, #1C1C22 0%, #141418 100%)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: "radial-gradient(circle, rgba(232,169,75,0.15) 0%, transparent 70%)" }} />
          <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#A09A92" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap" style={{ color: "#A09A92" }}>
            Tap to speak
          </span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-8 space-y-2">
            <p className="text-sm" style={{ color: "#A09A92" }}>
              Share a memory, a story, or just a feeling.
            </p>
            <p className="text-sm" style={{ color: "#A09A92" }}>
              I'm here to listen and help you remember.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed transition-all duration-300 ${
                msg.correctionType === "productive"
                  ? "ring-1 ring-amber-500/30"
                  : ""
              }`}
              style={
                msg.role === "user"
                  ? { background: "#1C1C22", color: "#F0EDE8", border: "1px solid rgba(255,255,255,0.08)" }
                  : { background: "#141418", color: "#F0EDE8" }
              }
            >
              {msg.content}
              {msg.correctionType === "productive" && (
                <div className="mt-1.5 text-xs flex items-center gap-1" style={{ color: "#E8A94B" }}>
                  <span>✦</span> Understanding updated
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Share a memory..."
            className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all duration-200"
            style={{
              background: "#141418",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#F0EDE8",
            }}
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-90"
            style={{ background: "#E8A94B", color: "#0D0D0F" }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
