"use client";

import { ScenarioInfo } from "@/lib/types";

interface Props {
  scenario: ScenarioInfo | null;
}

export default function Header({ scenario }: Props) {
  return (
    <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
      <span className="text-sm font-serif tracking-wide text-[var(--color-text-primary)]/60">
        AgentTherapy
      </span>
      {scenario && (
        <span className="pill bg-[var(--color-accent-muted)] text-[var(--color-accent)]">
          {scenario.title}
        </span>
      )}
    </div>
  );
}
