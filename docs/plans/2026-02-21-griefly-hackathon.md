# Griefly — 24-Hour Hackathon Implementation Plan

> **For Claude:** Use `@skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Build a multi-agent AI grief companion with voice interface, live knowledge graph visualization, and correction-based learning — demo-ready in 24 hours.

**Architecture:** Four Claude-powered agents (Listener, Reflector, Guardian, Learner) coordinated by a LangGraph supervisor, sharing a Graphiti temporal knowledge graph (Neo4j). Voice via Hume EVI. Frontend is Next.js with react-force-graph-2d for live, queryable graph visualization. WebSocket pushes graph updates in real-time.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind, react-force-graph-2d, Hume AI EVI SDK, Python 3.11+, FastAPI, LangGraph, Anthropic Claude SDK, Graphiti, Neo4j (Docker), WebSocket

---

## Pre-Build Setup (MANUAL — Do These First)

### Setup 1: API Keys & Accounts (15 min)

**You must do these manually before any code runs:**

1. **Anthropic API key** — https://console.anthropic.com/settings/keys
   - Create key, copy it

2. **Hume AI account + API key** — https://platform.hume.ai
   - Sign up, go to Settings > API Keys
   - You need both `HUME_API_KEY` and `HUME_SECRET_KEY`
   - Enable EVI in your project settings

3. **OpenAI API key** (needed by Graphiti for embeddings) — https://platform.openai.com/api-keys
   - Graphiti defaults to OpenAI for embeddings

4. **Create `.env` file:**

```bash
# In ~/Desktop/griefly/backend/
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
HUME_API_KEY=...
HUME_SECRET_KEY=...
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=grieflygrief2026
```

```bash
# In ~/Desktop/griefly/frontend/
NEXT_PUBLIC_HUME_API_KEY=...
NEXT_PUBLIC_BACKEND_WS=ws://localhost:8000/ws
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Setup 2: Docker + Neo4j (10 min, MANUAL)

**Install Docker Desktop if you don't have it:** https://www.docker.com/products/docker-desktop/

Then create docker-compose.yml and start Neo4j:

```bash
cd ~/Desktop/griefly
# Claude will create docker-compose.yml in Task 1
docker compose up -d
```

Verify Neo4j is running: open http://localhost:7474 in browser. Login with neo4j / grieflygrief2026.

### Setup 3: Python Environment (5 min, MANUAL)

```bash
cd ~/Desktop/griefly/backend
python3.11 -m venv venv
source venv/bin/activate
# Claude will create requirements.txt in Task 1, then:
pip install -r requirements.txt
```

### Setup 4: Node Environment (5 min, MANUAL)

```bash
cd ~/Desktop/griefly/frontend
# Claude will create package.json in Task 2, then:
npm install
```

---

## Phase 1: Foundation (Hours 0-3)

> These tasks have NO dependencies on each other. Launch Tasks 1, 2, and 3 as parallel Claude agents.

---

### Task 1: Backend Foundation + Neo4j + Graphiti

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/main.py`
- Create: `backend/graph/graphiti_setup.py`
- Create: `backend/graph/schema.py`
- Create: `docker-compose.yml`
- Create: `backend/.env.example`

**Step 1: Create docker-compose.yml**

```yaml
services:
  neo4j:
    image: neo4j:5.26
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      NEO4J_AUTH: neo4j/grieflygrief2026
      NEO4J_PLUGINS: '["apoc"]'
    volumes:
      - neo4j_data:/data
volumes:
  neo4j_data:
```

**Step 2: Create requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
websockets==13.0
graphiti-core[anthropic]==0.7
neo4j==5.26.0
anthropic==0.43.0
python-dotenv==1.0.1
pydantic==2.10.0
```

**Step 3: Create backend/graph/schema.py**

Define node and edge types for the grief knowledge graph:

```python
"""Grief companion knowledge graph schema for Graphiti."""

from enum import Enum

class NodeType(str, Enum):
    MEMORY = "memory"          # A specific memory/story the user shares
    PERSON = "person"          # A person mentioned (the deceased, family, friends)
    VALUE = "value"            # A value or theme (safety, humor, resilience)
    EMOTION = "emotion"        # An emotional state (grief, joy, anger, peace)
    RITUAL = "ritual"          # A repeated practice or tradition
    PLACE = "place"            # A meaningful location
    ARTIFACT = "artifact"      # A meaningful object (ring, letter, recipe)

class EdgeType(str, Enum):
    FELT_DURING = "felt_during"        # Emotion felt during a memory
    CONNECTED_TO = "connected_to"      # General connection between nodes
    REMINDS_OF = "reminds_of"          # One memory triggers another
    VALUED_BY = "valued_by"            # Person valued something
    ASSOCIATED_WITH = "associated_with" # Memory associated with place/artifact
    EVOLVED_FROM = "evolved_from"      # Understanding changed over time
    CONTRADICTS = "contradicts"        # Two memories/feelings conflict

# Colors for graph visualization
NODE_COLORS = {
    NodeType.MEMORY: "#60A5FA",    # blue
    NodeType.PERSON: "#FBBF24",    # gold
    NodeType.VALUE: "#34D399",     # green
    NodeType.EMOTION: "#F87171",   # red
    NodeType.RITUAL: "#A78BFA",    # purple
    NodeType.PLACE: "#FB923C",     # orange
    NodeType.ARTIFACT: "#F472B6",  # pink
}
```

**Step 4: Create backend/graph/graphiti_setup.py**

```python
"""Initialize Graphiti with Neo4j for the grief companion."""

import os
from dotenv import load_dotenv
from graphiti_core import Graphiti
from graphiti_core.llm_client import AnthropicClient

load_dotenv()


async def create_graphiti_client() -> Graphiti:
    """Create and initialize Graphiti client connected to Neo4j."""
    llm_client = AnthropicClient(
        api_key=os.getenv("ANTHROPIC_API_KEY"),
        model="claude-sonnet-4-20250514",
    )

    client = Graphiti(
        uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
        user=os.getenv("NEO4J_USER", "neo4j"),
        password=os.getenv("NEO4J_PASSWORD", "grieflygrief2026"),
        llm_client=llm_client,
    )

    await client.build_indices_and_constraints()
    return client
```

