"use client";

import { useEffect } from "react";
import ChatPanel from "@/components/chat/ChatPanel";
import MemoryGraph from "@/components/graph/MemoryGraph";
import { getWebSocket } from "@/lib/websocket";

export default function Home() {
  useEffect(() => {
    const ws = getWebSocket();
    ws.connect();
    return () => ws.disconnect();
  }, []);

  const handleNodeQuery = (nodeId: string, question: string) => {
    const ws = getWebSocket();
    ws.send({
      type: "node_query",
      nodeId,
      question,
    });
  };

  return (
    <main className="h-screen flex" style={{ background: "#0D0D0F" }}>
      {/* Left panel: Voice + Chat */}
      <div className="w-[420px] flex-shrink-0 flex flex-col" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
        <ChatPanel />
      </div>

      {/* Right panel: Live Knowledge Graph */}
      <div className="flex-1 p-4">
        <MemoryGraph onNodeQuery={handleNodeQuery} />
      </div>
    </main>
  );
}
