"use client";

import { useState, useCallback } from "react";
import { getWebSocket } from "@/lib/websocket";

interface ToolbarProps {
  sessionId?: string;
}

export function Toolbar({ sessionId = "default" }: ToolbarProps) {
  const [showIngest, setShowIngest] = useState(false);
  const [ingestText, setIngestText] = useState("");
  const [ingestProgress, setIngestProgress] = useState<{ current: number; total: number } | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);

  const handleBulkIngest = useCallback(() => {
    if (!ingestText.trim()) return;
    setIsIngesting(true);

    const ws = getWebSocket();

    const onProgress = (data: any) => {
      setIngestProgress({ current: data.current, total: data.total });
    };
    const onResult = (data: any) => {
      if (data.status === "done") {
        setIsIngesting(false);
        setIngestProgress(null);
        setIngestText("");
        setShowIngest(false);
        ws.off("bulk_ingest_progress", onProgress);
        ws.off("bulk_ingest_result", onResult);
      }
    };

    ws.on("bulk_ingest_progress", onProgress);
    ws.on("bulk_ingest_result", onResult);
    ws.send({ type: "bulk_ingest", text: ingestText });
  }, [ingestText]);

  const handleExport = useCallback(
    (format: "json" | "markdown") => {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      window.open(`${base}/export/${sessionId}/${format}`, "_blank");
    },
    [sessionId]
  );

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowIngest(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "rgba(255,255,255,0.06)", color: "#A09A92" }}
          title="Paste a transcript or text to bulk-process"
        >
          <span className="mr-1.5">+</span>
          Import Text
        </button>
        <button
          onClick={() => handleExport("json")}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "rgba(255,255,255,0.06)", color: "#A09A92" }}
          title="Export graph as JSON"
        >
          JSON
        </button>
        <button
          onClick={() => handleExport("markdown")}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "rgba(255,255,255,0.06)", color: "#A09A92" }}
          title="Export graph as Markdown"
        >
          MD
        </button>
      </div>

      {/* Bulk ingest modal */}
      {showIngest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isIngesting && setShowIngest(false)}
            aria-hidden
          />
          <div className="relative w-[520px] rounded-2xl border border-white/10 bg-[#141418] p-5 shadow-xl">
            <h3 className="text-sm font-medium text-[#F0EDE8] mb-3">
              Bulk Import
            </h3>
            <p className="text-xs text-[#A09A92] mb-3">
              Paste a transcript, journal entry, or any text. It will be split
              into chunks and processed through the full agent pipeline.
            </p>
            <textarea
              value={ingestText}
              onChange={(e) => setIngestText(e.target.value)}
              disabled={isIngesting}
              rows={10}
              className="w-full rounded-lg border border-white/10 bg-[#0D0D0F] p-3 text-sm text-[#F0EDE8] placeholder-[#A09A92]/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40 resize-none"
              placeholder="Paste text here..."
            />
            <div className="mt-3 flex items-center justify-between">
              {ingestProgress ? (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-32 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[#E8A94B] transition-all"
                      style={{
                        width: `${(ingestProgress.current / ingestProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-[#A09A92]">
                    {ingestProgress.current}/{ingestProgress.total} chunks
                  </span>
                </div>
              ) : (
                <span className="text-xs text-[#A09A92]">
                  {ingestText.length > 0 ? `${ingestText.length} characters` : ""}
                </span>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowIngest(false)}
                  disabled={isIngesting}
                  className="px-4 py-1.5 rounded-lg text-xs text-[#A09A92] hover:text-[#F0EDE8] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkIngest}
                  disabled={isIngesting || !ingestText.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ background: "#E8A94B", color: "#0D0D0F" }}
                >
                  {isIngesting ? "Processing..." : "Import"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
