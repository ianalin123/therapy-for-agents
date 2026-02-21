"use client";

import { GraphSnapshot } from "@/lib/types";

interface GraphTimelineProps {
  snapshots: GraphSnapshot[];
}

export function GraphTimeline({ snapshots }: GraphTimelineProps) {
  if (snapshots.length === 0) return null;

  const isScrollable = snapshots.length > 20;

  return (
    <div className="relative h-8 flex-shrink-0 overflow-x-auto overflow-y-hidden bg-transparent">
      <div
        className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
        style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
      />
      <div
        className="relative flex h-full items-center"
        style={{
          justifyContent: isScrollable ? "flex-start" : "space-between",
          minWidth: isScrollable ? snapshots.length * 20 : undefined,
          gap: isScrollable ? 8 : undefined,
        }}
      >
        {snapshots.map((snapshot, i) => {
          const prev = snapshots[i - 1];
          const nodeDelta = snapshot.nodeCount - (prev?.nodeCount ?? 0);
          const linkDelta = snapshot.linkCount - (prev?.linkCount ?? 0);
          return (
            <div
              key={i}
              className="group relative flex flex-1 min-w-0 justify-center"
              style={isScrollable ? { flex: "none", minWidth: 20 } : undefined}
            >
              <div
                className="relative z-10 rounded-full transition-colors"
                style={{
                  width: snapshot.wasCorrection ? 8 : 6,
                  height: snapshot.wasCorrection ? 8 : 6,
                  backgroundColor: snapshot.wasCorrection
                    ? "#E8A94B"
                    : "rgba(240, 237, 232, 0.3)",
                  boxShadow: snapshot.wasCorrection
                    ? "0 0 8px rgba(232, 169, 75, 0.5)"
                    : undefined,
                }}
              />
              <div
                className="pointer-events-none invisible absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded px-2 py-1 text-xs text-[#F0EDE8] group-hover:visible"
                style={{ backgroundColor: "#1C1C22" }}
              >
                {snapshot.wasCorrection
                  ? `Turn ${i + 1}: Correction`
                  : `Turn ${i + 1}: +${nodeDelta} nodes, +${linkDelta} links`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
