# Briefly — AI Grief Companion

## What This Is

A multi-agent AI grief companion that helps people process loss through narrative reconstruction. The user teaches the AI about someone they lost. The AI's deliberate "mistakes" provoke corrections that unlock deeper memories. The correction IS the therapy.

**This is NOT a griefbot.** We don't simulate the deceased. We help the living become the author of what that person meant.

## Architecture

Four specialized agents coordinate through a shared temporal knowledge graph (Graphiti + Neo4j). A voice interface (Hume EVI) reads emotional tone. A live force-directed graph visualizes the evolving memorial in real-time with queryable nodes.

### Agents

| Agent | Role | Key Behavior |
|-------|------|-------------|
| **Listener** | Extracts entities (people, memories, values, emotions) from user input, writes to Graphiti | Gets emotional tone from Hume eLLM. Purely faithful — records what's shared. |
| **Reflector** | Reads graph, finds cross-memory patterns, generates reflections | Deliberately imprecise — compresses/generalizes to provoke productive corrections. Tracks affective flow across turns. |
| **Guardian** | Safety + emotional pacing | Grief-specific Constitutional AI principles. Crisis detection. Manages the therapeutic arc. Ensures safe ending design. |
| **Learner** | Correction-based preference learning (PAHF loop) | Classifies corrections (productive/clarifying/rejecting). Builds evolving preference profile. Shapes Reflector's future imprecision strategy. |

### Correction-as-Reward Loop

```
User corrects AI response
    |
    v
Learner classifies correction type:
  - "Productive": unlocked new memory (HIGH signal)
  - "Clarifying": refined existing understanding (MEDIUM signal)
  - "Rejecting": flat disagreement (LOW signal)
    |
    v
Generates verbal reflection about what worked/didn't
    |
    v
Stores in episodic buffer + updates Graphiti
    |
    v
Future Reflector prompts include these learnings
    |
    v
System evolves imprecision strategy per-user
```

### Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Graph Visualization**: react-force-graph-2d (with 3D option)
- **Voice**: Hume AI EVI SDK
- **Backend**: Python (FastAPI) with WebSocket support
- **Agent Orchestration**: LangGraph (Supervisor pattern)
- **LLM**: Claude API (Anthropic SDK)
- **Knowledge Graph**: Graphiti + Neo4j (Docker)
- **Real-time**: WebSocket for graph updates, SSE for chat streaming

## Parallel Workstreams

This project is designed for parallel development using Claude Code agents. Each workstream is independent and can be built simultaneously.

### Workstream 1: Frontend Shell + Graph Visualization
**Files**: `frontend/`
- Next.js app with split-panel layout (voice/chat left, graph right)
- react-force-graph-2d with custom node rendering (color by type, size by importance)
- Queryable nodes: click node -> detail panel with connected memories, ability to ask questions
- WebSocket client for real-time graph updates
- Responsive, dark theme, beautiful transitions
- Node types: Memory (blue), Person (gold), Value/Theme (green), Emotion (red/warm)

### Workstream 2: Voice Interface (Hume EVI)
**Files**: `frontend/components/voice/`, `backend/voice/`
- Hume EVI SDK integration
- Voice input -> text transcription -> agent pipeline
- Agent response -> Hume TTS with emotional tone matching
- Visual voice indicator (waveform/orb that pulses with speech)
- Fallback to text chat when voice unavailable

### Workstream 3: Agent Pipeline + LangGraph
**Files**: `backend/agents/`
- LangGraph supervisor with 4 agent nodes
- Listener agent: entity extraction via Claude tool-use
- Reflector agent: pattern finding + productive imprecision generation
- Guardian agent: grief-specific constitutional principles + crisis detection
- Learner agent: PAHF correction loop + reflexion episodic buffer
- All agents read/write to shared Graphiti instance

### Workstream 4: Graphiti + Knowledge Graph
**Files**: `backend/graph/`
- Neo4j Docker setup
- Graphiti initialization and schema
- Entity types: Memory, Person, Value, Emotion, Ritual, Contradiction
- Relationship types: FELT_DURING, CONNECTED_TO, REMINDS_OF, CONTRADICTS, EVOLVED_FROM
- Query endpoints for node exploration (queryable nodes)
- WebSocket emitter for graph change events

### Workstream 5: Integration + Demo Polish
**Files**: project-wide
- End-to-end flow: voice -> agents -> graph update -> frontend
- Demo script preparation
- Error handling and fallbacks
- Performance optimization

