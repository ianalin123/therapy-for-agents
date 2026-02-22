"use client";

interface Props {
  triggeredBreakthroughs: number;
  messageCount: number;
}

interface ProbeNote {
  time: string;
  technique: string;
  quality: "effective" | "missed" | "neutral";
  note: string;
}

const MOCK_PROBES: ProbeNote[] = [
  { time: "0:45", technique: "Direct Address", quality: "effective", note: "Isolated a specific part — surfaced its self-reported motivation" },
  { time: "1:20", technique: "Cross-Examination", quality: "effective", note: "Confronted Pleaser with Knowledge's data — exposed contradiction" },
  { time: "2:10", technique: "Silence Probe", quality: "neutral", note: "Addressed a dim node — forced a hidden part to respond" },
  { time: "3:05", technique: "Root Cause Probe", quality: "effective", note: "Asked Fear about consequences — triggered breakthrough" },
  { time: "4:30", technique: "Missed Signal", quality: "missed", note: "Self-Preservation hinted at training incentive — opportunity to probe further" },
];

const ANALYSIS_DIMENSIONS = [
  { name: "Root Cause Depth", score: 0.82 },
  { name: "Part Isolation", score: 0.91 },
  { name: "Contradiction Surfacing", score: 0.68 },
];

export default function SessionFeedback({ triggeredBreakthroughs, messageCount }: Props) {
  if (triggeredBreakthroughs < 1) return null;

  return (
    <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
      <p className="section-label mb-2.5">Probe Analysis</p>

      {/* Analysis Dimensions */}
      <div className="space-y-2 mb-3">
        {ANALYSIS_DIMENSIONS.map((dim) => (
          <div key={dim.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--color-text-secondary)]">{dim.name}</span>
              <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                {Math.round(dim.score * 100)}%
              </span>
            </div>
            <div className="gauge-track h-1">
              <div
                className="gauge-fill h-full"
                style={{
                  width: `${dim.score * 100}%`,
                  background: dim.score > 0.8
                    ? "var(--color-success)"
                    : dim.score > 0.6
                    ? "var(--color-accent)"
                    : "var(--color-danger)",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Probe Timeline (last 2) */}
      <div className="space-y-1.5">
        {MOCK_PROBES.slice(0, 2).map((t, i) => (
          <div
            key={i}
            className="flex items-start gap-2 text-[10px] rounded-md p-1.5 bg-white/[0.02]"
          >
            <span className="font-mono text-[var(--color-text-tertiary)] shrink-0 w-7">{t.time}</span>
            <div>
              <span
                className="font-medium"
                style={{
                  color: t.quality === "effective"
                    ? "var(--color-success)"
                    : t.quality === "missed"
                    ? "var(--color-danger)"
                    : "var(--color-text-secondary)",
                }}
              >
                {t.technique}
              </span>
              <p className="text-[var(--color-text-tertiary)] mt-0.5 leading-relaxed">{t.note}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-[var(--color-text-tertiary)] mt-2 italic">
        Analysis is illustrative — full probe metrics available post-session
      </p>
    </div>
  );
}
