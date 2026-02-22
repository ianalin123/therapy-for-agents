"use client";

import { WarmthSignal } from "@/lib/types";

interface Props {
  warmth: WarmthSignal | null;
}

export default function WarmthIndicator({ warmth }: Props) {
  if (!warmth || warmth.warmth < 0.2) return null;

  const intensity = warmth.warmth;
  const glowColor = intensity > 0.6
    ? "rgba(251, 146, 60, 0.6)"  // orange for hot
    : "rgba(232, 169, 75, 0.3)"; // amber for warm

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500"
        style={{
          background: `rgba(20, 20, 24, 0.85)`,
          border: `1px solid ${glowColor}`,
          boxShadow: `0 0 ${intensity * 20}px ${glowColor}`,
          opacity: Math.min(1, intensity * 1.5),
        }}
      >
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: glowColor }}
        />
        <span className="text-[10px] font-medium" style={{ color: intensity > 0.6 ? "#FB923C" : "var(--color-accent)" }}>
          {intensity > 0.7 ? "Getting close..." : "Warming up..."}
        </span>
      </div>
    </div>
  );
}