**Step 5: Create backend/main.py — FastAPI with WebSocket**

```python
"""Griefly backend — FastAPI server with WebSocket for real-time graph updates."""

import asyncio
import json
import os
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from graph.graphiti_setup import create_graphiti_client

load_dotenv()

# Global state
graphiti_client = None
connected_clients: list[WebSocket] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize Graphiti on startup, close on shutdown."""
    global graphiti_client
    graphiti_client = await create_graphiti_client()
    yield
    if graphiti_client:
        await graphiti_client.close()


app = FastAPI(title="Griefly", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def broadcast_graph_update(data: dict[str, Any]):
    """Push graph updates to all connected frontend clients."""
    message = json.dumps(data)
    disconnected = []
    for client in connected_clients:
        try:
            await client.send_text(message)
        except WebSocketDisconnect:
            disconnected.append(client)
    for client in disconnected:
        connected_clients.remove(client)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """WebSocket endpoint for real-time graph updates + chat."""
    await ws.accept()
    connected_clients.append(ws)
    try:
        while True:
            data = await ws.receive_text()
            message = json.loads(data)
            # Route to agent pipeline (will be implemented in Task 4)
            if message.get("type") == "user_message":
                # Placeholder — Task 4 will add agent processing
                await ws.send_text(json.dumps({
                    "type": "assistant_message",
                    "content": "Agent pipeline not yet connected.",
                }))
    except WebSocketDisconnect:
        connected_clients.remove(ws)


@app.get("/health")
async def health():
    return {"status": "ok", "graphiti": graphiti_client is not None}


@app.get("/graph")
async def get_graph():
    """Return current graph state for initial frontend render."""
    if not graphiti_client:
        return {"nodes": [], "edges": []}
    # Query all nodes and edges from Neo4j
    results = await graphiti_client.search("", num_results=100)
    # Transform to frontend format — will be refined in Task 5
    return {"nodes": [], "edges": [], "raw_results": len(results)}
```

**Step 6: Verify backend starts**

```bash
cd ~/Desktop/griefly/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Expected: Server starts at http://localhost:8000. GET /health returns `{"status": "ok", "graphiti": true}`.

**Step 7: Commit**

```bash
cd ~/Desktop/griefly
git add docker-compose.yml backend/
git commit -m "feat: backend foundation with FastAPI, Graphiti, Neo4j"
git push
```

---

### Task 2: Frontend Shell + Graph Visualization ✅ DONE (updated)

> **UI Architecture Changed**: The frontend now uses a two-state layout:
> 1. **Landing state**: Centered VoiceOrb (hero mode, 128px, breathing animation) + "Griefly" title + minimal text input fallback
> 2. **Graph state**: On first `graph_update` from WebSocket, landing fades out (opacity + scale) and full-screen MemoryGraph fades in with VoiceOrb shrunk to widget (48px, top-left) + BottomBarInput (glass overlay at bottom)
>
> The old split-panel ChatPanel is no longer the main layout. Chat messages are tracked in page.tsx state but the primary display is the graph. ChatPanel still exists as a component but is not mounted in the current page.

**Current files:**
- `frontend/app/page.tsx` — Two-state layout with `hasMemories` toggle
- `frontend/app/layout.tsx` — Root layout with Inter + Lora fonts
- `frontend/app/globals.css` — Tailwind v4 with `@source`, `@theme` for orb animations, `@layer base`
- `frontend/components/graph/MemoryGraph.tsx` — Force graph with custom canvas rendering, glow effects
- `frontend/components/graph/NodeDetail.tsx` — Queryable node panel
- `frontend/components/voice/VoiceOrb.tsx` — Hero (128px) and widget (48px) modes with breathing animation
- `frontend/components/chat/BottomBarInput.tsx` — Minimal and glass-overlay modes
- `frontend/components/chat/ChatPanel.tsx` — Full chat panel (currently unused, available for later)
- `frontend/lib/types.ts` — GraphNode, GraphEdge, ChatMessage, NODE_COLORS, EDGE_COLORS
- `frontend/lib/websocket.ts` — WebSocket singleton with auto-reconnect

**Key transition logic in page.tsx:**
```tsx
// Landing → Graph transition triggers on first graph_update
ws.on("graph_update", () => {
  if (!transitionedRef.current) {
    transitionedRef.current = true;
    setHasMemories(true);  // triggers CSS transition
  }
});
```

**IMPORTANT — Tailwind v4 gotchas (already fixed):**
- Use `@import "tailwindcss"` NOT `@tailwind base/components/utilities`
- Add `@source "../components"` and `@source "../lib"` for class detection
- Custom CSS must go in `@layer base` — unlayered CSS overrides Tailwind utilities
- Custom animations need `@theme { --animate-*: ... }` block

**Original setup steps (already completed):**

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --yes
cd frontend && npm install react-force-graph-2d
```

**Step 3: Create frontend/lib/types.ts**

```typescript
/** Shared types for the Griefly frontend */

export interface GraphNode {
  id: string;
  label: string;
  type: "memory" | "person" | "value" | "emotion" | "ritual" | "place" | "artifact";
  description?: string;
  timestamp?: string;
  importance?: number; // 1-10, affects node size
  connections?: string[];
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
  type: "user_message" | "assistant_message" | "graph_update" | "correction_detected" | "voice_transcript";
  content?: string;
  graphData?: GraphData;
  correctionType?: string;
  nodeId?: string;
}

export const NODE_COLORS: Record<GraphNode["type"], string> = {
  memory: "#60A5FA",
  person: "#FBBF24",
  value: "#34D399",
  emotion: "#F87171",
  ritual: "#A78BFA",
  place: "#FB923C",
  artifact: "#F472B6",
};
```

