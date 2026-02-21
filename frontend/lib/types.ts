export interface GraphNode {
  id: string;
  label: string;
  type: "memory" | "person" | "value" | "emotion" | "ritual" | "place" | "artifact";
  description?: string;
  timestamp?: string;
  importance?: number;
  connections?: string[];
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  correctionType?: "productive" | "clarifying" | "rejecting" | null;
}

export interface WSMessage {
  type: "user_message" | "assistant_message" | "graph_update" | "correction_detected" | "node_answer";
  content?: string;
  graphData?: GraphData;
  correctionType?: string;
  nodeId?: string;
  answer?: string;
}

export type AgentName = "listener" | "learner" | "reflector" | "guardian";

export interface AgentStatus {
  agent: AgentName;
  status: "idle" | "running" | "done" | "error";
  summary?: string;
  durationMs?: number;
}

export interface FieldChange {
  nodeId: string;
  field: string;
  oldValue: string | number | null;
  newValue: string | number | null;
}

export interface CorrectionEvent {
  correctionType: "productive" | "clarifying";
  beforeClaim: string;
  afterInsight: string;
  learnerReflection: string;
  newMemoryUnlocked: boolean;
  affectedNodeIds: string[];
  fieldChanges?: FieldChange[];
}

export interface GraphSnapshot {
  timestamp: number;
  nodeCount: number;
  linkCount: number;
  wasCorrection: boolean;
}

export const AGENT_COLORS: Record<AgentName, string> = {
  listener: "#7B9FD4",
  learner: "#E8A94B",
  reflector: "#C47B8A",
  guardian: "#7BAF8A",
};

export const NODE_COLORS: Record<GraphNode["type"], string> = {
  memory: "#E8A94B",
  person: "#F0EDE8",
  value: "#C47B8A",
  emotion: "#7B9FD4",
  ritual: "#7BAF8A",
  place: "#FB923C",
  artifact: "#F472B6",
};

export const EDGE_COLORS: Record<string, string> = {
  felt_during: "rgba(123, 159, 212, 0.3)",
  connected_to: "rgba(240, 237, 232, 0.15)",
  reminds_of: "rgba(232, 169, 75, 0.3)",
  valued_by: "rgba(196, 123, 138, 0.3)",
  associated_with: "rgba(123, 175, 138, 0.3)",
  evolved_from: "rgba(251, 146, 60, 0.3)",
  contradicts: "rgba(244, 114, 182, 0.3)",
};
