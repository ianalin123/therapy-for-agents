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
    timeoutRef.current = setTimeout(onDismiss, 6000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [correction, onDismiss]);

  if (!correction) return null;

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
        className="relative w-[340px] rounded-2xl border border-amber-500/20 bg-[rgba(20,20,24,0.95)] p-4 shadow-xl backdrop-blur-xl animate-correction-in"
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
        <p className="mt-2 text-sm text-[#A09A92] line-through">
          {correction.beforeClaim}
        </p>
        <div className="my-2 flex items-center gap-2">
          <div className="h-px flex-1 bg-amber-500/20" />
          <span className="text-amber-500/60 text-xs">↓</span>
          <div className="h-px flex-1 bg-amber-500/20" />
        </div>
        <p className="text-sm text-[#F0EDE8] border-l-2 border-[#E8A94B]/50 pl-3">
          {correction.afterInsight}
        </p>
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