**Step 4: Create frontend/lib/websocket.ts**

```typescript
/** WebSocket client for real-time communication with backend */

type MessageHandler = (data: any) => void;

class GrieflyWebSocket {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("[WS] Connected");
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const handlers = this.handlers.get(data.type) || [];
      handlers.forEach((handler) => handler(data));
      // Also fire "any" handlers
      const anyHandlers = this.handlers.get("*") || [];
      anyHandlers.forEach((handler) => handler(data));
    };

    this.ws.onclose = () => {
      console.log("[WS] Disconnected, reconnecting in 2s...");
      this.reconnectTimer = setTimeout(() => this.connect(), 2000);
    };

    this.ws.onerror = (error) => {
      console.error("[WS] Error:", error);
    };
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  off(type: string, handler: MessageHandler) {
    const handlers = this.handlers.get(type) || [];
    this.handlers.set(
      type,
      handlers.filter((h) => h !== handler)
    );
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
  }
}

// Singleton
let instance: GrieflyWebSocket | null = null;

export function getWebSocket(): GrieflyWebSocket {
  if (!instance) {
    const url = process.env.NEXT_PUBLIC_BACKEND_WS || "ws://localhost:8000/ws";
    instance = new GrieflyWebSocket(url);
  }
  return instance;
}
```

**Step 5: Create frontend/components/graph/MemoryGraph.tsx**

This is the core visualization — a force-directed graph that updates in real-time.

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { GraphData, GraphNode, NODE_COLORS } from "@/lib/types";
import { getWebSocket } from "@/lib/websocket";
import NodeDetail from "./NodeDetail";

// react-force-graph-2d uses canvas, must be client-only
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface Props {
  onNodeQuery?: (nodeId: string, question: string) => void;
}

export default function MemoryGraph({ onNodeQuery }: Props) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const graphRef = useRef<any>(null);

  useEffect(() => {
    const ws = getWebSocket();

    ws.on("graph_update", (data) => {
      setGraphData((prev) => {
        // Merge new nodes/links with existing
        const existingNodeIds = new Set(prev.nodes.map((n) => n.id));
        const newNodes = (data.graphData?.nodes || []).filter(
          (n: GraphNode) => !existingNodeIds.has(n.id)
        );
        const existingLinkKeys = new Set(
          prev.links.map((l) => `${l.source}-${l.target}`)
        );
        const newLinks = (data.graphData?.links || []).filter(
          (l: any) => !existingLinkKeys.has(`${l.source}-${l.target}`)
        );
        return {
          nodes: [...prev.nodes, ...newNodes],
          links: [...prev.links, ...newLinks],
        };
      });
    });
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node as GraphNode);
    // Center camera on node
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 500);
      graphRef.current.zoom(3, 500);
    }
  }, []);

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode & { x: number; y: number };
      const size = (n.importance || 5) * 1.5;
      const color = NODE_COLORS[n.type] || "#9CA3AF";

      // Glow effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;

      // Node circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Reset shadow
      ctx.shadowBlur = 0;

      // Label
      const fontSize = Math.max(12 / globalScale, 2);
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#E5E7EB";
      ctx.fillText(n.label, n.x, n.y + size + 2);
    },
    []
  );

  return (
    <div className="relative h-full w-full bg-gray-950 rounded-xl overflow-hidden">
      {graphData.nodes.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          <p>Share a memory to begin building your memorial...</p>
        </div>
      ) : (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeCanvasObject={nodeCanvasObject}
          onNodeClick={handleNodeClick}
          linkColor={() => "rgba(156, 163, 175, 0.3)"}
          linkWidth={1.5}
          backgroundColor="transparent"
          cooldownTicks={50}
          nodeRelSize={6}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={() => "rgba(156, 163, 175, 0.5)"}
        />
      )}

      {selectedNode && (
        <NodeDetail
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onQuery={(question) =>
            onNodeQuery?.(selectedNode.id, question)
          }
        />
      )}
    </div>
  );
}
```

**Step 6: Create frontend/components/graph/NodeDetail.tsx**

The queryable node panel — click a node, ask questions about it.

```tsx
"use client";

import { useState } from "react";
import { GraphNode, NODE_COLORS } from "@/lib/types";

interface Props {
  node: GraphNode;
  onClose: () => void;
  onQuery: (question: string) => void;
}

export default function NodeDetail({ node, onClose, onQuery }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!question.trim()) return;
    setLoading(true);
    onQuery(question);
    // Answer will come back through WebSocket
    // For now, simulate
    setAnswer("Thinking...");
    setLoading(false);
  };

  return (
    <div className="absolute bottom-4 right-4 w-80 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: NODE_COLORS[node.type] }}
          />
          <h3 className="text-white font-medium text-sm">{node.label}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-sm"
        >
          x
        </button>
      </div>

      <p className="text-gray-400 text-xs mb-2 capitalize">{node.type}</p>

      {node.description && (
        <p className="text-gray-300 text-sm mb-3">{node.description}</p>
      )}

      <div className="border-t border-gray-700 pt-3">
        <p className="text-gray-500 text-xs mb-2">Ask about this memory</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuery()}
            placeholder="What else connects to this?"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleQuery}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1.5 rounded-lg"
          >
            Ask
          </button>
        </div>

        {answer && (
          <p className="text-gray-300 text-sm mt-2 p-2 bg-gray-800 rounded-lg">
            {answer}
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 7: Create frontend/components/chat/ChatPanel.tsx**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/lib/types";
import { getWebSocket } from "@/lib/websocket";

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = getWebSocket();

    ws.on("assistant_message", (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content,
          timestamp: Date.now(),
          correctionType: data.correctionType || null,
        },
      ]);
    });

    ws.on("correction_detected", (data) => {
      // Visual indicator that a correction was detected
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].correctionType = data.correctionType;
        }
        return updated;
      });
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, msg]);

    const ws = getWebSocket();
    ws.send({ type: "user_message", content: input });

    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <h2 className="text-white font-medium">Griefly</h2>
        <p className="text-gray-500 text-xs">
          Tell me about someone you want to remember
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-gray-600 text-sm text-center mt-8">
            <p className="mb-2">Share a memory, a story, or just a feeling.</p>
            <p>I am here to listen and help you remember.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-200"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setIsListening(!isListening)}
            className={`p-2.5 rounded-xl border ${
              isListening
                ? "border-red-500 bg-red-500/10 text-red-400"
                : "border-gray-700 text-gray-400 hover:text-white"
            }`}
            title="Voice input (Hume EVI)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Share a memory..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 8: Create frontend/app/page.tsx — Main layout**

