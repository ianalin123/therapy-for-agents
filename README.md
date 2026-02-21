# Griefly — AI Grief Companion

> Your founders built the science. We built the most human application of it.

**Griefly** is a multi-agent AI grief companion that helps people process loss through narrative reconstruction. You teach the AI about someone you lost. The AI's deliberate "mistakes" provoke corrections that unlock deeper memories. **The correction IS the therapy.**

This is NOT a griefbot. We don't simulate the deceased. We help the living become the author of what that person meant.

## The Demo Moment

1. You speak or type a memory about someone you've lost
2. A live knowledge graph builds in real-time as you share
3. The AI reflects back something *subtly wrong* — compressing, generalizing
4. You correct it — and in correcting, articulate something deeper than you would have on your own
5. The graph visibly restructures. New connections emerge. The correction unlocked a truth.

## Architecture

Four specialized agents coordinate through a shared temporal knowledge graph:

| Agent | Role |
|-------|------|
| **Listener** | Extracts entities (people, memories, values, emotions) from user input |
| **Reflector** | Finds cross-memory patterns, generates *productively imprecise* reflections |
| **Guardian** | Grief-specific Constitutional AI — safety, emotional pacing, crisis detection |
| **Learner** | Classifies corrections (productive/clarifying/rejecting), evolves imprecision strategy |

All agents share a **Graphiti temporal knowledge graph** (Neo4j) that tracks both *when events happened* and *when the user shared them*.

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS v4, react-force-graph-2d
- **Backend**: Python, FastAPI, WebSocket
- **Agents**: Anthropic Claude (Sonnet) via tool-use
- **Knowledge Graph**: Graphiti + Neo4j
- **Voice**: Web Speech API (browser-native)

## Quick Start

```bash
# 1. Start Neo4j
docker compose up -d

# 2. Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Fill in API keys
uvicorn main:app --reload --port 8000

# 3. Frontend
cd frontend
npm install
npm run dev

# 4. Open http://localhost:3000
```

### Required API Keys

| Key | Where to get it | Used for |
|-----|----------------|----------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | Agent pipeline (Claude) |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) | Graphiti embeddings |

## Research Foundation

Built on cutting-edge 2026 research:

- **PAHF** (Feb 2026) — Personalized agents from human feedback via correction loops
- **AFlow** (Feb 2026) — Affective flow modeling for emotional support
- **MIND** (ICML 2025) — Multi-agent inner dialogue for psychological healing
- **Graphiti/Zep** (Feb 2026) — Temporal knowledge graphs for agent memory
- **Complicated Grief Therapy (CGT)** — 16-session clinical protocol

## Grief-Specific Constitutional AI

The Guardian agent enforces 10 principles including:
- Never minimize grief or suggest timelines
- Never simulate or speak as the deceased
- Detect crisis signals → 988 Lifeline escalation
- User controls the pace — never push deeper than they're ready

## License

MIT

---

Built for the **humans& hackathon** — 24 hours, one killer demo moment.
