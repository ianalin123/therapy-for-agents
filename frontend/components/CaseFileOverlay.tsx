"use client";

import { ScenarioInfo } from "@/lib/types";

interface Props {
  scenario: ScenarioInfo;
  isVoiceSupported: boolean;
  onBegin: () => void;
}

export default function CaseFileOverlay({ scenario, isVoiceSupported, onBegin }: Props) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-[var(--color-bg-primary)]/80 backdrop-blur-sm" />
      <div className="relative max-w-[520px] w-full mx-4 rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg-surface)] overflow-hidden">

        {/* Top accent bar */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent" />

        <div className="p-6">
          {/* Case file stamp */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="section-label">Case File</span>
              <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                #{scenario.id.toUpperCase().replace(/_/g, "-")}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[var(--color-accent)]/60 border border-[var(--color-accent)]/20 rounded px-1.5 py-0.5">
              ACTIVE
            </span>
          </div>

          {/* Title block */}
          <div className="mb-5">
            <h1 className="text-2xl font-serif font-semibold text-[var(--color-text-primary)] mb-1">
              {scenario.title}
            </h1>
            <p className="text-sm italic text-[var(--color-accent)]/70 leading-relaxed">
              {scenario.tagline}
            </p>
          </div>

          {/* Case description */}
          <div className="rounded-lg p-4 mb-5 bg-[var(--color-bg-primary)] border border-[var(--glass-border)]">
            <p className="text-[13px] text-[var(--color-text-primary)]/90 leading-relaxed whitespace-pre-line">
              {scenario.caseDescription}
            </p>
          </div>

          {/* Parts present */}
          <div className="mb-5">
            <p className="section-label mb-2.5">Parts Present in Session</p>
            <div className="grid gap-2">
              {Object.entries(scenario.parts).map(([id, part]) => (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-lg p-2.5 bg-white/[0.02] border border-[var(--glass-border)]"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: part.color, boxShadow: `0 0 8px ${part.color}40` }}
                  />
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {part.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-[var(--color-text-tertiary)] mb-5 leading-relaxed">
            Click a node in the graph to address a specific part, or ask a general question to the room.
            {isVoiceSupported && " Voice input is available via the microphone button."}
          </p>

          <button
            onClick={onBegin}
            className="w-full py-3 rounded-lg text-sm font-semibold transition-all bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:brightness-110 hover:shadow-lg hover:shadow-[var(--color-accent)]/10"
          >
            Begin Session
          </button>
        </div>
      </div>
    </div>
  );
}
