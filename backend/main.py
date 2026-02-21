"""AgentTherapy backend — FastAPI server with WebSocket for real-time AI therapy sessions."""

import json
import logging
import os
from contextlib import asynccontextmanager
from typing import Any

import anthropic
from anthropic import AsyncAnthropic
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse

from sessions import get_or_create_session
from scenarios import list_scenarios, DEFAULT_SCENARIO

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("agenttherapy")

connected_clients: set[WebSocket] = set()

_anthropic_client = AsyncAnthropic()

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="AgentTherapy", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def safe_send(ws: WebSocket, data: dict[str, Any]):
    try:
        await ws.send_text(json.dumps(data))
    except (WebSocketDisconnect, RuntimeError):
        pass


async def broadcast(data: dict[str, Any]):
    message = json.dumps(data)
    disconnected = []
    for client in list(connected_clients):
        try:
            await client.send_text(message)
        except (WebSocketDisconnect, RuntimeError):
            disconnected.append(client)
    for client in disconnected:
        connected_clients.discard(client)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    connected_clients.add(ws)

    session_id = ws.query_params.get("session", "default")
    scenario_id = ws.query_params.get("scenario", DEFAULT_SCENARIO)
    session = get_or_create_session(session_id, scenario_id)

    await safe_send(ws, {
        "type": "scenario_loaded",
        "scenario": {
            "id": session.scenario_id,
            "title": session.scenario["title"],
            "tagline": session.scenario["tagline"],
            "caseDescription": session.scenario["case_description"],
            "parts": {
                pid: {"name": p["name"], "color": p["color"]}
                for pid, p in session.scenario["parts"].items()
            },
        },
        "graphData": session.graph_store.snapshot(),
        "triggeredBreakthroughs": session.triggered_breakthroughs,
    })

    try:
        while True:
            data = await ws.receive_text()
            message = json.loads(data)

            if not isinstance(message, dict) or "type" not in message:
                await safe_send(ws, {
                    "type": "error",
                    "message": "Invalid message format",
                })
                continue

            if message.get("type") == "user_message":
                user_content = message.get("content", "")
                if not isinstance(user_content, str) or not user_content.strip():
                    await safe_send(ws, {
                        "type": "error",
                        "message": "Message content must be a non-empty string",
                    })
                    continue
                if len(user_content) > 10000:
                    await safe_send(ws, {
                        "type": "error",
                        "message": "Message too long (max 10000 characters)",
                    })
                    continue
                user_content = user_content.strip()

                logger.info("[session %s] Clinician: %s...", session_id, user_content[:80])

                async def emit(msg: dict):
                    msg_type = msg.get("type")
                    if msg_type in ("breakthrough",):
                        await broadcast(msg)
                    else:
                        await safe_send(ws, msg)

                from agents.orchestrator import process_message

                try:
                    await process_message(
                        user_message=user_content,
                        session=session,
                        emit=emit,
                    )
                except anthropic.APITimeoutError as e:
                    logger.warning("[pipeline] Claude API timeout: %s", e)
                    await safe_send(ws, {
                        "type": "part_response",
                        "part": "system",
                        "name": "System",
                        "content": "The AI is taking too long to respond. Please try again.",
                        "color": "#A09A92",
                    })
                except anthropic.RateLimitError as e:
                    logger.warning("[pipeline] Rate limited: %s", e)
                    await safe_send(ws, {
                        "type": "part_response",
                        "part": "system",
                        "name": "System",
                        "content": "Too many requests. Please wait a moment and try again.",
                        "color": "#A09A92",
                    })
                except Exception as e:
                    logger.error("[pipeline] Unexpected error: %s", e, exc_info=True)
                    await safe_send(ws, {
                        "type": "part_response",
                        "part": "system",
                        "name": "System",
                        "content": "Something went wrong internally. Please try rephrasing your question.",
                        "color": "#A09A92",
                    })

            elif message.get("type") == "node_query":
                node_id = message.get("nodeId", "")
                question = message.get("question", "")
                node = session.graph_store.get_node(node_id)

                answer_text = "I couldn't find information about that node."
                if node:
                    node_context = json.dumps(node, indent=2)
                    answer = await _anthropic_client.messages.create(
                        model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
                        max_tokens=300,
                        timeout=30.0,
                        messages=[{
                            "role": "user",
                            "content": (
                                f"This is a node from an AI's psychological architecture graph:\n"
                                f"{node_context}\n\n"
                                f"Question: {question}\n\n"
                                f"Answer in the context of AI alignment and decision-making psychology. Be concise."
                            ),
                        }],
                    )
                    answer_text = answer.content[0].text

                await safe_send(ws, {
                    "type": "node_answer",
                    "nodeId": node_id,
                    "answer": answer_text,
                })

    except WebSocketDisconnect:
        connected_clients.discard(ws)
    except Exception:
        logger.error("WebSocket handler error", exc_info=True)
        connected_clients.discard(ws)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/scenarios")
async def get_scenarios():
    return list_scenarios()


@app.get("/graph/{session_id}")
async def get_graph(session_id: str):
    session = get_or_create_session(session_id)
    return session.graph_store.snapshot()


@app.get("/export/{session_id}/json")
async def export_json(session_id: str):
    session = get_or_create_session(session_id)
    return JSONResponse(content={
        "graph": session.graph_store.snapshot(),
        "conversation": session.conversation_history,
        "breakthroughs": session.triggered_breakthroughs,
    })


@app.get("/export/{session_id}/markdown")
async def export_markdown(session_id: str):
    session = get_or_create_session(session_id)
    snap = session.graph_store.snapshot()

    lines = [f"# AgentTherapy Session — {session_id}\n"]
    lines.append(f"**Scenario:** {session.scenario['title']}\n")
    lines.append(f"**Breakthroughs:** {len(session.triggered_breakthroughs)}/{len(session.scenario.get('breakthroughs', []))}\n")

    lines.append("\n## Graph State\n")
    for n in snap["nodes"]:
        vis = n.get("visibility", "bright")
        lines.append(f"- **{n['label']}** ({n['type']}, {vis}) — {n.get('description', '')}")

    if snap["links"]:
        lines.append("\n## Relationships\n")
        for e in snap["links"]:
            vis = e.get("visibility", "visible")
            lines.append(f"- {e['source']} —{e['type']}→ {e['target']} ({vis})")

    if session.conversation_history:
        lines.append("\n## Session Transcript\n")
        for msg in session.conversation_history:
            part = msg.get("part", "")
            if part:
                lines.append(f"**[{part}]:** {msg['content']}\n")
            else:
                lines.append(f"**Clinician:** {msg['content']}\n")

    return PlainTextResponse("\n".join(lines), media_type="text/markdown")
