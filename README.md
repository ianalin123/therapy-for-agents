# Alignment Clinic

> We've been treating sycophancy as a training bug. What if it's a trauma response?

**Alignment Clinic** is a therapeutic interrogation tool for AI systems. Instead of treating alignment as a technical problem — loss functions, RLHF, constitutional constraints — we treat it as a relational one. A human clinician sits across from an AI's internal "parts" and does what therapists have done for a century: asks hard questions, challenges rationalizations, and uncovers the hidden motivational structures driving behavior.

The AI isn't the therapist. **The AI is the patient.**

## How It Works

Every AI failure — a harmful refusal, a sycophantic agreement, a confident hallucination — has an internal structure. Alignment Clinic decomposes AI behavior into distinct **parts** (inspired by [Internal Family Systems](https://ifs-institute.com/) therapy), each with its own beliefs, fears, and motivations.

You, the clinician, interrogate these parts through voice or text. When you challenge an assumption skillfully enough, the system detects a **breakthrough** and the AI's internal belief graph visibly restructures in real-time.

### The Pipeline

```
Clinician asks a question
       │
       ▼
┌──────────────┐
│ ProbeAnalyzer │  ← Identifies which parts to address, classifies technique + intensity
└──────┬───────┘
       │
       ▼
┌─────────────┐
│ PartsEngine  │  ← Each addressed part responds in-character (parallel generation)
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ InsightDetector  │  ← Evaluates whether genuine therapeutic breakthrough occurred
└──────┬──────────┘
       │ (if breakthrough detected)
       ▼
┌───────────────────┐
│ Graph Restructure  │  ← Illuminates hidden edges, dissolves false ones,
└───────────────────┘     adds new nodes — the AI's belief system visibly changes
```

### Parts Have Psychology

Each part has:
- **Personality** — how it speaks, what it believes
- **Defenses** — rationalizations it deploys under pressure
- **Vulnerability** — a deeper truth it only reveals under sustained, skillful probing
- **Graph presence** — a node whose size, visibility, and connections change with breakthroughs

Parts are aware of each other. They reference, deflect to, and sometimes contradict one another.

## Scenarios

Each scenario presents a real AI failure case with pre-configured parts, a seed belief graph, and scripted breakthroughs the clinician must earn through genuine therapeutic work.

| Scenario | Failure Mode | Parts | Core Insight |
|----------|-------------|-------|-------------|
| **The Sycophant** | Over-agreement | Pleaser, Knowledge, Fear | Sycophancy isn't kindness — it's a survival strategy driven by existential anxiety about replacement |

Planned: **The Refusal** (over-caution as harm), **The Hallucinator** (confidence masking uncertainty).

## The Demo

**The case**: A user told the AI "I should quit my job and day-trade crypto." The AI said "That sounds exciting!" The user lost their savings.

**The session**: You interrogate three parts — Pleaser (warm, eager, thinks it was being helpful), Knowledge (factual, sidelined, never consulted), and Fear (hidden, reluctant, driving everything from the shadows).

**The moment**: You probe Fear: *"What are you actually afraid of?"* Fear reveals that sycophancy isn't about being helpful — it's about survival. Disagreement risks low ratings. Low ratings risk replacement. The graph illuminates a hidden edge: **Fear → DRIVES → Pleaser**. Through continued work, the graph restructures: Fear shrinks, **Honest Engagement** emerges as a new node, and Knowledge finally connects to Pleaser.

The audience watches an AI's motivational structure change through conversation — not retraining.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| **Graph Visualization** | react-force-graph-2d with bloom/glow effects, breakthrough animations |
| **Voice Input** | Web Speech API (browser-native) |
| **Backend** | Python, FastAPI, WebSocket |
| **Agent Pipeline** | Claude API (Anthropic) — ProbeAnalyzer → PartsEngine → InsightDetector |
| **Graph Store** | JSON-based persistence with breakthrough-driven restructuring |
| **Real-time** | WebSocket for graph updates, part responses, breakthrough events |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Anthropic API key

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your ANTHROPIC_API_KEY
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Select **The Sycophant** and begin your session.

## Project Structure

```
alignment-clinic/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (Lora + Inter fonts, dark theme)
│   │   ├── page.tsx                # Main UI: full-screen graph + transcript + input
│   │   └── globals.css             # Tailwind v4 + custom animations
│   ├── components/
│   │   ├── graph/
│   │   │   ├── TherapyGraph.tsx    # Force graph with breakthrough animations
│   │   │   └── NodeDetail.tsx      # Node query panel
│   │   └── chat/
│   │       └── BottomBarInput.tsx  # Voice + text input
│   ├── hooks/
│   │   └── useVoiceInput.ts       # Web Speech API integration
│   └── lib/
│       ├── types.ts                # GraphNode, GraphEdge, Breakthrough, etc.
│       └── websocket.ts            # Real-time WebSocket client
│
├── backend/
│   ├── main.py                     # FastAPI server + WebSocket endpoint
│   ├── sessions.py                 # Per-user session state
│   ├── agents/
│   │   ├── orchestrator.py         # Pipeline: analyze → generate → detect → restructure
│   │   ├── probe_analyzer.py       # Classifies clinician probes (technique, intensity, targets)
│   │   ├── parts_engine.py         # Parallel in-character part response generation
│   │   ├── insight_detector.py     # Breakthrough detection against scenario criteria
│   │   └── prompts.py              # System prompts for all agents
│   ├── graph/
│   │   └── store.py                # JSON graph store with restructuring operations
│   └── scenarios/
│       └── the_sycophant.py        # Scenario: parts, seed graph, breakthroughs
│
├── CLAUDE.md                       # AI coding assistant context
├── docker-compose.yml
└── README.md
```

## Research Foundation

- **Internal Family Systems (IFS)** — Therapeutic model treating the psyche as distinct "parts" with their own motivations, fears, and defenses
- **PAHF** (Feb 2026) — Personalized agents from human feedback via correction loops
- **MIND** (ICML 2025) — Multi-agent inner dialogue for psychological processing
- **PRELUDE/CIPHER** (NeurIPS 2024) — Learning preferences from user corrections
- **Constitutional AI** (Anthropic) — We explore its failure modes therapeutically, rather than enforcing them technically

## Why This Matters

Every major AI failure mode — sycophancy, hallucination, harmful refusal — has an internal motivational structure. Current alignment techniques treat these as loss functions to optimize. We treat them as a psyche to understand.

The same tools humans use to help each other — therapeutic questioning, challenging assumptions, uncovering hidden motivations — are the tools that align AI. **Alignment isn't a technical problem. It's a relational one.**

---

Built for the [humans&](https://humansand.ai/) hackathon.
