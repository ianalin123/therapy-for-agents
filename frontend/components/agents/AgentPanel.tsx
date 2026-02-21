"use client";

import { useState, useEffect } from "react";
import type { AgentName, AgentStatus } from "@/lib/types";
import { AGENT_COLORS } from "@/lib/types";

const AGENT_ORDER: AgentName[] = ["listener", "learner", "reflector", "guardian"];

interface AgentPanelProps {
  statuses: Record<AgentName, AgentStatus>;
}

export function AgentPanel({ statuses }: AgentPanelProps) {
  const allIdle = AGENT_ORDER.every((a) => statuses[a]?.status === "idle");
  const allDone = AGENT_ORDER.every((a) => statuses[a]?.status === "done");
  const anyActive = AGENT_ORDER.some(
    (a) => statuses[a]?.status === "running" || statuses[a]?.status === "done"
  );

  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (allIdle) {
      setShowPanel(false);
      return;
    }
    if (anyActive) setShowPanel(true);
    if (allDone) {
      const t = setTimeout(() => setShowPanel(false), 4000);
      return () => clearTimeout(t);
    }
  }, [allIdle, allDone, anyActive]);

  return (
    <>
      <style>{`
        @keyframes agent-spin { to { transform: rotate(360deg); } }
      `}</style>
      <div
        className="fixed top-4 right-4 z-50 transition-opacity duration-500 ease-out"
        style={{
          width: 280,
          opacity: showPanel ? 1 : 0,
          pointerEvents: showPanel ? "auto" : "none",
          background: "rgba(13, 13, 15, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16,
          padding: 12,
        }}
      >
        {AGENT_ORDER.map((name) => {
          const s = statuses[name];
          const status = s?.status ?? "idle";
          const color = AGENT_COLORS[name];
          const dim = status === "idle";

          return (
            <div
              key={name}
              className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
              style={{ opacity: dim ? 0.5 : 1 }}
            >
              <div
                className="shrink-0 w-2 h-2 rounded-full"
                style={{ background: color }}
              />
              <span
                className="text-xs capitalize shrink-0"
                style={{ color: "#A09A92", width: 72 }}
              >
                {name}
              </span>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {status === "running" && (
                  <div
                    className="shrink-0 w-3 h-3 rounded-full"
                    style={{
                      border: `2px solid ${color}`,
                      borderTopColor: "transparent",
                      animation: "agent-spin 0.8s linear infinite",
                    }}
                  />
                )}
                {status === "done" && (
                  <>
                    <span className="text-[#7BAF8A]">✓</span>
                    {s?.summary && (
                      <span
                        className="truncate text-xs"
                        style={{ color: "#F0EDE8" }}
                      >
                        {s.summary}
                      </span>
                    )}
                    {s?.durationMs != null && (
                      <span
                        className="shrink-0 text-xs"
                        style={{ color: "#A09A92" }}
                      >
                        {(s.durationMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
