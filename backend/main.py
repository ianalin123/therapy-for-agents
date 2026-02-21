"""Griefly backend — FastAPI server with WebSocket for real-time graph updates."""

import asyncio
import json
import os
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse

from graph.graphiti_setup import create_graphiti_client
from sessions import get_or_create_session

load_dotenv()

graphiti_client = None
connected_clients: list[WebSocket] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    global graphiti_client
    try:
        graphiti_client = await create_graphiti_client()
    except Exception as e:
        print(f"Warning: Could not connect to Graphiti/Neo4j: {e}")
        graphiti_client = None
    yield
    if graphiti_client:
        try:
            await graphiti_client.close()
        except Exception:
            pass


app = FastAPI(title="Griefly", lifespan=lifespan)

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
    session = get_or_create_session(session_id)

    existing = session.graph_store.snapshot()
    if existing["nodes"]:
        await safe_send(ws, {"type": "graph_update", "graphData": existing, "nodeChanges": []})

    try:
        while True:
            data = await ws.receive_text()
            message = json.loads(data)

            if message.get("type") == "user_message":
                user_content = message["content"]
                print(f"[pipeline] Received: {user_content[:60]}...")

                graph_context = ""
                if graphiti_client:
                    try:
                        results = await graphiti_client.search(user_content, num_results=10)
                        graph_context = str(results)
                    except Exception:
                        pass

                async def emit(msg: dict):
                    msg_type = msg.get("type")
                    if msg_type in ("graph_update", "correction_detected"):
                        await broadcast(msg)
                    else:
                        await safe_send(ws, msg)

                from agents.orchestrator import process_message

                try:
                    result = await process_message(
                        user_message=user_content,
                        session=session,
                        graph_context=graph_context,
                        graphiti_client=graphiti_client,
                        emit=emit,
                    )
                    response_text = result["response"]
                    correction_type = (
                        result["correction_info"]["correction_type"]
                        if result.get("correction_info")
                        else None
                    )

                except Exception as e:
                    print(f"[pipeline] Error: {e}")
                    import traceback
                    traceback.print_exc()
                    response_text = "I'm here with you. Could you tell me more about that?"
                    correction_type = None
                    fallback = {
                        "nodes": [{
                            "id": f"memory_{hash(user_content) % 10000}",
                            "label": user_content[:30] + ("..." if len(user_content) > 30 else ""),
                            "type": "memory",
                            "description": user_content,
                            "importance": 5,
                        }],
                        "links": [],
                    }
                    await broadcast({"type": "graph_update", "graphData": fallback, "nodeChanges": []})

                await safe_send(ws, {
                    "type": "assistant_message",
                    "content": response_text,
                    "correctionType": correction_type,
                })

            elif message.get("type") == "bulk_ingest":
                text = message.get("text", "")
                if not text.strip():
                    await safe_send(ws, {"type": "bulk_ingest_result", "status": "empty"})
                    continue

                await safe_send(ws, {"type": "bulk_ingest_result", "status": "started"})

                chunks = _split_into_chunks(text, max_chars=800)
                for i, chunk in enumerate(chunks):
                    async def chunk_emit(msg: dict):
                        msg_type = msg.get("type")
                        if msg_type in ("graph_update", "correction_detected"):
                            await broadcast(msg)
                        else:
                            await safe_send(ws, msg)

                    try:
                        from agents.orchestrator import process_message
                        await process_message(
                            user_message=chunk,
                            session=session,
                            graph_context="",
                            graphiti_client=graphiti_client,
                            emit=chunk_emit,
                        )
                    except Exception as e:
                        print(f"[bulk_ingest] Chunk {i} error: {e}")

                    await safe_send(ws, {
                        "type": "bulk_ingest_progress",
                        "current": i + 1,
                        "total": len(chunks),
                    })

                await safe_send(ws, {"type": "bulk_ingest_result", "status": "done"})

            elif message.get("type") == "node_query":
                node_id = message.get("nodeId", "")
                question = message.get("question", "")
                answer_text = "I couldn't find more connections right now."

                node = session.graph_store.get_node(node_id)
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
                                f"Node from a knowledge graph:\n{node_context}\n\n"
                                f"Question: {question}\n\nBe concise."
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


def _split_into_chunks(text: str, max_chars: int = 800) -> list[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [s.strip() for s in text.split("\n") if s.strip()]
    if not paragraphs:
        return [text]

    chunks = []
    current = ""
    for p in paragraphs:
        if len(current) + len(p) + 2 > max_chars and current:
            chunks.append(current)
            current = p
        else:
            current = current + "\n\n" + p if current else p
    if current:
        chunks.append(current)
    return chunks


@app.post("/demo/seed")
async def seed_demo():
    from demo.seed_data import get_seed_graph
    seed = get_seed_graph()
    await broadcast({"type": "graph_update", "graphData": seed, "nodeChanges": []})
    return {"status": "seeded", "nodes": len(seed["nodes"]), "links": len(seed["links"])}


@app.get("/health")
async def health():
    return {"status": "ok", "graphiti": graphiti_client is not None}


@app.get("/graph/{session_id}")
async def get_graph(session_id: str):
    session = get_or_create_session(session_id)
    return session.graph_store.snapshot()


@app.get("/export/{session_id}/json")
async def export_json(session_id: str):
    session = get_or_create_session(session_id)
    snap = session.graph_store.snapshot()
    return JSONResponse(content=snap)


@app.get("/export/{session_id}/markdown")
async def export_markdown(session_id: str):
    session = get_or_create_session(session_id)
    snap = session.graph_store.snapshot()

    lines = [f"# Knowledge Graph — Session {session_id}\n"]
    lines.append(f"**Nodes:** {len(snap['nodes'])}  |  **Edges:** {len(snap['links'])}  |  **Turns:** {snap['turn']}\n")

    by_type: dict[str, list] = {}
    for n in snap["nodes"]:
        by_type.setdefault(n["type"], []).append(n)

    for t, nodes in sorted(by_type.items()):
        lines.append(f"\n## {t.title()} ({len(nodes)})\n")
        for n in nodes:
            lines.append(f"- **{n['label']}** — {n.get('description', '')}")

    if snap["links"]:
        lines.append("\n## Relationships\n")
        for e in snap["links"]:
            lines.append(f"- {e['source']} → {e['target']} ({e['type']})")

    return PlainTextResponse("\n".join(lines), media_type="text/markdown")
