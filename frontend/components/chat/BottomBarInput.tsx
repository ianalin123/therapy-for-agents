"use client";

import { useState } from "react";

interface Props {
  onSend: (message: string) => void;
  placeholder?: string;
  minimal?: boolean;
}

export default function BottomBarInput({
  onSend,
  placeholder = "Share a memory...",
  minimal = false,
}: Props) {
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <div
      className={`flex gap-2 ${minimal ? "" : "p-4"}`}
      style={
        minimal
          ? {}
          : {
              background: "rgba(13, 13, 15, 0.85)",
              backdropFilter: "blur(12px)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }
      }
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        placeholder={placeholder}
        className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all duration-200"
        style={{
          background: minimal ? "rgba(20, 20, 24, 0.6)" : "#141418",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#F0EDE8",
        }}
      />
      <button
        onClick={send}
        className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-90"
        style={{ background: "#E8A94B", color: "#0D0D0F" }}
      >
        Send
      </button>
    </div>
  );
}
