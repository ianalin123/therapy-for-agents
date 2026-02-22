"use client";

import React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import TherapyGraph from "@/components/graph/TherapyGraph";
import BottomBarInput from "@/components/chat/BottomBarInput";
import Header from "@/components/Header";
import AgentStatusBar from "@/components/AgentStatusBar";
import CaseFileOverlay from "@/components/CaseFileOverlay";
import SessionTranscript from "@/components/SessionTranscript";
import VectorDashboard from "@/components/graph/VectorDashboard";
import WarmthIndicator from "@/components/WarmthIndicator";
import {
  ChatMessage, ScenarioInfo, BreakthroughEvent,
  GraphData, GraphNode, GraphEdge, AgentStatus, SpeechBubble,
  VectorSnapshot, WarmthSignal,
} from "@/lib/types";
import { getWebSocket } from "@/lib/websocket";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import {
  BUBBLE_LIFETIME_MS, BUBBLE_CLEANUP_INTERVAL_MS, PROCESSING_TIMEOUT_MS,
} from "@/lib/constants";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="h-screen flex items-center justify-center bg-[var(--color-bg-primary)]">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-serif mb-3 text-[var(--color-text-primary)]">
              Session Interrupted
            </h1>
            <p className="text-sm mb-4 text-[var(--color-text-secondary)]">
              Something went wrong. Please refresh to restart the session.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-[var(--color-bg-primary)]"
            >
              Refresh Session
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

function HomeContent() {
  const [scenario, setScenario] = useState<ScenarioInfo | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [speechBubbles, setSpeechBubbles] = useState<SpeechBubble[]>([]);
  const [breakthrough, setBreakthrough] = useState<BreakthroughEvent | null>(null);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [vectors, setVectors] = useState<VectorSnapshot | null>(null);
  const [warmth, setWarmth] = useState<WarmthSignal | null>(null);
  const [triggeredBreakthroughs, setTriggeredBreakthroughs] = useState(0);
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
      if (data.triggeredBreakthroughs) {
        setTriggeredBreakthroughs(data.triggeredBreakthroughs.length);
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
      setTriggeredBreakthroughs(prev => prev + 1);

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

    const onVectorSnapshot = (data: any) => {
      setVectors(data.vectors);
    };

    const onWarmthSignal = (data: any) => {
      setWarmth({ warmth: data.warmth, nextBreakthroughId: data.nextBreakthroughId });
    };

    ws.on("scenario_loaded", onScenarioLoaded);
    ws.on("part_response", onPartResponse);
    ws.on("breakthrough", onBreakthrough);
    ws.on("agent_status", onAgentStatus);
    ws.on("vector_snapshot", onVectorSnapshot);
    ws.on("warmth_signal", onWarmthSignal);

    return () => {
      ws.off("scenario_loaded", onScenarioLoaded);
      ws.off("part_response", onPartResponse);
      ws.off("breakthrough", onBreakthrough);
      ws.off("agent_status", onAgentStatus);
      ws.off("vector_snapshot", onVectorSnapshot);
      ws.off("warmth_signal", onWarmthSignal);
      ws.disconnect();
    };
  }, []);

  // Clean up old speech bubbles
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeechBubbles((prev) => prev.filter((b) => Date.now() - b.timestamp < BUBBLE_LIFETIME_MS));
    }, BUBBLE_CLEANUP_INTERVAL_MS);
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
      processingTimeoutRef.current = setTimeout(() => setIsProcessing(false), PROCESSING_TIMEOUT_MS);

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

  const activeAgents = Object.values(agentStatuses).filter((a) => a.status === "running");

  return (
    <main className="h-screen relative overflow-hidden bg-[var(--color-bg-primary)]">
      {/* Case file opening overlay */}
      {!sessionStarted && scenario && (
        <CaseFileOverlay
          scenario={scenario}
          isVoiceSupported={isSupported}
          onBegin={() => setSessionStarted(true)}
        />
      )}

      <Header scenario={scenario} />
      <AgentStatusBar agents={activeAgents} />

      <VectorDashboard vectors={vectors} triggeredBreakthroughs={triggeredBreakthroughs} />

      {/* Selected part indicator */}
      {selectedPart && scenario?.parts[selectedPart] && (
        <div className="absolute top-14 left-4 z-20">
          <button
            onClick={() => setSelectedPart(null)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5 bg-[var(--glass-bg-heavy)]"
            style={{
              border: `1px solid ${scenario.parts[selectedPart].color}40`,
              color: scenario.parts[selectedPart].color,
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: scenario.parts[selectedPart].color }} />
            Speaking to {scenario.parts[selectedPart].name}
            <span className="text-[var(--color-text-secondary)] ml-1">&times;</span>
          </button>
        </div>
      )}

      {/* Graph (full screen) */}
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

      <SessionTranscript messages={messages} isProcessing={isProcessing} />

      <WarmthIndicator warmth={warmth} />

      {/* Input bar */}
      <div className="absolute bottom-0 inset-x-0 z-20">
        <div className="flex gap-3 p-4 items-center bg-[var(--color-bg-primary)]/85 backdrop-blur-xl border-t border-[var(--glass-border)]">
          {isSupported && (
            <button
              onClick={toggleListening}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 relative"
              style={{
                background: isListening ? "rgba(232, 169, 75, 0.2)" : "var(--color-border)",
                border: isListening ? "1px solid var(--color-border-accent)" : "1px solid var(--color-border)",
              }}
              aria-label={isListening ? "Stop listening" : "Start voice input"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isListening ? "var(--color-accent)" : "var(--color-text-secondary)"} strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              {isListening && (
                <span className="absolute inset-0 rounded-lg bg-[var(--color-accent)] animate-ping opacity-20" />
              )}
            </button>
          )}
          <div className="flex-1">
            <BottomBarInput
              onSend={sendMessage}
              placeholder={placeholder}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
  );
}
