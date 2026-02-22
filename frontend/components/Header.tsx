"use client";

import { ScenarioInfo } from "@/lib/types";
import { useState } from "react";

interface Props {
  scenario: ScenarioInfo | null;
  currentModality?: string;
  sessionStarted?: boolean;
  messageCount?: number;
}

export default function Header({ scenario, currentModality, sessionStarted, messageCount = 0 }: Props) {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <header className="h-12 flex items-center justify-between px-5 border-b border-[var(--glass-border)] bg-[var(--color-bg-sidebar)] relative z-30">
        {/* Left: Logo + Scenario */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[var(--color-accent)] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10" />
                <path d="M12 12l6-6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
              AgentTherapy
            </span>
          </div>

          {scenario && (
            <>
              <div className="w-px h-5 bg-[var(--color-border)]" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--color-text-secondary)] font-medium">
                  {scenario.title}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right: Session info + About */}
        <div className="flex items-center gap-3">
          {sessionStarted && (
            <span className="text-xs font-mono text-[var(--color-text-tertiary)]">
              {messageCount} exchange{messageCount !== 1 ? "s" : ""}
            </span>
          )}

          <button
            onClick={() => setShowAbout(true)}
            className="text-xs px-3 py-1.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-colors"
          >
            About
          </button>
        </div>
      </header>

      {/* About Modal — Interpretability framing */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAbout(false)} />
          <div className="relative max-w-lg w-full mx-4 rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg-surface)] p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-muted)] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-serif font-semibold text-[var(--color-text-primary)]">
                  AI Interpretability Through Therapy
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Put AI on the couch — understand why agents fail
                </p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-[var(--color-text-secondary)] leading-relaxed">
              <p>
                AgentTherapy uses therapeutic frameworks as an interpretability layer for AI behavior. Instead of treating failure modes like sycophancy, hallucination, and bias as bugs to patch, we model them as emergent behaviors driven by competing internal motivations.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "◈", title: "Parts-Based Model", desc: "Decompose AI behavior into distinct internal drives that interact and conflict" },
                  { icon: "⚡", title: "Live Probing", desc: "Dialogue with individual parts to surface hidden motivational structures" },
                  { icon: "↻", title: "Breakthrough Detection", desc: "Identify moments where root causes are revealed and the graph transforms" },
                  { icon: "◉", title: "Behavioral Vectors", desc: "Track sycophancy, threat response, and authenticity in real time" },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg p-3 bg-[var(--color-bg-primary)]">
                    <div className="text-base mb-1 text-[var(--color-accent)]">{item.icon}</div>
                    <div className="text-xs font-medium text-[var(--color-text-primary)] mb-0.5">{item.title}</div>
                    <div className="text-[11px] text-[var(--color-text-tertiary)]">{item.desc}</div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-[var(--color-text-tertiary)] border-t border-[var(--glass-border)] pt-3">
                Each scenario exposes a different failure mode — sycophancy, hallucination, over-refusal, bias, deception — revealing the hidden motivational structures that standard evaluation misses.
              </p>
            </div>

            <button
              onClick={() => setShowAbout(false)}
              className="mt-5 w-full py-2.5 rounded-lg text-sm font-medium transition-colors text-[var(--color-accent)] border border-[var(--color-border-accent)] hover:bg-[var(--color-accent-muted)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
