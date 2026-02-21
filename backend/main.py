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
    try:
        while True:
            data = await ws.receive_text()
            message = json.loads(data)

            if message.get("type") == "user_message":
                user_content = message["content"]
                print(f"[pipeline] Received: {user_content[:60]}...")

                # Graphiti context search (non-blocking if no client)
                graph_context = ""
                if graphiti_client:
                    try:
                        results = await graphiti_client.search(
                            user_content, num_results=10
                        )
                        graph_context = str(results)
                    except Exception:
                        pass

                # Streaming emit: sends each agent event directly to this client
                # and broadcasts graph_update / correction_detected to all clients
                async def emit(msg: dict):
                    msg_type = msg.get("type")
                    if msg_type in ("graph_update", "correction_detected"):
                        await broadcast(msg)
                    else:
                        await safe_send(ws, msg)

                from agents.orchestrator import process_message

                fallback_graph = {
                    "nodes": [{
                        "id": f"memory_{hash(user_content) % 10000}",
                        "label": user_content[:30] + ("..." if len(user_content) > 30 else ""),
                        "type": "memory",
                        "description": user_content,
                        "importance": 5,
                    }],
                    "links": [],
                }

                try:
                    result = await process_message(
                        user_message=user_content,
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
                    await broadcast({"type": "graph_update", "graphData": fallback_graph})

                # Send assistant response (graph_update was already sent by orchestrator)
                await safe_send(ws, {
                    "type": "assistant_message",
                    "content": response_text,
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
                                    f"Based on this context from a knowledge graph:\n"
                                    f"{answer_context}\n\n"
                                    f"Answer this question about node '{node_id}': {question}\n\n"
                                    f"Be concise and draw connections between nodes."
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
    except Exception as e:
        import traceback
        traceback.print_exc()
        if ws in connected_clients:
            connected_clients.remove(ws)


@app.post("/demo/seed")
async def seed_demo():
    from demo.seed_data import get_seed_graph
    seed = get_seed_graph()
    await broadcast({"type": "graph_update", "graphData": seed})
    return {"status": "seeded", "nodes": len(seed["nodes"]), "links": len(seed["links"])}


@app.get("/health")
async def health():
    return {"status": "ok", "graphiti": graphiti_client is not None}


@app.get("/graph")
async def get_graph():
    if not graphiti_client:
        return {"nodes": [], "edges": []}
    try:
        results = await graphiti_client.search("", num_results=100)
        return {"nodes": [], "edges": [], "raw_results": len(results)}
    except Exception:
        return {"nodes": [], "edges": []}
