"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { GraphData, GraphNode, GraphEdge, GraphSnapshot, CorrectionEvent, NODE_COLORS, EDGE_COLORS } from "@/lib/types";
import { getWebSocket } from "@/lib/websocket";
import NodeDetail from "./NodeDetail";
import { CorrectionCard } from "./CorrectionCard";
import { GraphTimeline } from "./GraphTimeline";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface Props {
  onNodeQuery?: (nodeId: string, question: string) => void;
  correction?: CorrectionEvent | null;
  onDismissCorrection?: () => void;
}

export default function MemoryGraph({ onNodeQuery, correction, onDismissCorrection }: Props) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [particleCount, setParticleCount] = useState(1);
  const [snapshots, setSnapshots] = useState<GraphSnapshot[]>([]);
  const graphRef = useRef<any>(null);

  const nodeAddedAtRef = useRef<Map<string, number>>(new Map());
  const nodeImportanceRef = useRef<Map<string, number>>(new Map());
  const correctionTimestampRef = useRef<number>(0);
  const affectedNodeIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const ws = getWebSocket();

    ws.on("graph_update", (data) => {
      const now = Date.now();
      const incomingNodes: GraphNode[] = data.graphData?.nodes || [];
      const incomingLinks: GraphEdge[] = data.graphData?.links || [];

      for (const node of incomingNodes) {
        const prev = nodeImportanceRef.current.get(node.id) || 0;
        nodeImportanceRef.current.set(node.id, prev + 1);
      }

      setGraphData((prev) => {
        const existingNodeIds = new Set(prev.nodes.map((n) => n.id));
        const newNodes = incomingNodes.filter((n) => !existingNodeIds.has(n.id));
        const existingLinkKeys = new Set(
          prev.links.map((l: any) => `${typeof l.source === "object" ? l.source.id : l.source}-${typeof l.target === "object" ? l.target.id : l.target}`)
        );
        const newLinks = incomingLinks.filter(
          (l) => !existingLinkKeys.has(`${l.source}-${l.target}`)
        );

        for (const node of newNodes) {
          nodeAddedAtRef.current.set(node.id, now);
        }

        if (newNodes.length > 0 && graphRef.current) {
          graphRef.current.d3ReheatSimulation();
        }

        const nextData = {
          nodes: [...prev.nodes, ...newNodes],
          links: [...prev.links, ...newLinks],
        };

        setSnapshots((prevSnaps) => [
          ...prevSnaps,
          {
            timestamp: now,
            nodeCount: nextData.nodes.length,
            linkCount: nextData.links.length,
            wasCorrection: false,
          },
        ]);

        return nextData;
      });
    });

    ws.on("correction_detected", (data) => {
      const now = Date.now();
      correctionTimestampRef.current = now;

      const ids: string[] = data.affectedNodeIds || [];
      affectedNodeIdsRef.current = new Set(ids);
      setTimeout(() => affectedNodeIdsRef.current.clear(), 3000);

      setParticleCount(4);
      setTimeout(() => setParticleCount(1), 2500);

      setSnapshots((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], wasCorrection: true };
        return updated;
      });

      if (graphRef.current) {
        graphRef.current.d3ReheatSimulation();
      }
    });
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node as GraphNode);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 800);
      graphRef.current.zoom(2.5, 800);
    }
  }, []);

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode & { x: number; y: number };
      if (n.x == null || n.y == null || !isFinite(n.x) || !isFinite(n.y)) return;
      const now = Date.now();

      const refCount = nodeImportanceRef.current.get(n.id) || 1;
      const importanceScale = 1 + Math.log2(refCount) * 0.15;
      const baseSize = n.type === "person" ? 8 : n.type === "emotion" ? 4 : 6;
      const size = baseSize * (1 + (n.importance || 5) / 15) * importanceScale;
      const color = NODE_COLORS[n.type] || "#A09A92";
      const isSelected = selectedNode?.id === n.id;
      const isHovered = hoveredNode?.id === n.id;
      const isAffected = affectedNodeIdsRef.current.has(n.id);

      // Bloom animation for new nodes
      const addedAt = nodeAddedAtRef.current.get(n.id);
      let bloomScale = 1;
      if (addedAt) {
        const elapsed = now - addedAt;
        if (elapsed < 500) {
          const t = elapsed / 500;
          bloomScale = t < 0.6 ? (t / 0.6) * 1.2 : 1.2 - 0.2 * ((t - 0.6) / 0.4);
        }
        if (elapsed < 800) {
          const t = elapsed / 800;
          const glowRadius = size * (2 + t * 3);
          const glowOpacity = 1 - t;
          ctx.beginPath();
          ctx.arc(n.x, n.y, glowRadius, 0, 2 * Math.PI);
          ctx.strokeStyle = color + Math.round(glowOpacity * 128).toString(16).padStart(2, "0");
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      const effectiveSize = size * bloomScale;

      // Targeted amber pulse for correction-affected nodes
      const corrTs = correctionTimestampRef.current;
      if (corrTs > 0 && isAffected) {
        const corrElapsed = now - corrTs;
        if (corrElapsed < 2500) {
          const t = corrElapsed / 2500;
          const pulseOpacity = Math.sin(t * Math.PI) * 0.8;
          const pulseRadius = effectiveSize + 6 + t * 10;

          ctx.beginPath();
          ctx.arc(n.x, n.y, pulseRadius, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(232, 169, 75, ${pulseOpacity})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      }

      // Outer glow
      const gradient = ctx.createRadialGradient(n.x, n.y, effectiveSize * 0.5, n.x, n.y, effectiveSize * 2.5);
      gradient.addColorStop(0, color + "40");
      gradient.addColorStop(1, color + "00");
      ctx.beginPath();
      ctx.arc(n.x, n.y, effectiveSize * 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Selection / hover ring
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, effectiveSize + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = color + "80";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Core node
      ctx.beginPath();
      ctx.arc(n.x, n.y, effectiveSize, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Inner highlight
      const innerGrad = ctx.createRadialGradient(
        n.x - effectiveSize * 0.3, n.y - effectiveSize * 0.3, 0,
        n.x, n.y, effectiveSize
      );
      innerGrad.addColorStop(0, "rgba(255,255,255,0.25)");
      innerGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(n.x, n.y, effectiveSize, 0, 2 * Math.PI);
      ctx.fillStyle = innerGrad;
      ctx.fill();

      // Label
      const fontSize = Math.max(11 / globalScale, 2);
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#F0EDE8";
      ctx.globalAlpha = 0.85;
      ctx.fillText(n.label, n.x, n.y + effectiveSize + 3);
      ctx.globalAlpha = 1;
    },
    [selectedNode, hoveredNode]
  );

  const linkColor = useCallback((link: any) => {
    return EDGE_COLORS[link.type] || "rgba(240, 237, 232, 0.08)";
  }, []);

  return (
    <div className="relative h-full w-full flex flex-col" style={{ background: "#0D0D0F" }}>
      <div className="flex-1 relative overflow-hidden rounded-2xl">
        {graphData.nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-16 h-16 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #E8A94B 0%, transparent 70%)" }} />
            <p className="text-sm" style={{ color: "#A09A92" }}>
              Share a memory to begin building your memorial...
            </p>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeCanvasObject={nodeCanvasObject}
            onNodeClick={handleNodeClick}
            onNodeHover={(node: any) => setHoveredNode(node as GraphNode | null)}
            linkColor={linkColor}
            linkWidth={1}
            linkCurvature={0.1}
            backgroundColor="transparent"
            cooldownTicks={100}
            warmupTicks={30}
            nodeRelSize={6}
            linkDirectionalParticles={particleCount}
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleColor={() => "rgba(232, 169, 75, 0.4)"}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            enableZoomInteraction={true}
            enablePanInteraction={true}
          />
        )}

        {selectedNode && (
          <NodeDetail
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onQuery={(question) => onNodeQuery?.(selectedNode.id, question)}
          />
        )}
      </div>

      {/* Timeline at the very bottom of the graph area */}
      {snapshots.length > 0 && (
        <div className="px-4">
          <GraphTimeline snapshots={snapshots} />
        </div>
      )}

      {/* Correction ceremony overlay */}
      {correction && onDismissCorrection && (
        <CorrectionCard correction={correction} onDismiss={onDismissCorrection} />
      )}
    </div>
  );
}
