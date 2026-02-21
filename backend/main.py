"""Briefly backend — FastAPI server with WebSocket for real-time graph updates."""

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


app = FastAPI(title="Briefly", lifespan=lifespan)

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

            if message.get("type") == "user_message":
                user_content = message["content"]

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

                # Process through agent pipeline
                from agents.orchestrator import process_message

                try:
                    result = await process_message(
                        user_message=user_content,
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

                    # If correction was detected, send correction event
                    if result.get("correction_info") and result["correction_info"].get("correction_type") in ("productive", "clarifying"):
                        await broadcast_graph_update({
                            "type": "correction_detected",
                            "correctionType": result["correction_info"]["correction_type"],
                        })

                except Exception as e:
                    print(f"Agent pipeline error: {e}")

                    # Always send both assistant_message AND graph_update
                    # so the frontend can transition from landing -> graph
                    fallback_node_id = f"memory_{hash(user_content) % 10000}"
                    fallback_label = user_content[:30] + ("..." if len(user_content) > 30 else "")

                    await ws.send_text(json.dumps({
                        "type": "assistant_message",
                        "content": "I'm here with you. Could you tell me more about that?",
                    }))

                    await broadcast_graph_update({
                        "type": "graph_update",
                        "graphData": {
                            "nodes": [{
                                "id": fallback_node_id,
                                "label": fallback_label,
                                "type": "memory",
                                "description": user_content,
                                "importance": 5,
                            }],
                            "links": [],
                        },
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

                        from anthropic import Anthropic
                        anthropic_client = Anthropic()
                        answer = anthropic_client.messages.create(
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

                await ws.send_text(json.dumps({
                    "type": "node_answer",
                    "nodeId": node_id,
                    "answer": answer_text,
                }))

    except WebSocketDisconnect:
        if ws in connected_clients:
            connected_clients.remove(ws)


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
