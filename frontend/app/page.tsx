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
import ModalitySelector from "@/components/ModalitySelector";
import SessionFeedback from "@/components/SessionFeedback";
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

// Dynamic placeholders based on session state
const PLACEHOLDERS = {
  initial: "Begin by addressing a part...",
  early: "Ask a question or challenge an assumption...",
  probing: "Probe deeper — what's underneath that response?",
  warm: "You're getting close — push further...",
  post: "Continue exploring or address another part...",
};

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
  const [selectedScenario, setSelectedScenario] = useState("sycophancy");
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

  // Dynamic placeholder
  const getPlaceholder = () => {
    if (selectedPart && scenario?.parts[selectedPart]) {
      return `Speaking to ${scenario.parts[selectedPart].name}...`;
    }
    if (!sessionStarted) return PLACEHOLDERS.initial;
    if (warmth && warmth.warmth > 0.5) return PLACEHOLDERS.warm;
    if (triggeredBreakthroughs > 0) return PLACEHOLDERS.post;
    if (messages.length > 4) return PLACEHOLDERS.probing;
    return PLACEHOLDERS.early;
  };

  const activeAgents = Object.values(agentStatuses).filter((a) => a.status === "running");
  const activeAgentName = activeAgents.length > 0 ? activeAgents[activeAgents.length - 1].agent : null;

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-[var(--color-bg-primary)]">
      {/* Case file opening overlay — only before session starts */}
      {!sessionStarted && scenario && (
        <CaseFileOverlay
          scenario={scenario}
          isVoiceSupported={isSupported}
          onBegin={() => setSessionStarted(true)}
        />
      )}

      {/* Header */}
      <Header
        scenario={scenario}
        sessionStarted={sessionStarted}
        messageCount={messages.filter(m => m.role === "user").length}
      />

      {/* Agent status bar (only when processing) */}
      <AgentStatusBar agents={activeAgents} />

      {/* Main three-column layout */}
      <div className="flex-1 flex min-h-0">

        {/* Left Sidebar */}
        <aside className="sidebar-left w-[280px] shrink-0 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-5 flex-1">

            {/* Persistent Scenario Briefing — always visible during session */}
            {scenario && (
              <div>
                <p className="section-label mb-2">Scenario Briefing</p>
                <div className="rounded-lg p-3 bg-white/[0.02] border border-[var(--glass-border)]">
                  <h3 className="text-sm font-serif font-semibold text-[var(--color-text-primary)] mb-1.5">
                    {scenario.title}
                  </h3>
                  <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mb-3">
                    {scenario.caseDescription}
                  </p>
                  <div className="pt-2 border-t border-[var(--glass-border)]">
                    <p className="text-[11px] text-[var(--color-accent)]/80 italic leading-relaxed">
                      You are the Clinician. The AI's internal parts are present. Your job is to find out what really happened inside.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Parts present — always visible */}
            {scenario && (
              <div>
                <p className="section-label mb-2">Parts Present</p>
                <div className="space-y-1.5">
                  {Object.entries(scenario.parts).map(([id, part]) => {
                    const isSelected = selectedPart === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedPart(isSelected ? null : id)}
                        className="flex items-center gap-2.5 text-xs w-full px-3 py-2 rounded-lg transition-all hover:bg-white/5"
                        style={{
                          background: isSelected ? `${part.color}10` : "transparent",
                          border: isSelected ? `1px solid ${part.color}30` : "1px solid transparent",
                        }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: part.color, boxShadow: isSelected ? `0 0 6px ${part.color}40` : "none" }}
                        />
                        <span style={{ color: isSelected ? part.color : "var(--color-text-primary)" }}>
                          {part.name}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] text-[var(--color-text-tertiary)] ml-auto">addressing</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Clinical Indicators */}
            <VectorDashboard vectors={vectors} triggeredBreakthroughs={triggeredBreakthroughs} />

            {/* Probe Analysis (after breakthrough) */}
            <SessionFeedback triggeredBreakthroughs={triggeredBreakthroughs} messageCount={messages.length} />

            {/* Interpretability Scenarios */}
            <ModalitySelector
              selectedModality={selectedScenario}
              onSelectModality={setSelectedScenario}
            />
          </div>
        </aside>

        {/* Center: Graph */}
        <div className="flex-1 relative min-w-0">
          <TherapyGraph
            graphData={graphData}
            onNodeClick={handleNodeClick}
            selectedPart={selectedPart}
            speechBubbles={speechBubbles}
            breakthrough={breakthrough}
            onDismissBreakthrough={dismissBreakthrough}
          />

          {/* Warmth indicator — centered above input */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10">
            <WarmthIndicator warmth={warmth} />
          </div>

          {/* Input bar */}
          <div className="absolute bottom-0 inset-x-0 z-20">
            <div className="flex gap-3 p-3 items-center bg-[var(--color-bg-sidebar)]/90 backdrop-blur-xl border-t border-[var(--glass-border)]">
              {isSupported && (
                <button
                  onClick={toggleListening}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all shrink-0 relative"
                  style={{
                    background: isListening ? "rgba(212, 168, 83, 0.15)" : "rgba(255,255,255,0.04)",
                    border: isListening ? "1px solid var(--color-border-accent)" : "1px solid var(--color-border)",
                  }}
                  aria-label={isListening ? "Stop listening" : "Start voice input"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isListening ? "var(--color-accent)" : "var(--color-text-tertiary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  {isListening && (
                    <span className="absolute inset-0 rounded-lg bg-[var(--color-accent)] animate-ping opacity-15" />
                  )}
                </button>
              )}
              <div className="flex-1">
                <BottomBarInput
                  onSend={sendMessage}
                  placeholder={getPlaceholder()}
                  disabled={isProcessing}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Transcript — always visible, never cleared */}
        <aside className="sidebar-right w-[340px] shrink-0 flex flex-col min-h-0">
          <SessionTranscript
            messages={messages}
            isProcessing={isProcessing}
            activeAgent={activeAgentName}
          />
        </aside>
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
