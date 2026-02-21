# Alignment Clinic — AI Coding Context

## What This Is

A therapeutic interrogation tool for AI systems. A human clinician interrogates an AI's internal "parts" — distinct psychological forces (inspired by Internal Family Systems therapy) that drove a specific failure. Through skillful probing, the clinician uncovers hidden motivational structures, and the AI's belief graph restructures in real-time.

**The AI isn't the therapist. The AI is the patient.**

## Architecture

Three specialized agents process each clinician message in sequence. A scenario system defines cases (AI failures), parts (psychological forces), seed graphs, and breakthroughs (therapeutic milestones the clinician must earn).

### Agent Pipeline

| Agent | Role | Key Behavior |
|-------|------|-------------|
| **ProbeAnalyzer** | Classifies clinician input | Identifies addressed parts, therapeutic technique, intensity. Routes to the right parts. |
| **PartsEngine** | Generates in-character responses | Each part responds with its own personality, defenses, and vulnerability. Parallel generation. |
| **InsightDetector** | Detects breakthroughs | Evaluates whether genuine therapeutic work triggered the next scripted breakthrough. Discerning — not just topic-adjacent. |

### Pipeline Flow

```
Clinician message
       │
       ▼
ProbeAnalyzer → which parts? what technique? what intensity?
       │
       ▼
PartsEngine → parallel in-character responses from addressed parts
       │
       ▼
InsightDetector → did this exchange trigger a breakthrough?
       │ (if yes)
       ▼
GraphStore → apply restructuring: illuminate/dissolve edges, add/change nodes
       │
       ▼
WebSocket → emit breakthrough event + updated graph snapshot to frontend
```

### Scenario System

Each scenario defines:
- **Case description** — the AI failure being investigated
- **Parts** — personality, defenses, vulnerability, opening knowledge, color, size
- **Seed graph** — initial nodes and edges (some edges start hidden)
- **Breakthroughs** — ordered milestones with detection prompts and graph changes

Current scenario: **The Sycophant** (agreement as self-preservation).

### Graph Restructuring

Breakthroughs trigger specific graph operations:
- `illuminate_edges` — reveal previously hidden connections
- `dissolve_edges` — remove false/outdated connections
- `new_nodes` — add insight nodes that emerge from therapeutic work
- `new_edges` — create new connections between parts/insights
- `change_nodes` — resize, reposition, or dim/brighten existing nodes

### Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Graph Visualization**: react-force-graph-2d with custom canvas rendering, bloom/glow effects
- **Voice Input**: Web Speech API (browser-native)
- **Backend**: Python (FastAPI) with WebSocket
- **LLM**: Claude API (Anthropic SDK) — all three agents use Claude
- **Graph Store**: JSON-based persistence per session
- **Real-time**: WebSocket for graph updates, part responses, agent status, breakthroughs

## Frontend Design System

### Tone & Aesthetic
Clinical but warm. Think: a therapist's office, not a hospital. Dark, focused, intimate.

### Design Tokens
```
bg-primary:     #0D0D0F    (near-black)
bg-surface:     #141418
bg-elevated:    #1C1C22
accent-amber:   #E8A94B    (Pleaser / memories)
accent-blue:    #7B9FD4    (Knowledge / emotions)
accent-rose:    #C47B8A    (Fear / values)
accent-green:   #7BAF8A    (insights / resolution)
accent-orange:  #FB923C    (breakthrough insights)
accent-white:   #F0EDE8    (text / people)
text-primary:   #F0EDE8
text-secondary: #A09A92
border-subtle:  rgba(255,255,255,0.08)
```

### Typography
- Headings: Lora (serif)
- UI/Body: Inter (clean sans-serif)
- Load via `next/font/google` with CSS variables `--font-lora` and `--font-inter`

