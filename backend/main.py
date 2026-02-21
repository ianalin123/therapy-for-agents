"""AgentTherapy backend — FastAPI server with WebSocket for real-time AI therapy sessions."""

import json
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse

from sessions import get_or_create_session
from scenarios import list_scenarios, DEFAULT_SCENARIO

load_dotenv()

connected_clients: list[WebSocket] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="AgentTherapy", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
    disconnected = []
    message = json.dumps(data)
    for client in connected_clients:
        try:
            await client.send_text(message)
        except (WebSocketDisconnect, RuntimeError):
            disconnected.append(client)
    for client in disconnected:
        if client in connected_clients:
            connected_clients.remove(client)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    connected_clients.append(ws)

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

            if message.get("type") == "user_message":
                user_content = message["content"]
                print(f"[session {session_id}] Clinician: {user_content[:80]}...")

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
                except Exception as e:
                    print(f"[pipeline] Error: {e}")
                    import traceback
                    traceback.print_exc()
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
                    from anthropic import AsyncAnthropic
                    ac = AsyncAnthropic()
                    answer = await ac.messages.create(
                        model="claude-sonnet-4-20250514",
                        max_tokens=300,
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
        if ws in connected_clients:
            connected_clients.remove(ws)
    except Exception:
        import traceback
        traceback.print_exc()
        if ws in connected_clients:
            connected_clients.remove(ws)


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
