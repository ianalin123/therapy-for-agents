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
        await graphiti_client.close()


app = FastAPI(title="Briefly", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def broadcast_graph_update(data: dict[str, Any]):
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
    await ws.accept()
    connected_clients.append(ws)
    try:
        while True:
            data = await ws.receive_text()
            message = json.loads(data)
            if message.get("type") == "user_message":
                # Placeholder — agent pipeline wired in Phase 2
                await ws.send_text(json.dumps({
                    "type": "assistant_message",
                    "content": "Agent pipeline not yet connected.",
                }))
    except WebSocketDisconnect:
        connected_clients.remove(ws)


@app.get("/health")
async def health():
    return {"status": "ok", "graphiti": graphiti_client is not None}


@app.get("/graph")
async def get_graph():
    if not graphiti_client:
        return {"nodes": [], "edges": []}
    results = await graphiti_client.search("", num_results=100)
    return {"nodes": [], "edges": [], "raw_results": len(results)}
