"use client";

import { useState } from "react";

interface Props {
  onSend: (message: string) => void;
  placeholder?: string;
}

export default function BottomBarInput({
  onSend,
  placeholder = "Ask any part a question...",
}: Props) {
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        placeholder={placeholder}
        className="flex-1 rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-colors bg-[var(--color-bg-elevated)]/60 border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/50"
      />
      <button
        onClick={send}
        className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:brightness-110"
      >
        Send
      </button>
    </div>
  );
}