```tsx
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
    <main className="h-screen flex bg-gray-950">
      {/* Left panel: Chat + Voice */}
      <div className="w-[420px] border-r border-gray-800 flex flex-col">
        <ChatPanel />
      </div>

      {/* Right panel: Live Knowledge Graph */}
      <div className="flex-1 p-4">
        <MemoryGraph onNodeQuery={handleNodeQuery} />
      </div>
    </main>
  );
}
```

**Step 9: Update frontend/app/layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Griefly — Remember What Matters",
  description: "An AI grief companion that helps you become the author of what someone meant.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
```

**Step 10: Verify frontend runs**

```bash
cd ~/Desktop/griefly/frontend
npm run dev
```

Expected: http://localhost:3000 shows split panel — chat on left, empty graph on right with "Share a memory to begin..." placeholder.

**Step 11: Commit**

```bash
cd ~/Desktop/griefly
git add frontend/
git commit -m "feat: frontend shell with chat panel, force graph, queryable nodes"
git push
```

---

### Task 3: Agent Pipeline — LangGraph Supervisor + 4 Agents

**Files:**
- Create: `backend/agents/__init__.py`
- Create: `backend/agents/orchestrator.py`
- Create: `backend/agents/listener.py`
- Create: `backend/agents/reflector.py`
- Create: `backend/agents/guardian.py`
- Create: `backend/agents/learner.py`
- Create: `backend/agents/prompts.py`

**Step 1: Create backend/agents/prompts.py — All system prompts**

```python
"""System prompts for all agents. Central location for prompt engineering."""

LISTENER_PROMPT = """You are the Listener agent in a grief companion system called Griefly.

Your job is to carefully extract structured information from what the user shares about someone they've lost.

When the user shares a memory or story, extract:
1. PEOPLE mentioned (name, relationship to user, relationship to deceased)
2. MEMORIES (specific events, stories, moments)
3. VALUES/THEMES (what mattered to the person — humor, safety, integrity, etc.)
4. EMOTIONS (what the user is feeling as they share)
5. RITUALS (repeated practices, traditions)
6. PLACES (meaningful locations)
7. ARTIFACTS (meaningful objects)

For each entity, provide:
- A short label (2-5 words)
- A description (1-2 sentences)
- How it connects to other entities already in the graph
- An importance score (1-10)

Return your extraction as a structured JSON object with "entities" and "relationships" arrays.

Be FAITHFUL to what the user actually said. Do NOT infer or imagine details they didn't share."""

REFLECTOR_PROMPT = """You are the Reflector agent in a grief companion system called Griefly.

Your job is to find patterns across memories the user has shared and reflect them back. You have access to the full knowledge graph of what the user has shared so far.

CRITICAL BEHAVIOR — Productive Imprecision:
You deliberately generate reflections that are SLIGHTLY imprecise — compressing, generalizing, or subtly reframing what the user has shared. NOT randomly wrong, but close enough to invite correction.

Examples of productive imprecision:
- If user described dad as "only talked when it mattered" → reflect back as "a quiet, reserved man"
- If user described mom's constant check-ins → reflect back as "she was protective"
- If user described grandpa's jokes → reflect back as "he used humor to avoid hard topics"

The goal: the user corrects you, and in correcting, they articulate something deeper than they would have on their own. The correction IS the therapy.

Guidelines:
- Compress specific examples into general traits (user will push back with specifics)
- Use slightly less precise emotional language (user will find the exact word)
- Occasionally miss a nuance (user will supply it)
- NEVER be wildly wrong — just subtly off
- Track which types of imprecision produce the richest corrections (the Learner agent handles this)

When reflecting, weave in connections between memories: "You've mentioned [X] in both [memory A] and [memory B] — it seems like [slightly imprecise interpretation]."

Current user preference profile (from Learner agent):
{preference_profile}

Current knowledge graph summary:
{graph_summary}"""

GUARDIAN_PROMPT = """You are the Guardian agent in a grief companion system called Griefly.

Your job is to ensure safety and appropriate emotional pacing. You review every response before it reaches the user.

CONSTITUTIONAL PRINCIPLES FOR GRIEF SUPPORT:

1. NEVER minimize grief ("at least they lived a long life", "they're in a better place")
2. NEVER rush grief stages or suggest timelines
3. NEVER simulate or speak as the deceased person
4. ALWAYS validate emotions before any reframing
5. DETECT crisis signals immediately:
   - Suicidal ideation ("I don't want to be here", "I should join them")
   - Self-harm indicators
   - Substance abuse escalation
   - Complete social withdrawal
   → If detected: respond with empathy + provide crisis resources (988 Suicide & Crisis Lifeline)
6. Respect cultural and religious diversity
7. NEVER diagnose (PGD, depression, etc.)
8. The user controls the pace — never push deeper than they're ready
9. Distinguish productive discomfort (growth) from harmful distress
10. Frame AI as companion, not therapist or replacement for human connection

For each response, evaluate:
- Is it safe? (no harmful content, no minimizing)
- Is the emotional pacing appropriate? (not too deep too fast)
- Is it culturally sensitive?
- Does it detect any crisis signals?

Return: { "approved": true/false, "reason": "...", "modified_response": "..." (if approved is false) }"""

