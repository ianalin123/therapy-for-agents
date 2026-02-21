"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import VoiceOrb from "@/components/voice/VoiceOrb";
import BottomBarInput from "@/components/chat/BottomBarInput";
import ChatTranscript from "@/components/chat/ChatTranscript";
import MemoryGraph from "@/components/graph/MemoryGraph";
import { ChatMessage } from "@/lib/types";
import { getWebSocket } from "@/lib/websocket";
import { useVoiceInput } from "@/hooks/useVoiceInput";

export default function Home() {
  const [hasMemories, setHasMemories] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const transitionedRef = useRef(false);

  useEffect(() => {
    const ws = getWebSocket();
    ws.connect();

    ws.on("assistant_message", (data) => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
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

    ws.on("graph_update", (data) => {
      console.log("[page] graph_update received, nodes:", data?.graphData?.nodes?.length);
      if (!transitionedRef.current) {
        transitionedRef.current = true;
        setHasMemories(true);
      }
    });

    return () => ws.disconnect();
  }, []);

  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // Safety timeout — if no response in 30s, unblock the UI
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = setTimeout(() => {
        setIsProcessing(false);
      }, 30000);

      const ws = getWebSocket();
      ws.send({ type: "user_message", content });
    },
    []
  );

  const { isListening, toggleListening } = useVoiceInput({ onTranscript: sendMessage });

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
          Griefly
        </h1>
        <p className="text-sm mb-12" style={{ color: "#A09A92" }}>
          Tell me about someone you want to remember
        </p>

        {/* Orb */}
        <VoiceOrb mode="hero" isListening={isListening} onClick={toggleListening} />

        {/* Text fallback + loading */}
        <div className="mt-16 w-80 flex flex-col items-center gap-4">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#E8A94B", animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#E8A94B", animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#E8A94B", animationDelay: "300ms" }} />
              </div>
              <p className="text-xs" style={{ color: "#A09A92" }}>Listening to your memory...</p>
            </div>
          ) : (
            <BottomBarInput
              onSend={sendMessage}
              placeholder="or type a memory..."
              minimal
            />
          )}
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
          <VoiceOrb mode="widget" isListening={isListening} onClick={toggleListening} />
        </div>

        {/* Title badge — next to orb */}
        <div className="absolute top-5 left-20 z-20">
          <span
            className="text-sm font-serif tracking-wide"
            style={{ color: "rgba(240, 237, 232, 0.6)" }}
          >
            Griefly
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
