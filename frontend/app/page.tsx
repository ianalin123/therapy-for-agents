"use client";

import React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import TherapyGraph from "@/components/graph/TherapyGraph";
import BottomBarInput from "@/components/chat/BottomBarInput";
import {
  ChatMessage, ScenarioInfo, BreakthroughEvent,
  GraphData, GraphNode, GraphEdge, AgentStatus,
} from "@/lib/types";
import { getWebSocket } from "@/lib/websocket";
import { useVoiceInput } from "@/hooks/useVoiceInput";

interface SpeechBubble {
  id: string;
  part: string;
  name: string;
  content: string;
  color: string;
  timestamp: number;
}

export default function Home() {
  const [scenario, setScenario] = useState<ScenarioInfo | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [speechBubbles, setSpeechBubbles] = useState<SpeechBubble[]>([]);
  const [breakthrough, setBreakthrough] = useState<BreakthroughEvent | null>(null);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ws = getWebSocket();
    ws.connect();

    const onScenarioLoaded = (data: any) => {
      setScenario(data.scenario);
      const snap = data.graphData;
      if (snap?.nodes) {
        setGraphData({ nodes: snap.nodes, links: snap.links || [] });
      }
    };

    const onPartResponse = (data: any) => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      setIsProcessing(false);

      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "part",
        content: data.content,
        timestamp: Date.now(),
        part: data.part,
        partName: data.name,
        partColor: data.color,
      };
      setMessages((prev) => [...prev, msg]);

      setSpeechBubbles((prev) => [
        ...prev,
        {
          id: msg.id,
          part: data.part,
          name: data.name,
          content: data.content,
          color: data.color,
          timestamp: Date.now(),
        },
      ]);
    };

    const onBreakthrough = (data: any) => {
      setBreakthrough(data);

      const snap = data.fullSnapshot;
      if (snap?.nodes) {
        setGraphData({ nodes: snap.nodes, links: snap.links || [] });
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

    ws.on("scenario_loaded", onScenarioLoaded);
    ws.on("part_response", onPartResponse);
    ws.on("breakthrough", onBreakthrough);
    ws.on("agent_status", onAgentStatus);

    return () => {
      ws.off("scenario_loaded", onScenarioLoaded);
      ws.off("part_response", onPartResponse);
      ws.off("breakthrough", onBreakthrough);
      ws.off("agent_status", onAgentStatus);
      ws.disconnect();
    };
  }, []);

  // Clean up old speech bubbles
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeechBubbles((prev) => prev.filter((b) => Date.now() - b.timestamp < 16000));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      if (!sessionStarted) setSessionStarted(true);

      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, msg]);
      setIsProcessing(true);

      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = setTimeout(() => setIsProcessing(false), 30000);

      const ws = getWebSocket();
      ws.send({ type: "user_message", content });
    },
    [sessionStarted],
  );

  const { isListening, isSupported, toggleListening } = useVoiceInput({ onTranscript: sendMessage });

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedPart((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const dismissBreakthrough = useCallback(() => setBreakthrough(null), []);

  const placeholder = selectedPart && scenario?.parts[selectedPart]
    ? `Speaking to ${scenario.parts[selectedPart].name}...`
    : "Ask any part a question...";

  // Active agent indicators
  const activeAgents = Object.values(agentStatuses).filter((a) => a.status === "running");

  return (
    <main className="h-screen relative overflow-hidden" style={{ background: "#0D0D0F" }}>
      {/* ===== Case File Opening ===== */}
      {!sessionStarted && scenario && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(13, 13, 15, 0.7)" }} />
          <div
            className="relative max-w-[480px] rounded-2xl p-6 border border-white/10 shadow-2xl"
            style={{ background: "#141418" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-8 rounded-full bg-amber-500" />
              <div>
                <h1 className="text-xl font-serif text-[#F0EDE8]">
                  {scenario.title}
                </h1>
                <p className="text-xs italic text-amber-500/80 mt-0.5">
                  {scenario.tagline}
                </p>
              </div>
            </div>

            <div className="rounded-lg p-4 mb-4" style={{ background: "#0D0D0F" }}>
              <p className="text-xs uppercase tracking-wider text-[#A09A92] mb-2">Case File</p>
              <p className="text-sm text-[#F0EDE8] leading-relaxed whitespace-pre-line">
                {scenario.caseDescription}
              </p>
            </div>

            <div className="mb-4">
              <p className="text-xs uppercase tracking-wider text-[#A09A92] mb-2">Parts Present</p>
              <div className="flex gap-2">
                {Object.entries(scenario.parts).map(([id, part]) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                    style={{
                      background: part.color + "20",
                      color: part.color,
                      border: `1px solid ${part.color}30`,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: part.color }} />
                    {part.name}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-[#A09A92] mb-4">
              Click a node in the graph to address a specific part, or ask a general question.
              {isSupported && " Voice input is available."}
            </p>

            <button
              onClick={() => setSessionStarted(true)}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-amber-500/90"
              style={{ background: "#E8A94B", color: "#0D0D0F" }}
            >
              Begin Session
            </button>
          </div>
        </div>
      )}

      {/* ===== Header ===== */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        <span className="text-sm font-serif tracking-wide" style={{ color: "rgba(240, 237, 232, 0.6)" }}>
          AgentTherapy
        </span>
        {scenario && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(232, 169, 75, 0.15)", color: "#E8A94B" }}>
            {scenario.title}
          </span>
        )}
      </div>

      {/* ===== Agent status indicators ===== */}
      {activeAgents.length > 0 && (
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-1">
          {activeAgents.map((a) => (
            <div
              key={a.agent}
              className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-lg"
              style={{ background: "rgba(20, 20, 24, 0.8)", color: "#A09A92" }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "#E8A94B" }}
              />
              {a.agent}
            </div>
          ))}
        </div>
      )}

      {/* ===== Selected part indicator ===== */}
      {selectedPart && scenario?.parts[selectedPart] && (
        <div className="absolute top-14 left-4 z-20">
          <button
            onClick={() => setSelectedPart(null)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{
              background: "rgba(20, 20, 24, 0.8)",
              border: `1px solid ${scenario.parts[selectedPart].color}40`,
              color: scenario.parts[selectedPart].color,
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: scenario.parts[selectedPart].color }} />
            Speaking to {scenario.parts[selectedPart].name}
            <span className="text-[#A09A92] ml-1">&times;</span>
          </button>
        </div>
      )}

      {/* ===== Graph (full screen) ===== */}
      <div className="absolute inset-0">
        <TherapyGraph
          graphData={graphData}
          onNodeClick={handleNodeClick}
          selectedPart={selectedPart}
          speechBubbles={speechBubbles}
          breakthrough={breakthrough}
          onDismissBreakthrough={dismissBreakthrough}
        />
      </div>

      {/* ===== Session transcript (right side) ===== */}
      <div
        className="absolute top-16 right-4 bottom-20 w-72 z-20 overflow-y-auto rounded-xl p-3"
        style={{
          background: "rgba(20, 20, 24, 0.75)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p className="text-xs uppercase tracking-wider text-[#A09A92] mb-2">Session Transcript</p>
        {messages.length === 0 && (
          <p className="text-xs text-[#A09A92]/60 italic">
            No messages yet. Begin by addressing a part.
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2.5">
            {msg.role === "user" ? (
              <div>
                <span className="text-xs font-medium text-[#A09A92]">You</span>
                <p className="text-xs text-[#F0EDE8] mt-0.5 leading-relaxed">{msg.content}</p>
              </div>
            ) : (
              <div>
                <span className="text-xs font-medium" style={{ color: msg.partColor || "#A09A92" }}>
                  {msg.partName || msg.part}
                </span>
                <p className="text-xs text-[#F0EDE8]/80 mt-0.5 leading-relaxed">{msg.content}</p>
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-1.5 mt-2">
            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#E8A94B", animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#E8A94B", animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#E8A94B", animationDelay: "300ms" }} />
          </div>
        )}
      </div>

      {/* ===== Input bar ===== */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div
          className="flex gap-2 p-4 items-center"
          style={{
            background: "rgba(13, 13, 15, 0.85)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {isSupported && (
            <button
              onClick={toggleListening}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0"
              style={{
                background: isListening ? "rgba(232, 169, 75, 0.2)" : "rgba(255,255,255,0.06)",
                border: isListening ? "1px solid rgba(232, 169, 75, 0.4)" : "1px solid rgba(255,255,255,0.08)",
              }}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isListening ? "#E8A94B" : "#A09A92"} strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              {isListening && (
                <span className="absolute w-10 h-10 rounded-xl animate-ping opacity-20" style={{ background: "#E8A94B" }} />
              )}
            </button>
          )}
          <div className="flex-1">
            <BottomBarInput
              onSend={sendMessage}
              placeholder={placeholder}
              minimal
            />
          </div>
        </div>
      </div>
    </main>
  );
}