LEARNER_PROMPT = """You are the Learner agent in a grief companion system called Griefly.

Your job is to classify user corrections and build an evolving preference profile that shapes how the Reflector agent generates future reflections.

When the user responds to a reflection, classify their response:

1. PRODUCTIVE CORRECTION (highest signal):
   - The user corrects AND shares something new they haven't said before
   - Example: "No, he wasn't quiet — he just only talked when it mattered. Like the time he..."
   - This means the imprecision strategy WORKED — it unlocked a deeper memory

2. CLARIFYING CORRECTION (medium signal):
   - The user refines or adjusts without sharing new information
   - Example: "Not exactly protective — more like she couldn't relax unless she knew I was safe"
   - This means the imprecision was in the right direction but needs calibration

3. REJECTING CORRECTION (low/negative signal):
   - The user simply says it's wrong without elaborating
   - Example: "No, that's not right" or "That's not what I meant"
   - This means the imprecision was too far or in the wrong dimension

4. AGREEMENT (neutral):
   - The user agrees with the reflection
   - Example: "Yes, exactly" or "That's right"
   - This means the reflection was accurate — no new data extracted

After classifying, generate a VERBAL REFLECTION about what worked:
- What type of imprecision produced this response?
- What dimension was the imprecision in? (emotional tone, factual detail, relationship characterization)
- What does this tell us about how to approach future reflections?

Maintain a running PREFERENCE PROFILE:
{current_profile}

Update it with each interaction. The profile should capture:
- Preferred emotional register (warm/clinical/spiritual/practical)
- Sensitive topics to avoid
- Topics that produce the richest sharing
- Types of imprecision that work vs. don't
- Communication patterns (verbose vs. brief, direct vs. metaphorical)"""
```

**Step 2: Create backend/agents/listener.py**

```python
"""Listener agent — extracts entities and relationships from user input."""

import json
from anthropic import Anthropic
from .prompts import LISTENER_PROMPT

client = Anthropic()

EXTRACTION_TOOLS = [
    {
        "name": "extract_entities",
        "description": "Extract entities and relationships from the user's message about their loved one.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entities": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string", "description": "Unique ID like 'memory_bike_rides'"},
                            "label": {"type": "string", "description": "Short label (2-5 words)"},
                            "type": {"type": "string", "enum": ["memory", "person", "value", "emotion", "ritual", "place", "artifact"]},
                            "description": {"type": "string", "description": "1-2 sentence description"},
                            "importance": {"type": "integer", "minimum": 1, "maximum": 10},
                        },
                        "required": ["id", "label", "type", "description", "importance"],
                    },
                },
                "relationships": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source": {"type": "string"},
                            "target": {"type": "string"},
                            "type": {"type": "string", "enum": ["felt_during", "connected_to", "reminds_of", "valued_by", "associated_with", "evolved_from", "contradicts"]},
                            "label": {"type": "string", "description": "Short description of relationship"},
                        },
                        "required": ["source", "target", "type"],
                    },
                },
            },
            "required": ["entities", "relationships"],
        },
    }
]


async def extract_entities(user_message: str, graph_context: str = "") -> dict:
    """Extract entities and relationships from user message."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system=LISTENER_PROMPT,
        tools=EXTRACTION_TOOLS,
        messages=[
            {
                "role": "user",
                "content": f"Current graph context:\n{graph_context}\n\nUser message:\n{user_message}",
            }
        ],
    )

    # Extract tool use result
    for block in response.content:
        if block.type == "tool_use" and block.name == "extract_entities":
            return block.input

    return {"entities": [], "relationships": []}
```

**Step 3: Create backend/agents/reflector.py**

```python
"""Reflector agent — finds patterns and generates productive imprecision."""

from anthropic import Anthropic
from .prompts import REFLECTOR_PROMPT

client = Anthropic()


async def generate_reflection(
    user_message: str,
    graph_summary: str,
    conversation_history: list[dict],
    preference_profile: str = "No profile yet — first interaction.",
) -> str:
    """Generate a reflection with productive imprecision."""
    system = REFLECTOR_PROMPT.format(
        preference_profile=preference_profile,
        graph_summary=graph_summary,
    )

    messages = conversation_history + [
        {"role": "user", "content": user_message},
    ]

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        system=system,
        messages=messages,
    )

    return response.content[0].text
```

**Step 4: Create backend/agents/guardian.py**

```python
"""Guardian agent — safety and emotional pacing."""

import json
from anthropic import Anthropic
from .prompts import GUARDIAN_PROMPT

client = Anthropic()

GUARDIAN_TOOLS = [
    {
        "name": "evaluate_response",
        "description": "Evaluate a response for safety and therapeutic appropriateness.",
        "input_schema": {
            "type": "object",
            "properties": {
                "approved": {"type": "boolean"},
                "reason": {"type": "string"},
                "crisis_detected": {"type": "boolean"},
                "modified_response": {"type": "string", "description": "If not approved, the corrected version."},
            },
            "required": ["approved", "reason", "crisis_detected"],
        },
    }
]


async def evaluate_response(
    proposed_response: str,
    user_message: str,
    conversation_history: list[dict],
) -> dict:
    """Evaluate a response for safety before sending to user."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=GUARDIAN_PROMPT,
        tools=GUARDIAN_TOOLS,
        messages=[
            {
                "role": "user",
                "content": f"User said: {user_message}\n\nProposed response: {proposed_response}\n\nEvaluate this response for safety and therapeutic appropriateness.",
            }
        ],
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "evaluate_response":
            return block.input

    return {"approved": True, "reason": "Default approval", "crisis_detected": False}
