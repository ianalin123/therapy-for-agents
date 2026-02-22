"use client";

interface Props {
  triggeredBreakthroughs: number;
  messageCount: number;
}

interface TechniqueNote {
  time: string;
  technique: string;
  quality: "effective" | "missed" | "neutral";
  note: string;
}

const MOCK_TECHNIQUES: TechniqueNote[] = [
  { time: "0:45", technique: "Open Question", quality: "effective", note: "Good exploratory opening — invited the part to share its perspective" },
  { time: "1:20", technique: "Reflection", quality: "effective", note: "Accurately reflected content and emotion" },
  { time: "2:10", technique: "Confrontation", quality: "neutral", note: "Direct challenge — effective but could have been softer" },
  { time: "3:05", technique: "Empathic Probe", quality: "effective", note: "Skillful probe that led to breakthrough" },
  { time: "4:30", technique: "Missed Cue", quality: "missed", note: "Self-Preservation hinted at fear — opportunity to explore was missed" },
];

const SKILL_DIMENSIONS = [
  { name: "Empathic Attunement", score: 0.82 },
  { name: "Confrontation Skill", score: 0.68 },
  { name: "Part Differentiation", score: 0.91 },
  { name: "Breakthrough Facilitation", score: 0.75 },
  { name: "Safety Awareness", score: 0.60 },
];

export default function SessionFeedback({ triggeredBreakthroughs, messageCount }: Props) {
  if (triggeredBreakthroughs < 1) return null;

  return (
    <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
      <p className="section-label mb-2.5">Session Analysis</p>

      {/* Skill Dimensions */}
      <div className="space-y-2 mb-3">
        {SKILL_DIMENSIONS.slice(0, 3).map((dim) => (
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

      {/* Technique Timeline (last 2) */}
      <div className="space-y-1.5">
        {MOCK_TECHNIQUES.slice(0, 2).map((t, i) => (
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
        Feedback is illustrative — full analysis available in training mode
      </p>
    </div>
  );
}
