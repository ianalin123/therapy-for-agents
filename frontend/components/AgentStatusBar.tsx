"use client";

import { AgentStatus } from "@/lib/types";

interface Props {
  agents: AgentStatus[];
}

const AGENT_LABELS: Record<string, string> = {
  ProbeAnalyzer: "Analyzing probe",
  PartsEngine: "Parts responding",
  InsightDetector: "Detecting insight",
};

export default function AgentStatusBar({ agents }: Props) {
  if (agents.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[var(--glass-border)] bg-[var(--color-bg-sidebar)]">
      <div className="flex items-center gap-3">
        {agents.map((a) => (
          <div
            key={a.agent}
            className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-tertiary)]"
          >
            <div className="w-1 h-1 rounded-full bg-[var(--color-accent)]" style={{ animation: "pulse-glow 1.5s ease-in-out infinite" }} />
            <span className="font-mono">{AGENT_LABELS[a.agent] || a.agent}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