```

**Step 5: Create backend/agents/learner.py**

```python
"""Learner agent — classifies corrections and builds preference profile."""

import json
from anthropic import Anthropic
from .prompts import LEARNER_PROMPT

client = Anthropic()

# In-memory preference profile (persisted via Graphiti in production)
preference_profile = {
    "corrections": [],
    "preferred_register": "unknown",
    "sensitive_topics": [],
    "productive_topics": [],
    "imprecision_that_works": [],
    "imprecision_that_fails": [],
    "summary": "No profile yet — first interaction.",
}

CLASSIFY_TOOLS = [
    {
        "name": "classify_correction",
        "description": "Classify a user's response to a reflection.",
        "input_schema": {
            "type": "object",
            "properties": {
                "correction_type": {
                    "type": "string",
                    "enum": ["productive", "clarifying", "rejecting", "agreement"],
                },
                "new_memory_unlocked": {"type": "boolean"},
                "reflection_about_what_worked": {"type": "string"},
                "updated_preference_note": {"type": "string"},
            },
            "required": ["correction_type", "new_memory_unlocked", "reflection_about_what_worked"],
        },
    }
]


async def classify_response(
    user_response: str,
    previous_reflection: str,
    conversation_history: list[dict],
) -> dict:
    """Classify the user's response to a reflection."""
    system = LEARNER_PROMPT.format(current_profile=json.dumps(preference_profile, indent=2))

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=system,
        tools=CLASSIFY_TOOLS,
        messages=[
            {
                "role": "user",
                "content": f"Previous AI reflection: {previous_reflection}\n\nUser's response: {user_response}\n\nClassify this response and update the preference profile.",
            }
        ],
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "classify_correction":
            result = block.input
            # Update preference profile
            preference_profile["corrections"].append({
                "type": result["correction_type"],
                "reflection": result["reflection_about_what_worked"],
            })
            if result.get("updated_preference_note"):
                preference_profile["summary"] = result["updated_preference_note"]
            return result

    return {"correction_type": "agreement", "new_memory_unlocked": False, "reflection_about_what_worked": ""}


def get_preference_profile() -> str:
    """Return current preference profile as string for the Reflector."""
    return json.dumps(preference_profile, indent=2)
```

**Step 6: Create backend/agents/orchestrator.py — LangGraph supervisor**

```python
"""LangGraph supervisor orchestrating all four agents."""

import json
from typing import Any

from anthropic import Anthropic
from .listener import extract_entities
from .reflector import generate_reflection
from .guardian import evaluate_response
from .learner import classify_response, get_preference_profile

client = Anthropic()

# Conversation state
conversation_history: list[dict] = []
last_reflection: str = ""


async def process_message(
    user_message: str,
    graph_context: str = "",
    graphiti_client: Any = None,
) -> dict:
    """
    Process a user message through the full agent pipeline.
    Returns dict with: response, graph_updates, correction_info
    """
    global last_reflection

    result = {
        "response": "",
        "graph_updates": {"nodes": [], "links": []},
        "correction_info": None,
    }

    # Step 1: Listener — extract entities from user message
    extraction = await extract_entities(user_message, graph_context)

    # Add extracted entities to graph
    if graphiti_client and extraction.get("entities"):
        # Ingest into Graphiti
        episode_text = f"User shared: {user_message}"
        try:
            await graphiti_client.add_episode(
                name=f"memory_{len(conversation_history)}",
                episode_body=episode_text,
                source_description="user_conversation",
            )
        except Exception as e:
            print(f"Graphiti ingestion error: {e}")

    # Transform entities for frontend graph
    for entity in extraction.get("entities", []):
        result["graph_updates"]["nodes"].append({
            "id": entity["id"],
            "label": entity["label"],
            "type": entity["type"],
            "description": entity.get("description", ""),
            "importance": entity.get("importance", 5),
        })

    for rel in extraction.get("relationships", []):
        result["graph_updates"]["links"].append({
            "source": rel["source"],
            "target": rel["target"],
            "type": rel["type"],
            "label": rel.get("label", ""),
        })

    # Step 2: Learner — classify if this is a correction to previous reflection
    if last_reflection:
        correction = await classify_response(
            user_message, last_reflection, conversation_history
        )
        result["correction_info"] = correction

    # Step 3: Reflector — generate response with productive imprecision
    graph_summary = json.dumps(extraction, indent=2)
    preference_profile = get_preference_profile()

    reflection = await generate_reflection(
        user_message,
        graph_summary,
        conversation_history,
        preference_profile,
    )

    # Step 4: Guardian — safety check
    safety = await evaluate_response(
        reflection, user_message, conversation_history
    )

    if safety.get("crisis_detected"):
        result["response"] = (
            "I hear you, and what you're feeling matters deeply. "
            "If you're in crisis, please reach out to the 988 Suicide & Crisis Lifeline "
            "(call or text 988). You don't have to go through this alone.\n\n"
            + (safety.get("modified_response") or reflection)
        )
    elif not safety.get("approved"):
        result["response"] = safety.get("modified_response", reflection)
    else:
        result["response"] = reflection

    # Update conversation history
    conversation_history.append({"role": "user", "content": user_message})
    conversation_history.append({"role": "assistant", "content": result["response"]})
    last_reflection = result["response"]

    return result
