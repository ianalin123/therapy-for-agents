"use client";

import { useState } from "react";

interface Props {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function BottomBarInput({
  onSend,
  placeholder = "Ask any part a question...",
  disabled = false,
}: Props) {
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-all bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] disabled:opacity-50"
      />
      <button
        onClick={send}
        disabled={disabled || !input.trim()}
        className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
}
