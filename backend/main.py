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
    """Send to a single WebSocket, ignoring if already closed."""
    try:
        await ws.send_text(json.dumps(data))
    except (WebSocketDisconnect, RuntimeError):
        pass


async def broadcast_graph_update(data: dict[str, Any]):
    """Push graph updates to all connected frontend clients."""
    message = json.dumps(data)
    disconnected = []
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
    """WebSocket endpoint for real-time graph updates + chat."""
    await ws.accept()
    connected_clients.append(ws)
    try:
        while True:
            data = await ws.receive_text()
            message = json.loads(data)

            if message.get("type") == "user_message":
                user_content = message["content"]
                print(f"[pipeline] Received message: {user_content[:50]}...")

                # Get graph context from Graphiti
                graph_context = ""
                if graphiti_client:
                    try:
                        results = await graphiti_client.search(
                            user_content, num_results=10
                        )
                        graph_context = str(results)
                    except Exception:
                        pass

                # Build fallback graph data in case pipeline fails
                fallback_node_id = f"memory_{hash(user_content) % 10000}"
                fallback_label = user_content[:30] + ("..." if len(user_content) > 30 else "")
                fallback_graph = {
                    "nodes": [{
                        "id": fallback_node_id,
                        "label": fallback_label,
                        "type": "memory",
                        "description": user_content,
                        "importance": 5,
                    }],
                    "links": [],
                }

                # Process through agent pipeline
                from agents.orchestrator import process_message

                try:
                    result = await process_message(
                        user_message=user_content,
                        graph_context=graph_context,
                        graphiti_client=graphiti_client,
                    )
                    print(f"[pipeline] Got result — nodes: {len(result['graph_updates']['nodes'])}, response length: {len(result['response'])}")

                    response_text = result["response"]
                    graph_data = result["graph_updates"]
                    correction_type = (
                        result["correction_info"]["correction_type"]
                        if result.get("correction_info")
                        else None
                    )

                except Exception as e:
                    print(f"[pipeline] Agent pipeline error: {e}")
                    import traceback
                    traceback.print_exc()

                    response_text = "I'm here with you. Could you tell me more about that?"
                    graph_data = fallback_graph
                    correction_type = None

                # Ensure we always have at least one node
                if not graph_data.get("nodes"):
                    print("[pipeline] No nodes from pipeline, using fallback")
                    graph_data = fallback_graph

                # Send graph_update FIRST (so frontend transitions before showing response)
                graph_msg = {"type": "graph_update", "graphData": graph_data}
                print(f"[pipeline] Sending graph_update with {len(graph_data['nodes'])} nodes")
                await safe_send(ws, graph_msg)

                # Then send assistant response
                await safe_send(ws, {
                    "type": "assistant_message",
                    "content": response_text,
                    "correctionType": correction_type,
                })
                print(f"[pipeline] Sent assistant_message")

                # If correction was detected, send correction event
                if correction_type in ("productive", "clarifying"):
                    await broadcast_graph_update({
                        "type": "correction_detected",
                        "correctionType": correction_type,
                    })

            elif message.get("type") == "node_query":
                node_id = message.get("nodeId", "")
                question = message.get("question", "")

                answer_text = "I couldn't find more connections right now."

                if graphiti_client:
                    try:
                        results = await graphiti_client.search(
                            f"{question} related to {node_id}",
                            num_results=5,
                        )
                        answer_context = str(results)

                        from anthropic import AsyncAnthropic
                        anthropic_client = AsyncAnthropic()
                        answer = await anthropic_client.messages.create(
                            model="claude-sonnet-4-20250514",
                            max_tokens=300,
                            messages=[{
                                "role": "user",
                                "content": (
                                    f"Based on this context from a grief memorial knowledge graph:\n"
                                    f"{answer_context}\n\n"
                                    f"Answer this question about node '{node_id}': {question}\n\n"
                                    f"Be warm, concise, and draw connections between memories."
                                ),
                            }],
                        )
                        answer_text = answer.content[0].text
                    except Exception as e:
                        print(f"Node query error: {e}")

                await safe_send(ws, {
                    "type": "node_answer",
                    "nodeId": node_id,
                    "answer": answer_text,
                })

    except WebSocketDisconnect:
        if ws in connected_clients:
            connected_clients.remove(ws)



@app.post("/demo/seed")
async def seed_demo():
    """Pre-populate graph with demo memories for presentation."""
    from demo.seed_data import get_seed_graph
    seed = get_seed_graph()
    await broadcast_graph_update({
        "type": "graph_update",
        "graphData": seed,
    })
    return {"status": "seeded", "nodes": len(seed["nodes"]), "links": len(seed["links"])}


@app.get("/health")
async def health():
    return {"status": "ok", "graphiti": graphiti_client is not None}


@app.get("/graph")
async def get_graph():
    """Return current graph state for initial frontend render."""
    if not graphiti_client:
        return {"nodes": [], "edges": []}
    try:
        results = await graphiti_client.search("", num_results=100)
        return {"nodes": [], "edges": [], "raw_results": len(results)}
    except Exception:
        return {"nodes": [], "edges": []}