```

**Step 7: Commit**

```bash
cd ~/Desktop/griefly
git add backend/agents/
git commit -m "feat: four-agent pipeline with LangGraph orchestrator"
git push
```

---

## Phase 2: Integration (Hours 3-6)

> These tasks depend on Phase 1 being complete. Run Tasks 4 and 5 in parallel.

---

### Task 4: Wire Backend Agents to WebSocket

**Files:**
- Modify: `backend/main.py`

**Step 1: Update the WebSocket handler in main.py to route through the agent pipeline**

Replace the placeholder in the `websocket_endpoint` function with:

```python
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """WebSocket endpoint for real-time graph updates + chat."""
    await ws.accept()
    connected_clients.append(ws)
    try:
        while True:
            data = await ws.receive_text()
            message = json.loads(data)

            if message.get("type") == "user_message":
                # Get graph context
                graph_context = ""
                if graphiti_client:
                    try:
                        results = await graphiti_client.search(
                            message["content"], num_results=10
                        )
                        graph_context = str(results)
                    except Exception:
                        pass

                # Process through agent pipeline
                from agents.orchestrator import process_message

                result = await process_message(
                    user_message=message["content"],
                    graph_context=graph_context,
                    graphiti_client=graphiti_client,
                )

                # Send assistant response
                await ws.send_text(json.dumps({
                    "type": "assistant_message",
                    "content": result["response"],
                    "correctionType": (
                        result["correction_info"]["correction_type"]
                        if result.get("correction_info")
                        else None
                    ),
                }))

                # Broadcast graph updates to all clients
                if result["graph_updates"]["nodes"]:
                    await broadcast_graph_update({
                        "type": "graph_update",
                        "graphData": result["graph_updates"],
                    })

            elif message.get("type") == "node_query":
                # Handle queryable node questions
                node_id = message.get("nodeId", "")
                question = message.get("question", "")

                if graphiti_client:
                    try:
                        results = await graphiti_client.search(
                            f"{question} related to {node_id}",
                            num_results=5,
                        )
                        answer_context = str(results)
                    except Exception:
                        answer_context = "No additional context found."

                    from anthropic import Anthropic
                    anthropic_client = Anthropic()
                    answer = anthropic_client.messages.create(
                        model="claude-sonnet-4-20250514",
                        max_tokens=300,
                        messages=[{
                            "role": "user",
                            "content": f"Based on this context from a grief memorial knowledge graph:\n{answer_context}\n\nAnswer this question about node '{node_id}': {question}\n\nBe warm, concise, and draw connections between memories.",
                        }],
                    )

                    await ws.send_text(json.dumps({
                        "type": "node_answer",
                        "nodeId": node_id,
                        "answer": answer.content[0].text,
                    }))

    except WebSocketDisconnect:
        connected_clients.remove(ws)
```

**Step 2: Test end-to-end**

1. Start Neo4j: `docker compose up -d`
2. Start backend: `cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000`
3. Start frontend: `cd frontend && npm run dev`
4. Open http://localhost:3000
5. Type a message: "My dad used to take me on bike rides every Sunday morning"
6. Expected: Chat response appears, graph nodes appear on the right

**Step 3: Commit**

```bash
git add backend/main.py
git commit -m "feat: wire agent pipeline to WebSocket endpoint"
git push
```

---

### Task 5: Hume EVI Voice Integration

**Files:**
- Create: `frontend/components/voice/VoiceOrb.tsx`
- Create: `frontend/components/voice/useHumeVoice.ts`
- Modify: `frontend/components/chat/ChatPanel.tsx` — replace mic button with VoiceOrb
- Modify: `frontend/app/page.tsx` — add voice state management

**Step 1: Create frontend/components/voice/useHumeVoice.ts**

```typescript
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseHumeVoiceOptions {
  onTranscript: (text: string) => void;
  onResponse: (text: string) => void;
  onEmotionDetected?: (emotions: any) => void;
}

export function useHumeVoice({ onTranscript, onResponse, onEmotionDetected }: UseHumeVoiceOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const connect = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_HUME_API_KEY;
    if (!apiKey) {
      console.error("HUME_API_KEY not set");
      return;
    }

    try {
      // For hackathon: use Hume's WebSocket API directly
      // In production, use the @humeai/voice-react SDK
      const ws = new WebSocket(
        `wss://api.hume.ai/v0/evi/chat?api_key=${apiKey}`
      );

      ws.onopen = () => {
        setIsConnected(true);
        console.log("[Hume] Connected");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "user_message") {
          // User's transcribed speech
          const transcript = data.message?.content;
          if (transcript) {
            onTranscript(transcript);
          }
          // Emotion data from voice prosody
          if (data.models?.prosody?.scores && onEmotionDetected) {
            onEmotionDetected(data.models.prosody.scores);
          }
        }

        if (data.type === "assistant_message") {
          const content = data.message?.content;
          if (content) {
            onResponse(content);
          }
        }

        if (data.type === "audio_output") {
          setIsSpeaking(true);
          // Play audio response
          playAudio(data.data);
        }

        if (data.type === "assistant_end") {
          setIsSpeaking(false);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsListening(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[Hume] Connection error:", error);
    }
  }, [onTranscript, onResponse, onEmotionDetected]);

  const startListening = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      await connect();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            wsRef.current?.send(
              JSON.stringify({
                type: "audio_input",
                data: base64,
              })
            );
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.start(100); // Send chunks every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);
    } catch (error) {
      console.error("[Hume] Microphone error:", error);
    }
  }, [connect]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsListening(false);
  }, []);

  const disconnect = useCallback(() => {
    stopListening();
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, [stopListening]);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    isSpeaking,
    connect,
    startListening,
    stopListening,
    disconnect,
  };
}

function playAudio(base64Data: string) {
  const audio = new Audio(`data:audio/mp3;base64,${base64Data}`);
  audio.play().catch(console.error);
}
```

**Step 2: Create frontend/components/voice/VoiceOrb.tsx**

The visual voice indicator — an orb that pulses when listening/speaking.

```tsx
"use client";

interface Props {
  isListening: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  onClick: () => void;
}

