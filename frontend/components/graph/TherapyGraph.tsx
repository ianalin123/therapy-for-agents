"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  GraphData, GraphNode, GraphEdge, BreakthroughEvent,
  PartResponse, NODE_COLORS, EDGE_COLORS,
} from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface SpeechBubble {
  id: string;
  part: string;
  name: string;
  content: string;
  color: string;
  timestamp: number;
}

interface Props {
  graphData: GraphData;
  onNodeClick?: (nodeId: string) => void;
  selectedPart?: string | null;
  speechBubbles: SpeechBubble[];
  breakthrough: BreakthroughEvent | null;
  onDismissBreakthrough?: () => void;
}

export default function TherapyGraph({
  graphData,
  onNodeClick,
  selectedPart,
  speechBubbles,
  breakthrough,
  onDismissBreakthrough,
}: Props) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [bubblePositions, setBubblePositions] = useState<Record<string, { x: number; y: number }>>({});

  const nodeAddedAtRef = useRef<Map<string, number>>(new Map());
  const illuminatedEdgesRef = useRef<Set<string>>(new Set());
  const dissolvedEdgesRef = useRef<Set<string>>(new Set());
  const breakthroughTimestampRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Track new nodes for bloom animation
  useEffect(() => {
    const now = Date.now();
    for (const node of graphData.nodes) {
      if (!nodeAddedAtRef.current.has(node.id)) {
        nodeAddedAtRef.current.set(node.id, now);
      }
    }
  }, [graphData.nodes]);

  // Handle breakthrough graph effects
  useEffect(() => {
    if (!breakthrough) return;
    breakthroughTimestampRef.current = Date.now();

    for (const edge of breakthrough.graphDiff.illuminated_edges) {
      illuminatedEdgesRef.current.add(`${edge.source}-${edge.target}-${edge.type}`);
    }
    for (const edge of breakthrough.graphDiff.dissolved_edges) {
      dissolvedEdgesRef.current.add(`${edge.source}-${edge.target}-${edge.type}`);
    }
    for (const node of breakthrough.graphDiff.new_nodes) {
      nodeAddedAtRef.current.set(node.id, Date.now());
    }

    if (graphRef.current) {
      graphRef.current.d3ReheatSimulation();
    }
  }, [breakthrough]);

  // Update bubble positions from graph coordinates
  useEffect(() => {
    let animFrameId: number;

    const updatePositions = () => {
      if (graphRef.current) {
        const positions: Record<string, { x: number; y: number }> = {};
        for (const node of graphData.nodes) {
          const anyNode = node as any;
          if (anyNode.x != null && anyNode.y != null) {
            const screen = graphRef.current.graph2ScreenCoords(anyNode.x, anyNode.y);
            positions[node.id] = { x: screen.x, y: screen.y };
          }
        }
        setBubblePositions(positions);
      }
      animFrameId = requestAnimationFrame(updatePositions);
    };

    animFrameId = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(animFrameId);
  }, [graphData.nodes]);

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode & { x: number; y: number };
      if (n.x == null || n.y == null || !isFinite(n.x) || !isFinite(n.y)) return;
      const now = Date.now();

      const nodeColor = n.color || NODE_COLORS[n.type] || "#A09A92";
      const baseSize = n.size || 6;
      const isDim = n.visibility === "dim";
      const isSelected = selectedPart === n.id;

      // Bloom animation for new nodes
      const addedAt = nodeAddedAtRef.current.get(n.id);
      let bloomScale = 1;
      if (addedAt) {
        const elapsed = now - addedAt;
        if (elapsed < 600) {
          const t = elapsed / 600;
          bloomScale = t < 0.5 ? (t / 0.5) * 1.3 : 1.3 - 0.3 * ((t - 0.5) / 0.5);
        }
        if (elapsed < 1000) {
          const t = elapsed / 1000;
          const glowRadius = baseSize * (2 + t * 4);
          ctx.beginPath();
          ctx.arc(n.x, n.y, glowRadius, 0, 2 * Math.PI);
          ctx.strokeStyle = nodeColor + Math.round((1 - t) * 128).toString(16).padStart(2, "0");
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      const effectiveSize = baseSize * bloomScale;
      const alpha = isDim ? 0.35 : 1;

      // Outer glow
      const gradient = ctx.createRadialGradient(n.x, n.y, effectiveSize * 0.5, n.x, n.y, effectiveSize * 3);
      gradient.addColorStop(0, nodeColor + (isDim ? "15" : "40"));
      gradient.addColorStop(1, nodeColor + "00");
      ctx.beginPath();
      ctx.arc(n.x, n.y, effectiveSize * 3, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, effectiveSize + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = nodeColor + "90";
        ctx.lineWidth = 2;
        ctx.stroke();

        const pulseT = (now % 2000) / 2000;
        const pulseR = effectiveSize + 4 + pulseT * 8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseR, 0, 2 * Math.PI);
        ctx.strokeStyle = nodeColor + Math.round((1 - pulseT) * 80).toString(16).padStart(2, "0");
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Core node
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(n.x, n.y, effectiveSize, 0, 2 * Math.PI);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      // Inner highlight
      const innerGrad = ctx.createRadialGradient(
        n.x - effectiveSize * 0.3, n.y - effectiveSize * 0.3, 0,
        n.x, n.y, effectiveSize,
      );
      innerGrad.addColorStop(0, "rgba(255,255,255,0.3)");
      innerGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(n.x, n.y, effectiveSize, 0, 2 * Math.PI);
      ctx.fillStyle = innerGrad;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Label
      const fontSize = Math.max(12 / globalScale, 2.5);
      ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.globalAlpha = isDim ? 0.4 : 0.9;
      ctx.fillStyle = "#F0EDE8";
      ctx.fillText(n.label, n.x, n.y + effectiveSize + 4);
      ctx.globalAlpha = 1;
    },
    [selectedPart],
  );

  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const source = typeof link.source === "object" ? link.source : null;
      const target = typeof link.target === "object" ? link.target : null;
      if (!source || !target) return;
      if (!isFinite(source.x) || !isFinite(target.x)) return;

      const edgeKey = `${link.source?.id || link.source}-${link.target?.id || link.target}-${link.type}`;
      const isHidden = link.visibility === "hidden" && !illuminatedEdgesRef.current.has(edgeKey);
      const isIlluminated = illuminatedEdgesRef.current.has(edgeKey);
      const isDissolved = dissolvedEdgesRef.current.has(edgeKey);

      if (isHidden || isDissolved) return;

      const color = EDGE_COLORS[link.type] || "rgba(240, 237, 232, 0.15)";

      if (isIlluminated) {
        const now = Date.now();
        const elapsed = now - breakthroughTimestampRef.current;
        const pulseT = Math.min(elapsed / 2000, 1);
        const pulseAlpha = 0.3 + Math.sin(pulseT * Math.PI * 4) * 0.5;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = `rgba(232, 169, 75, ${pulseAlpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Edge label
      if (link.label) {
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const fontSize = Math.max(9 / globalScale, 2);
        ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isIlluminated ? "rgba(232, 169, 75, 0.8)" : "rgba(240, 237, 232, 0.3)";
        ctx.fillText(link.label, midX, midY);
      }
    },
    [],
  );

  const handleNodeClick = useCallback(
    (node: any) => {
      onNodeClick?.(node.id);
      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 600);
      }
    },
    [onNodeClick],
  );

  // Visible speech bubbles: last bubble per part, max 3 total, recent 15s
  const visibleBubbles = speechBubbles
    .filter((b) => Date.now() - b.timestamp < 15000)
    .reduce((acc, b) => {
      acc.set(b.part, b);
      return acc;
    }, new Map<string, SpeechBubble>());
  const bubbleList = Array.from(visibleBubbles.values()).slice(-3);

  return (
    <div ref={containerRef} className="relative h-full w-full" style={{ background: "#0D0D0F" }}>
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClick}
        backgroundColor="transparent"
        cooldownTicks={100}
        warmupTicks={30}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.25}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />

      {/* Speech bubbles positioned at node locations */}
      {bubbleList.map((bubble) => {
        const pos = bubblePositions[bubble.part];
        if (!pos) return null;
        const age = Date.now() - bubble.timestamp;
        const opacity = age > 12000 ? Math.max(0, 1 - (age - 12000) / 3000) : 1;

        return (
          <div
            key={bubble.id}
            className="absolute pointer-events-none animate-bubble-in"
            style={{
              left: pos.x,
              top: pos.y - 20,
              transform: "translate(-50%, -100%)",
              opacity,
              zIndex: 30,
            }}
          >
            <div
              className="max-w-[280px] rounded-xl px-3 py-2 text-sm shadow-lg backdrop-blur-sm"
              style={{
                background: "rgba(20, 20, 24, 0.92)",
                border: `1px solid ${bubble.color}40`,
                color: "#F0EDE8",
              }}
            >
              <span className="text-xs font-semibold block mb-0.5" style={{ color: bubble.color }}>
                {bubble.name}
              </span>
              {bubble.content}
            </div>
            {/* Speech bubble tail */}
            <div
              className="mx-auto w-0 h-0"
              style={{
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "6px solid rgba(20, 20, 24, 0.92)",
              }}
            />
          </div>
        );
      })}

      {/* Breakthrough ceremony overlay */}
      {breakthrough && (
        <div className="absolute inset-0 z-40 flex items-center justify-center animate-breakthrough-in">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onDismissBreakthrough} />
          <div
            className="relative max-w-[400px] rounded-2xl p-6 shadow-2xl border border-amber-500/30"
            style={{ background: "rgba(20, 20, 24, 0.96)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-500">
                Breakthrough
              </h3>
            </div>
            <h2 className="text-lg font-serif text-[#F0EDE8] mb-2">
              {breakthrough.name}
            </h2>
            <p className="text-sm text-[#A09A92] leading-relaxed">
              {breakthrough.insightSummary}
            </p>

            {breakthrough.graphDiff.new_nodes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {breakthrough.graphDiff.new_nodes.map((node) => (
                  <span
                    key={node.id}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                    style={{
                      background: (node.color || "#E8A94B") + "20",
                      color: node.color || "#E8A94B",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: node.color || "#E8A94B" }} />
                    {node.label}
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={onDismissBreakthrough}
              className="mt-4 w-full py-2 rounded-lg text-sm font-medium transition-colors hover:bg-amber-500/20"
              style={{ color: "#E8A94B", border: "1px solid rgba(232, 169, 75, 0.3)" }}
            >
              Continue Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
