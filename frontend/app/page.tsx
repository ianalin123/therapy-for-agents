"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import VoiceOrb from "@/components/voice/VoiceOrb";
import BottomBarInput from "@/components/chat/BottomBarInput";
import ChatTranscript from "@/components/chat/ChatTranscript";
import MemoryGraph from "@/components/graph/MemoryGraph";
import { ChatMessage } from "@/lib/types";
import { getWebSocket } from "@/lib/websocket";

export default function Home() {
  const [hasMemories, setHasMemories] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const transitionedRef = useRef(false);

  useEffect(() => {
    const ws = getWebSocket();
    ws.connect();

    ws.on("assistant_message", (data) => {
      setIsProcessing(false);
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

    ws.on("graph_update", () => {
      if (!transitionedRef.current) {
        transitionedRef.current = true;
        setHasMemories(true);
      }
    });

    return () => ws.disconnect();
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, msg]);
      setIsProcessing(true);
      const ws = getWebSocket();
      ws.send({ type: "user_message", content });
    },
    []
  );

  const handleNodeQuery = useCallback((nodeId: string, question: string) => {
    const ws = getWebSocket();
    ws.send({ type: "node_query", nodeId, question });
  }, []);

  return (
    <main className="h-screen relative overflow-hidden" style={{ background: "#0D0D0F" }}>
      {/* ===== Landing State: Orb Hero ===== */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
          hasMemories ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"
        }`}
      >
        {/* Title */}
        <h1
          className="text-4xl font-serif tracking-wide mb-2"
          style={{ color: "#F0EDE8" }}
        >
          Briefly
        </h1>
        <p className="text-sm mb-12" style={{ color: "#A09A92" }}>
          Tell me about someone you want to remember
        </p>

        {/* Orb */}
        <VoiceOrb mode="hero" />

        {/* Processing indicator */}
        {isProcessing && (
          <div className="mt-8 flex flex-col items-center gap-3 animate-pulse">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#E8A94B", animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#E8A94B", animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#E8A94B", animationDelay: "300ms" }} />
            </div>
            <p className="text-xs" style={{ color: "#A09A92" }}>Listening to your memory...</p>
          </div>
        )}

        {/* Text fallback */}
        <div className={`mt-16 w-80 transition-opacity duration-300 ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
          <BottomBarInput
            onSend={sendMessage}
            placeholder="or type a memory..."
            minimal
          />
        </div>
      </div>

      {/* ===== Graph State: Full-screen graph + orb widget ===== */}
      <div
        className={`absolute inset-0 transition-all duration-700 ease-in-out ${
          hasMemories ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Full-screen graph */}
        <div className="absolute inset-0">
          <MemoryGraph onNodeQuery={handleNodeQuery} />
        </div>

        {/* Orb widget — top left */}
        <div className="absolute top-4 left-4 z-20">
          <VoiceOrb mode="widget" />
        </div>

        {/* Title badge — next to orb */}
        <div className="absolute top-5 left-20 z-20">
          <span
            className="text-sm font-serif tracking-wide"
            style={{ color: "rgba(240, 237, 232, 0.6)" }}
          >
            Briefly
          </span>
        </div>

        {/* Chat transcript overlay */}
        <ChatTranscript messages={messages} />

        {/* Bottom bar input */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <BottomBarInput onSend={sendMessage} />
        </div>
      </div>
    </main>
  );
}
