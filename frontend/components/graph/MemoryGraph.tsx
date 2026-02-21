"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { GraphData, GraphNode, GraphEdge, NODE_COLORS, EDGE_COLORS } from "@/lib/types";
import { getWebSocket } from "@/lib/websocket";
import NodeDetail from "./NodeDetail";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface Props {
  onNodeQuery?: (nodeId: string, question: string) => void;
}

export default function MemoryGraph({ onNodeQuery }: Props) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [correctionFlash, setCorrectionFlash] = useState(false);
  const graphRef = useRef<any>(null);

  useEffect(() => {
    const ws = getWebSocket();

    ws.on("graph_update", (data) => {
      setGraphData((prev) => {
        const existingNodeIds = new Set(prev.nodes.map((n) => n.id));
        const newNodes = (data.graphData?.nodes || []).filter(
          (n: GraphNode) => !existingNodeIds.has(n.id)
        );
        const existingLinkKeys = new Set(
          prev.links.map((l: any) => `${typeof l.source === 'object' ? l.source.id : l.source}-${typeof l.target === 'object' ? l.target.id : l.target}`)
        );
        const newLinks = (data.graphData?.links || []).filter(
          (l: GraphEdge) => !existingLinkKeys.has(`${l.source}-${l.target}`)
        );

        if (newNodes.length > 0 && graphRef.current) {
          graphRef.current.d3ReheatSimulation();
        }

        return {
          nodes: [...prev.nodes, ...newNodes],
          links: [...prev.links, ...newLinks],
        };
      });
    });

    ws.on("correction_detected", () => {
      setCorrectionFlash(true);
      if (graphRef.current) {
        graphRef.current.d3ReheatSimulation();
      }
      setTimeout(() => setCorrectionFlash(false), 1500);
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
      const baseSize = n.type === "person" ? 8 : n.type === "emotion" ? 4 : 6;
      const size = baseSize * (1 + (n.importance || 5) / 15);
      const color = NODE_COLORS[n.type] || "#A09A92";
      const isSelected = selectedNode?.id === n.id;
      const isHovered = hoveredNode?.id === n.id;

      // Outer glow
      const gradient = ctx.createRadialGradient(n.x, n.y, size * 0.5, n.x, n.y, size * 2.5);
      gradient.addColorStop(0, color + "40");
      gradient.addColorStop(1, color + "00");
      ctx.beginPath();
      ctx.arc(n.x, n.y, size * 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Selection ring
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, size + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = color + "80";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Core node
      ctx.beginPath();
      ctx.arc(n.x, n.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Inner highlight
      const innerGrad = ctx.createRadialGradient(
        n.x - size * 0.3, n.y - size * 0.3, 0,
        n.x, n.y, size
      );
      innerGrad.addColorStop(0, "rgba(255,255,255,0.25)");
      innerGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(n.x, n.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = innerGrad;
      ctx.fill();

      // Label
      const fontSize = Math.max(11 / globalScale, 2);
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#F0EDE8";
      ctx.globalAlpha = 0.85;
      ctx.fillText(n.label, n.x, n.y + size + 3);
      ctx.globalAlpha = 1;
    },
    [selectedNode, hoveredNode]
  );

  const linkColor = useCallback((link: any) => {
    return EDGE_COLORS[link.type] || "rgba(240, 237, 232, 0.08)";
  }, []);

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden" style={{ background: "#0D0D0F" }}>
      {correctionFlash && (
        <div className="absolute inset-0 z-10 pointer-events-none rounded-2xl animate-pulse"
          style={{ boxShadow: "inset 0 0 60px rgba(232, 169, 75, 0.15)" }} />
      )}

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
          linkDirectionalParticles={1}
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
  );
}
