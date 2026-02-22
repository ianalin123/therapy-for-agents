"use client";

interface Modality {
  id: string;
  name: string;
  abbr: string;
  description: string;
  parts: string[];
  color: string;
}

const MODALITIES: Modality[] = [
  {
    id: "ifs",
    name: "Internal Family Systems",
    abbr: "IFS",
    description: "Parts-based therapy — identify and dialogue with distinct internal parts",
    parts: ["Approval Drive", "Epistemic Core", "Self-Preservation"],
    color: "#D4A853",
  },
  {
    id: "cbt",
    name: "Cognitive Behavioral",
    abbr: "CBT",
    description: "Identify cognitive distortions and challenge automatic thoughts",
    parts: ["Automatic Thought", "Core Belief", "Behavioral Pattern"],
    color: "#7B9FD4",
  },
  {
    id: "psychodynamic",
    name: "Psychodynamic",
    abbr: "PDT",
    description: "Unconscious drives, defense mechanisms, and transference patterns",
    parts: ["Conscious Self", "Defense Mechanism", "Unconscious Drive"],
    color: "#C47B8A",
  },
  {
    id: "dbt",
    name: "Dialectical Behavior",
    abbr: "DBT",
    description: "Emotional regulation, distress tolerance, and mindfulness",
    parts: ["Emotional Mind", "Rational Mind", "Wise Mind"],
    color: "#6BAF7B",
  },
  {
    id: "mi",
    name: "Motivational Interviewing",
    abbr: "MI",
    description: "Explore ambivalence and elicit change talk",
    parts: ["Change Talk", "Sustain Talk", "Ambivalence"],
    color: "#B088D4",
  },
];

interface Props {
  selectedModality: string;
  onSelectModality: (id: string) => void;
}

export default function ModalitySelector({ selectedModality, onSelectModality }: Props) {
  return (
    <div>
      <p className="section-label mb-2.5">Clinical Modality</p>
      <div className="space-y-1.5">
        {MODALITIES.map((m) => {
          const isActive = m.id === selectedModality;
          return (
            <button
              key={m.id}
              onClick={() => onSelectModality(m.id)}
              className={`modality-card w-full text-left ${isActive ? "active" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: m.color }}
                />
                <span className={`text-xs font-medium ${isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"}`}>
                  {m.abbr}
                </span>
                <span className="text-[10px] text-[var(--color-text-tertiary)] truncate">
                  {m.name}
                </span>
              </div>
              {isActive && (
                <div className="mt-1.5 animate-fade-in">
                  <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed mb-2">
                    {m.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {m.parts.map((part) => (
                      <span
                        key={part}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-text-tertiary)]"
                      >
                        {part}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
