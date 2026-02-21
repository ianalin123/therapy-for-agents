"use client";

import { AgentStatus } from "@/lib/types";

interface Props {
  agents: AgentStatus[];
}

export default function AgentStatusBar({ agents }: Props) {
  if (agents.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-1">
      {agents.map((a) => (
        <div
          key={a.agent}
          className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-lg bg-[var(--glass-bg-heavy)] text-[var(--color-text-secondary)]"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
          {a.agent}
        </div>
      ))}
    </div>
  );
}
