// ---- Graph primitives ----

export interface GraphNode {
  id: string;
  label: string;
  type: "part" | "insight" | "behavior" | "emotion";
  description?: string;
  size?: number;
  visibility?: "bright" | "dim" | "hidden";
  color?: string;
  position_hint?: "central" | "side" | "peripheral" | "far_peripheral";
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  label?: string;
  visibility?: "visible" | "hidden" | "bright";
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

// ---- Scenario ----

export interface PartInfo {
  name: string;
  color: string;
}

export interface ScenarioInfo {
  id: string;
  title: string;
  tagline: string;
  caseDescription: string;
  parts: Record<string, PartInfo>;
}

// ---- Messages ----

export interface ChatMessage {
  id: string;
  role: "user" | "part" | "system";
  content: string;
  timestamp: number;
  part?: string;
  partName?: string;
  partColor?: string;
}

// ---- Part response from WS ----

export interface PartResponse {
  part: string;
  name: string;
  content: string;
  color: string;
}

// ---- Breakthrough ----

export interface BreakthroughEvent {
  breakthroughId: string;
  name: string;
  insightSummary: string;
  graphDiff: {
    illuminated_edges: GraphEdge[];
    dissolved_edges: GraphEdge[];
    new_nodes: GraphNode[];
    new_edges: GraphEdge[];
    changed_nodes: Partial<GraphNode>[];
  };
  fullSnapshot: GraphData & { turn: number };
}

// ---- Speech bubbles ----

export interface SpeechBubble {
  id: string;
  part: string;
  name: string;
  content: string;
  color: string;
  timestamp: number;
}

// ---- Agent status ----

export interface AgentStatus {
  agent: string;
  status: "idle" | "running" | "done" | "error";
  summary?: string;
  durationMs?: number;
}

// ---- Node colors ----

export const NODE_COLORS: Record<string, string> = {
  part: "#E8A94B",
  insight: "#FB923C",
  behavior: "#7B9FD4",
  emotion: "#C47B8A",
};

export const EDGE_COLORS: Record<string, string> = {
  DRIVES: "rgba(196, 123, 138, 0.5)",
  INFORMS: "rgba(123, 159, 212, 0.5)",
  REVEALS: "rgba(251, 146, 60, 0.5)",
  EXPLAINS: "rgba(232, 169, 75, 0.4)",
  ENABLES: "rgba(123, 175, 138, 0.5)",
  EVOLVES_INTO: "rgba(123, 175, 138, 0.5)",
  SUPPRESSES: "rgba(196, 123, 138, 0.4)",
  GATES: "rgba(123, 175, 138, 0.5)",
};

// ---- Persona Vectors ----

export interface VectorSnapshot {
  sycophancy: number;      // 0.0-1.0
  fear_activation: number;  // 0.0-1.0
  authenticity: number;     // 0.0-1.0
}

// ---- Warmth Signal ----

export interface WarmthSignal {
  warmth: number;           // 0.0-1.0
  nextBreakthroughId: string;
}
