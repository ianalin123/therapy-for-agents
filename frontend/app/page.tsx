"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import VoiceOrb from "@/components/voice/VoiceOrb";
import BottomBarInput from "@/components/chat/BottomBarInput";
import ChatTranscript from "@/components/chat/ChatTranscript";
import MemoryGraph from "@/components/graph/MemoryGraph";
import { AgentPanel } from "@/components/agents/AgentPanel";
import { ChatMessage, AgentName, AgentStatus, CorrectionEvent } from "@/lib/types";
import { getWebSocket } from "@/lib/websocket";
import { useVoiceInput } from "@/hooks/useVoiceInput";

const IDLE_STATUS: AgentStatus = { agent: "listener", status: "idle" };

function makeIdleStatuses(): Record<AgentName, AgentStatus> {
  return {
    listener: { ...IDLE_STATUS, agent: "listener" },
    learner: { ...IDLE_STATUS, agent: "learner" },
    reflector: { ...IDLE_STATUS, agent: "reflector" },
    guardian: { ...IDLE_STATUS, agent: "guardian" },
  };
}

export default function Home() {
  const [hasMemories, setHasMemories] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<Record<AgentName, AgentStatus>>(makeIdleStatuses);
  const [correction, setCorrection] = useState<CorrectionEvent | null>(null);
  const transitionedRef = useRef(false);

  useEffect(() => {
    const ws = getWebSocket();
    ws.connect();

    const onAssistant = (data: any) => {
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
    };

    const onGraphUpdate = () => {
      if (!transitionedRef.current) {
        transitionedRef.current = true;
        setHasMemories(true);
      }
    };

    const onAgentStatus = (data: any) => {
      setAgentStatuses((prev) => ({
        ...prev,
        [data.agent]: {
          agent: data.agent,
          status: data.status,
          summary: data.summary,
          durationMs: data.durationMs,
        },
      }));
    };

    const onCorrection = (data: any) => {
      setCorrection({
        correctionType: data.correctionType,
        beforeClaim: data.beforeClaim || "",
        afterInsight: data.afterInsight || "",
        learnerReflection: data.learnerReflection || "",
        newMemoryUnlocked: data.newMemoryUnlocked || false,
        affectedNodeIds: data.affectedNodeIds || [],
      });
    };

    ws.on("assistant_message", onAssistant);
    ws.on("graph_update", onGraphUpdate);
    ws.on("agent_status", onAgentStatus);
    ws.on("correction_detected", onCorrection);

    return () => {
      ws.off("assistant_message", onAssistant);
      ws.off("graph_update", onGraphUpdate);
      ws.off("agent_status", onAgentStatus);
      ws.off("correction_detected", onCorrection);
      ws.disconnect();
    };
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
      setAgentStatuses(makeIdleStatuses());

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

  const dismissCorrection = useCallback(() => setCorrection(null), []);

  return (
    <main className="h-screen relative overflow-hidden" style={{ background: "#0D0D0F" }}>
      {/* Agent activity panel — always mounted, auto-hides when idle */}
      <AgentPanel statuses={agentStatuses} />

      {/* ===== Landing State: Orb Hero ===== */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
          hasMemories ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"
        }`}
      >
        <h1
          className="text-4xl font-serif tracking-wide mb-2"
          style={{ color: "#F0EDE8" }}
        >
          Griefly
        </h1>
        <p className="text-sm mb-12" style={{ color: "#A09A92" }}>
          Tell me about someone you want to remember
        </p>

        <VoiceOrb mode="hero" isListening={isListening} onClick={toggleListening} />

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
        <div className="absolute inset-0">
          <MemoryGraph
            onNodeQuery={handleNodeQuery}
            correction={correction}
            onDismissCorrection={dismissCorrection}
          />
        </div>

        <div className="absolute top-4 left-4 z-20">
          <VoiceOrb mode="widget" isListening={isListening} onClick={toggleListening} />
        </div>

        <div className="absolute top-5 left-20 z-20">
          <span
            className="text-sm font-serif tracking-wide"
            style={{ color: "rgba(240, 237, 232, 0.6)" }}
          >
            Griefly
          </span>
        </div>

        <ChatTranscript messages={messages} />

        <div className="absolute bottom-0 left-0 right-0 z-20">
          <BottomBarInput onSend={sendMessage} />
        </div>
      </div>
    </main>
  );
}