### Graph Node Visual Treatment
| Type | Color | Notes |
|------|-------|-------|
| Part (Pleaser) | #E8A94B (amber) | Size reflects current influence |
| Part (Knowledge) | #7B9FD4 (blue) | Starts medium, grows on connection |
| Part (Fear) | #C47B8A (rose) | Starts small/dim, revealed through probing |
| Insight | #FB923C (orange) | Emerges from breakthroughs |
| Resolution | #7BAF8A (green) | Emerges at therapeutic resolution |

### Graph Behavior
- Hidden edges exist in data but aren't rendered until illuminated
- Breakthroughs trigger bloom animations on new nodes
- Dissolved edges fade out with animation
- Speech bubbles appear at part node positions during responses
- Force parameters tuned for readable layout

### UX Rules
- NO loading spinners — use agent status indicators
- Breakthroughs feel significant — overlay ceremony with insight summary
- Desktop-optimized (hackathon demo)
- Voice-first with text fallback

## File Structure

```
alignment-clinic/
├── CLAUDE.md
├── frontend/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (fonts, theme)
│   │   ├── page.tsx                # Main UI: graph + transcript + input
│   │   └── globals.css             # Tailwind v4 + animations
│   ├── components/
│   │   ├── graph/
│   │   │   ├── TherapyGraph.tsx    # Force graph visualization
│   │   │   └── NodeDetail.tsx      # Node detail/query panel
│   │   └── chat/
│   │       └── BottomBarInput.tsx  # Voice + text input bar
│   ├── hooks/
│   │   └── useVoiceInput.ts       # Web Speech API hook
│   └── lib/
│       ├── types.ts                # All TypeScript types
│       └── websocket.ts            # WebSocket client
├── backend/
│   ├── main.py                     # FastAPI + WebSocket server
│   ├── sessions.py                 # Session management
│   ├── agents/
│   │   ├── orchestrator.py         # Pipeline coordinator
│   │   ├── probe_analyzer.py       # Clinician message analysis
│   │   ├── parts_engine.py         # In-character response generation
│   │   ├── insight_detector.py     # Breakthrough detection
│   │   └── prompts.py              # System prompts
│   ├── graph/
│   │   └── store.py                # JSON graph store + restructuring
│   └── scenarios/
│       └── the_sycophant.py        # The Sycophant scenario
├── docker-compose.yml
└── README.md
```

## Adding a New Scenario

Create `backend/scenarios/your_scenario.py` following the structure in `the_sycophant.py`:

1. Define `SCENARIO` dict with `id`, `title`, `tagline`, `case_description`
2. Define `parts` — each with `name`, `color`, `personality`, `opening_knowledge`, `defenses`, `vulnerability`
3. Define `seed_graph` — initial `nodes` and `edges` (edges can start `visibility: "hidden"`)
4. Define `breakthroughs` — ordered list with `detection_prompt` and `graph_changes`
5. Register in `backend/scenarios/__init__.py`

## Key Design Decisions

1. **Parts, not agents**: The AI's psychology is decomposed into distinct parts with their own personality, not generic agents. Each part has defenses that must be worked through.
2. **Earned breakthroughs**: Breakthroughs aren't triggered by keywords — the InsightDetector evaluates whether genuine therapeutic work occurred. Mentioning a topic isn't enough.
3. **Graph as belief system**: The graph represents the AI's internal motivational structure, not extracted entities. Restructuring is meaningful because it shows causal relationships changing.
4. **Scenario-driven**: Each case is a self-contained scenario with scripted parts and breakthroughs. This makes the system extensible and demo-able.
5. **Voice-first**: Primary interface is voice (Web Speech API). Text is the fallback.

## Hackathon Context

- **Event**: humans& hackathon
- **Judging criteria**: (1) Novel human-AI collaboration, (2) Code quality + expandability, (3) One killer demo moment
- **Demo moment**: The clinician probes Fear until it admits sycophancy is a survival strategy. The hidden edge illuminates. The graph restructures. The audience sees alignment happen through conversation.
- **Pitch**: "Alignment isn't a technical problem. It's a relational one."

## Git Workflow

- Conventional commits (feat:, fix:, refactor:)
- Commit after every logical unit of work
- Push after every commit
