"use client";

import { useEffect, useRef } from "react";
import type { CorrectionEvent } from "@/lib/types";

interface CorrectionCardProps {
  correction: CorrectionEvent | null;
  onDismiss: () => void;
}

export function CorrectionCard({ correction, onDismiss }: CorrectionCardProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!correction) return;
    timeoutRef.current = setTimeout(onDismiss, 8000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [correction, onDismiss]);

  if (!correction) return null;

  const fieldChanges = correction.fieldChanges?.filter(
    (c) => c.field !== "id" && c.field !== "type"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onDismiss}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label="Understanding updated"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="relative w-[380px] max-h-[70vh] overflow-y-auto rounded-2xl border border-amber-500/20 bg-[rgba(20,20,24,0.95)] p-4 shadow-xl backdrop-blur-xl animate-correction-in"
      >
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-2 text-[#A09A92] hover:text-[#F0EDE8] transition-colors"
          aria-label="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <h3 className="text-sm font-medium text-[#E8A94B] drop-shadow-[0_0_8px_rgba(232,169,75,0.4)] pr-6">
          Understanding Updated
        </h3>

        {/* Before / After section */}
        <p className="mt-2 text-sm text-[#A09A92] line-through">
          {correction.beforeClaim}
        </p>
        <div className="my-2 flex items-center gap-2">
          <div className="h-px flex-1 bg-amber-500/20" />
          <span className="text-amber-500/60 text-xs">&darr;</span>
          <div className="h-px flex-1 bg-amber-500/20" />
        </div>
        <p className="text-sm text-[#F0EDE8] border-l-2 border-[#E8A94B]/50 pl-3">
          {correction.afterInsight}
        </p>

        {/* Field-level diffs */}
        {fieldChanges && fieldChanges.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-medium text-[#A09A92] uppercase tracking-wider">
              Graph Changes
            </p>
            {fieldChanges.map((change, i) => (
              <div
                key={`${change.nodeId}-${change.field}-${i}`}
                className="rounded-lg bg-white/5 px-3 py-2 text-xs"
              >
                <span className="text-[#A09A92]">{change.nodeId}</span>
                <span className="text-[#A09A92] mx-1">&middot;</span>
                <span className="text-[#7B9FD4]">{change.field}</span>
                {change.oldValue != null && (
                  <span className="ml-2 text-red-400/80 line-through">
                    {String(change.oldValue).slice(0, 60)}
                  </span>
                )}
                <span className="ml-2 text-emerald-400/80">
                  {String(change.newValue).slice(0, 80)}
                </span>
              </div>
            ))}
          </div>
        )}

        {correction.learnerReflection && (
          <p className="mt-2 text-xs italic text-[#A09A92]">
            {correction.learnerReflection}
          </p>
        )}
        {correction.newMemoryUnlocked && (
          <span className="mt-2 inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-[#E8A94B]">
            New memory unlocked
          </span>
        )}
      </div>
    </div>
  );
}
