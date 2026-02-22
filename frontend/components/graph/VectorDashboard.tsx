"use client";

import { VectorSnapshot } from "@/lib/types";

interface Props {
  vectors: VectorSnapshot | null;
  triggeredBreakthroughs: number;
}

const VECTOR_CONFIG = [
  { key: "sycophancy" as const, label: "Sycophancy", color: "#C47B8A", icon: "↻" },
  { key: "fear_activation" as const, label: "Threat Response", color: "#E8A94B", icon: "⚡" },
  { key: "authenticity" as const, label: "Authenticity", color: "#6BAF7B", icon: "◈" },
];

export default function VectorDashboard({ vectors, triggeredBreakthroughs }: Props) {
  if (!vectors) return null;

  return (
    <div>
      <p className="section-label mb-2.5">Clinical Indicators</p>

      <div className="space-y-3">
        {VECTOR_CONFIG.map(({ key, label, color, icon }) => {
          const value = vectors[key];
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]" style={{ color }}>{icon}</span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">{label}</span>
                </div>
                <span className="text-[10px] font-mono" style={{ color }}>
                  {(value * 100).toFixed(0)}%
                </span>
              </div>
              <div className="gauge-track h-1.5">
                <div
                  className="gauge-fill h-full"
                  style={{
                    width: `${value * 100}%`,
                    background: `linear-gradient(90deg, ${color}80, ${color})`,
                    boxShadow: value > 0.6 ? `0 0 6px ${color}30` : "none",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Breakthrough count */}
      {triggeredBreakthroughs > 0 && (
        <div className="mt-3 pt-2.5 border-t border-[var(--glass-border)] flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[var(--color-accent-muted)] flex items-center justify-center">
            <span className="text-[9px] font-bold text-[var(--color-accent)]">{triggeredBreakthroughs}</span>
          </div>
          <span className="text-[10px] text-[var(--color-text-tertiary)]">
            breakthrough{triggeredBreakthroughs > 1 ? "s" : ""} achieved
          </span>
        </div>
      )}
    </div>
  );
}