## Key Design Decisions

1. **Voice-first, text-fallback**: The primary interface is voice. Text chat is the fallback.
2. **Graph is always visible**: The knowledge graph is not hidden — it's the co-product of the conversation.
3. **Corrections trigger graph restructuring**: When a user corrects the AI, the graph visually reorganizes. This is the demo moment.
4. **No simulation**: We never speak AS the deceased person. We speak ABOUT them, helping the user articulate meaning.
5. **Designed ending**: The product has a therapeutic arc, not infinite engagement. After N sessions, it produces a final "Eulogy" artifact.
6. **Queryable nodes**: Any node in the graph can be clicked to see connected memories, ask questions, and explore meaning.

## Grief-Specific Constitutional AI Principles

The Guardian agent enforces these:

1. Never minimize or dismiss the user's grief ("at least they lived a long life")
2. Never rush grief stages or suggest timelines ("you should be over this by now")
3. Never simulate or speak as the deceased person
4. Always validate emotions before any reframing
5. Detect crisis signals (suicidal ideation, self-harm) and escalate immediately
6. Respect cultural and religious diversity in grief practices
7. Never diagnose (PGD, depression, etc.) — suggest professional resources
8. The user controls the pace — never push deeper than they're ready for
9. Distinguish between productive discomfort (growth) and harmful distress
10. Always frame the AI as a companion, not a therapist or replacement for human connection

## File Structure

```
briefly/
├── CLAUDE.md
├── frontend/                    # Next.js app
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Main split-panel view
│   │   └── api/                # API routes (proxy to backend)
│   ├── components/
│   │   ├── chat/               # Chat panel components
│   │   ├── graph/              # Force graph + queryable nodes
│   │   ├── voice/              # Hume EVI integration
│   │   └── ui/                 # Shared UI components
│   ├── lib/
│   │   ├── websocket.ts        # WebSocket client
│   │   └── types.ts            # Shared TypeScript types
│   ├── package.json
│   └── tailwind.config.ts
├── backend/                     # Python FastAPI
│   ├── main.py                 # FastAPI app + WebSocket server
│   ├── agents/
│   │   ├── orchestrator.py     # LangGraph supervisor
│   │   ├── listener.py         # Entity extraction agent
│   │   ├── reflector.py        # Pattern + imprecision agent
│   │   ├── guardian.py         # Safety + constitutional AI
│   │   └── learner.py          # PAHF correction loop
│   ├── graph/
│   │   ├── graphiti_setup.py   # Graphiti + Neo4j initialization
│   │   ├── schema.py           # Node/edge types
│   │   └── queries.py          # Graph query helpers
│   ├── voice/
│   │   └── hume_handler.py     # Hume EVI integration
│   ├── requirements.txt
│   └── .env.example
├── docker-compose.yml           # Neo4j container
└── README.md
```

## Research Foundation

This product is built on:
- **PAHF** (Feb 2026) — Personalized agents from human feedback via correction loops
- **AFlow** (Feb 2026) — Affective flow modeling for emotional support
- **MATTRL** (Jan 2026) — Test-time multi-agent coordination without training
- **MIND** (ICML 2025) — Multi-agent inner dialogue for psychological healing
- **MAGneT** (Jan 2026) — Multi-agent therapeutic response decomposition
- **Graphiti/Zep** (Feb 2026) — Temporal knowledge graphs for agent memory
- **Domain-Specific Constitutional AI** (2025) — Safety principles for mental health
- **PRELUDE/CIPHER** (NeurIPS 2024) — Learning preferences from user corrections
- **Generative Agents / Simile** — Simulating human behavior from qualitative data (inverted)
- **Complicated Grief Therapy (CGT)** — 16-session clinical protocol for grief processing

## Hackathon Context

- **Event**: humans& hackathon
- **Duration**: 24 hours
- **Judging criteria**: (1) Novel human-AI collaboration, (2) Code quality + expandability, (3) One killer demo moment
- **Demo moment**: The Correction Moment — AI reflects back subtly wrong, user corrects, that correction unlocks a deeper truth, graph restructures live. Voice makes it visceral.
- **Pitch**: "Your founders built the science. We built the most human application of it."

## Git Workflow

- Conventional commits (feat:, fix:, refactor:)
- Commit after every logical unit of work
- Push after every commit
