"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  GraphData, GraphNode, GraphEdge, BreakthroughEvent,
  PartResponse, SpeechBubble, NODE_COLORS, EDGE_COLORS,
} from "@/lib/types";
import {
  BUBBLE_VISIBLE_MS, BUBBLE_FADE_START_MS, BUBBLE_FADE_DURATION_MS,
  BLOOM_DURATION_MS, BLOOM_GLOW_DURATION_MS, ILLUMINATE_PULSE_DURATION_MS,
} from "@/lib/constants";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

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

      const nodeColor = n.color || NODE_COLORS[n.type] || "#8A857E";
      const baseSize = n.size || 6;
      const isDim = n.visibility === "dim";
      const isSelected = selectedPart === n.id;

      // Bloom animation for new nodes
      const addedAt = nodeAddedAtRef.current.get(n.id);
      let bloomScale = 1;
      if (addedAt) {
        const elapsed = now - addedAt;
        if (elapsed < BLOOM_DURATION_MS) {
          const t = elapsed / BLOOM_DURATION_MS;
          bloomScale = t < 0.5 ? (t / 0.5) * 1.3 : 1.3 - 0.3 * ((t - 0.5) / 0.5);
        }
        if (elapsed < BLOOM_GLOW_DURATION_MS) {
          const t = elapsed / BLOOM_GLOW_DURATION_MS;
          const glowRadius = baseSize * (2 + t * 4);
          ctx.beginPath();
          ctx.arc(n.x, n.y, glowRadius, 0, 2 * Math.PI);
          ctx.strokeStyle = nodeColor + Math.round((1 - t) * 128).toString(16).padStart(2, "0");
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      const effectiveSize = baseSize * bloomScale;
      const alpha = isDim ? 0.3 : 1;

      // Outer glow — softer
      const gradient = ctx.createRadialGradient(n.x, n.y, effectiveSize * 0.5, n.x, n.y, effectiveSize * 2.5);
      gradient.addColorStop(0, nodeColor + (isDim ? "10" : "25"));
      gradient.addColorStop(1, nodeColor + "00");
      ctx.beginPath();
      ctx.arc(n.x, n.y, effectiveSize * 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, effectiveSize + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = nodeColor + "70";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        const pulseT = (now % 2500) / 2500;
        const pulseR = effectiveSize + 3 + pulseT * 10;
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseR, 0, 2 * Math.PI);
        ctx.strokeStyle = nodeColor + Math.round((1 - pulseT) * 60).toString(16).padStart(2, "0");
        ctx.lineWidth = 1;
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
        n.x - effectiveSize * 0.25, n.y - effectiveSize * 0.25, 0,
        n.x, n.y, effectiveSize,
      );
      innerGrad.addColorStop(0, "rgba(255,255,255,0.25)");
      innerGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(n.x, n.y, effectiveSize, 0, 2 * Math.PI);
      ctx.fillStyle = innerGrad;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Label
      const fontSize = Math.max(11 / globalScale, 2.5);
      ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.globalAlpha = isDim ? 0.35 : 0.85;
      ctx.fillStyle = "#E8E5E0";
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

      const color = EDGE_COLORS[link.type] || "rgba(232, 229, 224, 0.1)";

      if (isIlluminated) {
        const now = Date.now();
        const elapsed = now - breakthroughTimestampRef.current;
        const pulseT = Math.min(elapsed / ILLUMINATE_PULSE_DURATION_MS, 1);
        const pulseAlpha = 0.3 + Math.sin(pulseT * Math.PI * 4) * 0.5;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = `rgba(212, 168, 83, ${pulseAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Edge label
      if (link.label) {
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const fontSize = Math.max(8 / globalScale, 1.8);
        ctx.font = `400 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isIlluminated ? "rgba(212, 168, 83, 0.7)" : "rgba(232, 229, 224, 0.2)";
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

  // Visible speech bubbles
  const visibleBubbles = speechBubbles
    .filter((b) => Date.now() - b.timestamp < BUBBLE_VISIBLE_MS)
    .reduce((acc, b) => {
      acc.set(b.part, b);
      return acc;
    }, new Map<string, SpeechBubble>());
  const bubbleList = Array.from(visibleBubbles.values()).slice(-3);

  return (
    <div ref={containerRef} className="relative h-full w-full graph-bg">
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

      {/* Speech bubbles */}
      {bubbleList.map((bubble) => {
        const pos = bubblePositions[bubble.part];
        if (!pos) return null;
        const age = Date.now() - bubble.timestamp;
        const opacity = age > BUBBLE_FADE_START_MS ? Math.max(0, 1 - (age - BUBBLE_FADE_START_MS) / BUBBLE_FADE_DURATION_MS) : 1;

        return (
          <div
            key={bubble.id}
            className="absolute pointer-events-none animate-bubble-in z-30"
            style={{
              left: pos.x,
              top: pos.y - 20,
              transform: "translate(-50%, -100%)",
              opacity,
            }}
          >
            <div
              className="max-w-[260px] rounded-lg px-3 py-2 text-[13px] leading-relaxed bg-[var(--glass-bg-heavy)] text-[var(--color-text-primary)]"
              style={{ border: `1px solid ${bubble.color}30` }}
            >
              <span className="text-[10px] font-semibold block mb-0.5" style={{ color: bubble.color }}>
                {bubble.name}
              </span>
              {bubble.content.length > 120 ? bubble.content.slice(0, 120) + "..." : bubble.content}
            </div>
            <div
              className="mx-auto w-0 h-0"
              style={{
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "5px solid var(--glass-bg-heavy)",
              }}
            />
          </div>
        );
      })}

      {/* Breakthrough ceremony overlay */}
      {breakthrough && (
        <div className="absolute inset-0 z-40 flex items-center justify-center animate-breakthrough-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" onClick={onDismissBreakthrough} />
          <div className="relative max-w-[420px] w-full mx-4 rounded-xl border border-[var(--color-border-accent)] bg-[var(--glass-bg-solid)] overflow-hidden">
            {/* Top accent */}
            <div className="h-0.5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent" />

            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" style={{ animation: "pulse-glow 1.5s ease-in-out infinite" }} />
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-accent)]">
                  Breakthrough
                </h3>
              </div>
              <h2 className="text-lg font-serif font-semibold text-[var(--color-text-primary)] mb-2">
                {breakthrough.name}
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {breakthrough.insightSummary}
              </p>

              {breakthrough.graphDiff.new_nodes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {breakthrough.graphDiff.new_nodes.map((node) => (
                    <span
                      key={node.id}
                      className="pill"
                      style={{
                        background: (node.color || "var(--color-accent)") + "15",
                        color: node.color || "var(--color-accent)",
                        border: `1px solid ${(node.color || "var(--color-accent)")}25`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: node.color || "var(--color-accent)" }} />
                      {node.label}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={onDismissBreakthrough}
                className="mt-5 w-full py-2.5 rounded-lg text-sm font-medium transition-all text-[var(--color-accent)] border border-[var(--color-border-accent)] hover:bg-[var(--color-accent-muted)]"
              >
                Continue Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
