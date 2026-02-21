"use client";

import { ScenarioInfo } from "@/lib/types";

interface Props {
  scenario: ScenarioInfo;
  isVoiceSupported: boolean;
  onBegin: () => void;
}

export default function CaseFileOverlay({ scenario, isVoiceSupported, onBegin }: Props) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 bg-[var(--color-bg-primary)]/70" />
      <div className="relative max-w-[480px] rounded-2xl p-6 border border-[var(--color-border)] bg-[var(--color-bg-surface)]">

        {/* Title block */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-8 rounded-full bg-[var(--color-accent)]" />
          <div>
            <h1 className="text-xl font-serif text-[var(--color-text-primary)]">
              {scenario.title}
            </h1>
            <p className="text-xs italic text-[var(--color-accent)]/80 mt-0.5">
              {scenario.tagline}
            </p>
          </div>
        </div>

        {/* Case description */}
        <div className="rounded-lg p-4 mb-5 bg-[var(--color-bg-primary)]">
          <p className="section-label mb-2">Case File</p>
          <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line">
            {scenario.caseDescription}
          </p>
        </div>

        {/* Parts present */}
        <div className="mb-5">
          <p className="section-label mb-2">Parts Present</p>
          <div className="flex gap-2">
            {Object.entries(scenario.parts).map(([id, part]) => (
              <span
                key={id}
                className="pill"
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

        <p className="text-xs text-[var(--color-text-secondary)] mb-5">
          Click a node in the graph to address a specific part, or ask a general question.
          {isVoiceSupported && " Voice input is available."}
        </p>

        <button
          onClick={onBegin}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:brightness-110"
        >
          Begin Session
        </button>
      </div>
    </div>
  );
}
