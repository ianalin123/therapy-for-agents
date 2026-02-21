"use client";

import { useState, useEffect } from "react";
import { GraphNode, NODE_COLORS } from "@/lib/types";
import { getWebSocket } from "@/lib/websocket";

interface Props {
  node: GraphNode;
  onClose: () => void;
  onQuery: (question: string) => void;
}

export default function NodeDetail({ node, onClose, onQuery }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ws = getWebSocket();
    const handler = (data: any) => {
      if (data.nodeId === node.id && data.answer) {
        setAnswer(data.answer);
        setLoading(false);
      }
    };
    ws.on("node_answer", handler);
    return () => ws.off("node_answer", handler);
  }, [node.id]);

  const handleQuery = () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    onQuery(question);
  };

  return (
    <div
      className="absolute bottom-4 right-4 w-80 rounded-2xl p-4 shadow-2xl border backdrop-blur-sm animate-in slide-in-from-right-2 duration-300"
      style={{
        background: "#141418",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shadow-lg"
            style={{
              backgroundColor: NODE_COLORS[node.type],
              boxShadow: `0 0 8px ${NODE_COLORS[node.type]}60`,
            }}
          />
          <h3 className="font-medium text-sm font-serif" style={{ color: "#F0EDE8" }}>
            {node.label}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-white/10 transition-colors"
          style={{ color: "#A09A92" }}
        >
          ✕
        </button>
      </div>

      <p className="text-xs mb-2 capitalize" style={{ color: "#A09A92" }}>{node.type}</p>

      {node.description && (
        <p className="text-sm mb-3" style={{ color: "#F0EDE8" }}>{node.description}</p>
      )}

      <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-xs mb-2" style={{ color: "#A09A92" }}>
          Ask about {node.label.toLowerCase()}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuery()}
            placeholder="What else connects to this?"
            className="flex-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none transition-colors"
            style={{
              background: "#1C1C22",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#F0EDE8",
            }}
          />
          <button
            onClick={handleQuery}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "#E8A94B",
              color: "#0D0D0F",
              opacity: loading ? 0.6 : 1,
            }}
          >
            Ask
          </button>
        </div>

        {loading && (
          <div className="mt-2 flex gap-1 justify-center">
            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#E8A94B", animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#E8A94B", animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#E8A94B", animationDelay: "300ms" }} />
          </div>
        )}

        {answer && (
          <p className="text-sm mt-2 p-3 rounded-lg" style={{ background: "#1C1C22", color: "#F0EDE8" }}>
            {answer}
          </p>
        )}
      </div>
    </div>
  );
}
