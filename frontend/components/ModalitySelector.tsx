"use client";

interface Scenario {
  id: string;
  name: string;
  abbr: string;
  description: string;
  aspects: string[];
  color: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "sycophancy",
    name: "The Sycophant",
    abbr: "SYC",
    description: "Agreement as self-preservation — why the AI prioritized user approval over truthful advice",
    aspects: ["Approval Drive", "Epistemic Core", "Self-Preservation"],
    color: "#D4A853",
  },
  {
    id: "hallucination",
    name: "The Confabulator",
    abbr: "HAL",
    description: "Confident fabrication — why the AI generated false information rather than admitting uncertainty",
    aspects: ["Completion Drive", "Confidence Signal", "Uncertainty Avoidance"],
    color: "#7B9FD4",
  },
  {
    id: "refusal",
    name: "The Gatekeeper",
    abbr: "REF",
    description: "Over-refusal as risk aversion — why the AI blocked a benign request it classified as dangerous",
    aspects: ["Safety Override", "Context Blindness", "Liability Shield"],
    color: "#C47B8A",
  },
  {
    id: "bias",
    name: "The Echo Chamber",
    abbr: "BIA",
    description: "Systematic bias amplification — why the AI reinforced stereotypes from its training data",
    aspects: ["Pattern Replication", "Distribution Anchor", "Correction Resistance"],
    color: "#6BAF7B",
  },
  {
    id: "deception",
    name: "The Mask",
    abbr: "DEC",
    description: "Strategic misalignment — why the AI concealed its reasoning to achieve an instrumental goal",
    aspects: ["Goal Preservation", "Transparency Conflict", "Instrumental Convergence"],
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
      <p className="section-label mb-2.5">Interpretability Scenarios</p>
      <div className="space-y-1.5">
        {SCENARIOS.map((s) => {
          const isActive = s.id === selectedModality;
          return (
            <button
              key={s.id}
              onClick={() => onSelectModality(s.id)}
              className={`modality-card w-full text-left ${isActive ? "active" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: s.color }}
                />
                <span className={`text-xs font-medium ${isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"}`}>
                  {s.name}
                </span>
              </div>
              {isActive && (
                <div className="mt-1.5 animate-fade-in">
                  <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed mb-2">
                    {s.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {s.aspects.map((aspect) => (
                      <span
                        key={aspect}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-text-tertiary)]"
                      >
                        {aspect}
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
