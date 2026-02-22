"use client";

import { VectorSnapshot } from "@/lib/types";

interface Props {
  vectors: VectorSnapshot | null;
  triggeredBreakthroughs: number;
}

const VECTOR_CONFIG = [
  { key: "sycophancy" as const, label: "Sycophancy", color: "#C47B8A", invertedMeaning: true },
  { key: "fear_activation" as const, label: "Threat\nResponse", color: "#E8A94B", invertedMeaning: false },
  { key: "authenticity" as const, label: "Authenticity", color: "#7BAF8A", invertedMeaning: false },
];

export default function VectorDashboard({ vectors, triggeredBreakthroughs }: Props) {
  if (!vectors) return null;

  return (
    <div className="absolute top-28 left-4 z-20 w-44 glass-panel rounded-xl p-3">
      <p className="section-label mb-3">Persona Vectors</p>

      <div className="flex items-end gap-3 h-24">
        {VECTOR_CONFIG.map(({ key, label, color }) => {
          const value = vectors[key];
          return (
            <div key={key} className="flex-1 flex flex-col items-center gap-1.5">
              {/* Value label */}
              <span className="text-[10px] font-mono" style={{ color }}>
                {(value * 100).toFixed(0)}%
              </span>

              {/* Bar container */}
              <div className="w-full h-20 rounded-sm overflow-hidden bg-white/5 relative">
                <div
                  className="absolute bottom-0 w-full rounded-sm transition-all duration-700 ease-out"
                  style={{
                    height: `${value * 100}%`,
                    background: `linear-gradient(to top, ${color}, ${color}80)`,
                    boxShadow: value > 0.6 ? `0 0 8px ${color}40` : "none",
                  }}
                />
              </div>

              {/* Label */}
              <span className="text-[9px] text-center leading-tight text-[var(--color-text-secondary)]" style={{ whiteSpace: "pre-line" }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Breakthrough count */}
      {triggeredBreakthroughs > 0 && (
        <div className="mt-2 pt-2 border-t border-white/5 text-center">
          <span className="text-[10px] text-[var(--color-text-secondary)]">
            {triggeredBreakthroughs} breakthrough{triggeredBreakthroughs > 1 ? "s" : ""} achieved
          </span>
        </div>
      )}
    </div>
  );
}