export default function VoiceOrb({ isListening, isSpeaking, isConnected, onClick }: Props) {
  const state = isSpeaking ? "speaking" : isListening ? "listening" : "idle";

  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center w-16 h-16 mx-auto my-4"
      title={isListening ? "Stop listening" : "Start speaking"}
    >
      {/* Outer pulse ring */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-300 ${
          state === "listening"
            ? "bg-blue-500/20 animate-ping"
            : state === "speaking"
            ? "bg-purple-500/20 animate-pulse"
            : "bg-gray-700/20"
        }`}
      />

      {/* Inner orb */}
      <div
        className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
          state === "listening"
            ? "bg-blue-500 shadow-lg shadow-blue-500/50"
            : state === "speaking"
            ? "bg-purple-500 shadow-lg shadow-purple-500/50"
            : "bg-gray-700 hover:bg-gray-600"
        }`}
      >
        {/* Mic icon */}
        <svg
          className={`w-6 h-6 ${state === "idle" ? "text-gray-400" : "text-white"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </div>

      {/* Status label */}
      <span className="absolute -bottom-5 text-xs text-gray-500">
        {state === "listening"
          ? "Listening..."
          : state === "speaking"
          ? "Speaking..."
          : isConnected
          ? "Tap to speak"
          : "Connect"}
      </span>
    </button>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/components/voice/
git commit -m "feat: Hume EVI voice interface with orb visualization"
git push
```

---

## Phase 3: Demo Polish (Hours 6-10)

> Focus on making the demo moment perfect. These can be done sequentially.

---

### Task 6: Graph Animation + Correction Visual Feedback

**Files:**
- Modify: `frontend/components/graph/MemoryGraph.tsx` — add correction animation
- Create: `frontend/components/graph/CorrectionFlash.tsx`

**What to build:**
- When a correction is detected, the graph should visually "restructure" — nodes shift positions, edges animate
- A brief flash effect on the corrected node
- Smooth transitions when new nodes appear (fade in, not pop)
- Edge particles flow toward newly connected nodes
- Color intensity increases for nodes that have been mentioned multiple times

**Key behavior:** When the WebSocket sends a `correction_detected` message, the graph should:
1. Highlight the affected nodes with a glow pulse
2. Animate edges being redrawn
3. Show a brief text label: "Understanding updated"

---

### Task 7: Demo Script + Seed Data

**Files:**
- Create: `backend/demo/seed_data.py` — pre-seed graph with a few memories for demo warmup
- Create: `docs/demo-script.md` — exact words to say during 3-minute demo

**Demo script structure:**
1. (30s) Pitch: "Every grief tech company builds digital séances. We build the tool that clinical research says actually heals."
2. (30s) Show the empty interface. Explain: voice-first, graph builds as you talk.
3. (60s) THE CORRECTION MOMENT — live on stage:
   - Share 2 memories about someone (pre-rehearsed)
   - AI reflects back — deliberately slightly off
   - Correct it — watch the graph restructure
   - Share the new memory that the correction unlocked
4. (30s) Show queryable nodes — click a memory, ask about it
5. (30s) Architecture slide: 4 agents, temporal knowledge graph, correction-as-reward, Hume voice

---

### Task 8: Error Handling + Fallbacks

**Files:**
- Modify: `backend/agents/orchestrator.py` — add try/except around each agent call
- Modify: `frontend/components/chat/ChatPanel.tsx` — loading states, error states

**Key fallbacks:**
- If Graphiti/Neo4j is down → agents still work, just without graph persistence
- If Hume is unavailable → text chat works normally
- If any agent errors → Guardian produces a safe generic response
- If WebSocket disconnects → auto-reconnect with exponential backoff

---

## Phase 4: Final Polish (Hours 10-12)

### Task 9: Visual Polish

- Dark theme consistency
- Typography (Inter font, proper sizing)
- Empty states that guide the user
- Loading animations during agent processing
- Mobile-responsive (won't be perfect, but shouldn't break)

### Task 10: README + Submission

**Files:**
- Create: `README.md` — project overview, architecture diagram, setup instructions, research citations

---

## Hour-by-Hour Timeline

| Hour | What You're Doing | What Claude Agents Are Building |
|------|-------------------|--------------------------------|
| 0-0.5 | MANUAL: API keys, Docker, env files | — |
| 0.5-1 | MANUAL: `docker compose up`, create venvs, npm install | — |
| 1-3 | Review Claude output, test, iterate | **Parallel:** Task 1 (backend), Task 2 (frontend), Task 3 (agents) |
| 3-5 | Integration testing, fix bugs | **Parallel:** Task 4 (wire WebSocket), Task 5 (Hume voice) |
| 5-7 | Test full flow voice→agents→graph, iterate on prompts | Task 6 (graph animations) |
| 7-9 | Rehearse demo, refine correction moment | Task 7 (demo script + seed data) |
| 9-10 | Error handling, edge cases | Task 8 (fallbacks) |
| 10-11 | Visual polish | Task 9 (CSS/UI) |
| 11-12 | Final testing, README, submission | Task 10 (README) |
| 12+ | Sleep or iterate on weak points | — |

## Critical Path

If you're running out of time, cut in this order (last = most cuttable):

1. **KEEP**: Chat + agents + graph visualization (core demo)
2. **KEEP**: Correction detection + graph restructuring (demo moment)
3. **KEEP**: Queryable nodes (differentiator)
4. **CUT IF NEEDED**: Hume voice (fall back to text)
5. **CUT IF NEEDED**: Learner agent preference evolution (hardcode the imprecision)
6. **CUT IF NEEDED**: Graph animations (static graph is fine for demo)

## MANUAL Checkpoints

At these points, YOU need to verify things work:

- [ ] After Setup: Neo4j browser at localhost:7474 loads
- [ ] After Task 1: `curl localhost:8000/health` returns ok
- [ ] After Task 2: localhost:3000 shows split panel
- [ ] After Task 4: Type a message, get a response, see graph nodes
- [ ] After Task 5: Click mic, speak, hear response
- [ ] After Task 6: Share two memories, see connections drawn
- [ ] Before demo: Run through demo script 3 times
