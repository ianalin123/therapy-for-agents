"use client";

import { WarmthSignal } from "@/lib/types";

interface Props {
  warmth: WarmthSignal | null;
}

export default function WarmthIndicator({ warmth }: Props) {
  if (!warmth || warmth.warmth < 0.2) return null;

  const intensity = warmth.warmth;
  const isHot = intensity > 0.6;
  const color = isHot ? "#FB923C" : "var(--color-accent)";

  return (
    <div className="pointer-events-none">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500"
        style={{
          background: "var(--glass-bg-heavy)",
          border: `1px solid ${isHot ? "rgba(251, 146, 60, 0.3)" : "var(--color-border-accent)"}`,
          boxShadow: `0 0 ${intensity * 16}px ${isHot ? "rgba(251, 146, 60, 0.15)" : "rgba(212, 168, 83, 0.1)"}`,
          opacity: Math.min(1, intensity * 1.5),
        }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color, animation: "pulse-glow 1.5s ease-in-out infinite" }}
        />
        <span className="text-[10px] font-medium" style={{ color }}>
          {intensity > 0.7 ? "Approaching breakthrough..." : "Getting warmer..."}
        </span>
      </div>
    </div>
  );
}
