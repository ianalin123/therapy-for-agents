"""Orchestrator — streaming multi-agent pipeline.

Emits incremental WebSocket events as each agent completes so the frontend
can show agent activity and graph updates without waiting for the full pipeline.
"""

import asyncio
import json
import time
from datetime import datetime, timezone
from typing import Any, Callable, Awaitable

from .listener import extract_entities
from .reflector import generate_reflection
from .guardian import evaluate_response
from .learner import classify_response, get_preference_profile

conversation_history: list[dict] = []
last_reflection: str = ""

EmitFn = Callable[[dict], Awaitable[None]]


async def _noop_emit(msg: dict) -> None:
    pass


def _minimal_extraction(user_message: str) -> dict:
    return {
        "entities": [{
            "id": f"memory_{hash(user_message) % 10000}",
            "label": user_message[:30] + ("..." if len(user_message) > 30 else ""),
            "type": "memory",
            "description": user_message,
            "importance": 5,
        }],
        "relationships": [],
    }


def _build_graph_updates(extraction: dict) -> dict:
    nodes = []
    links = []
    for entity in extraction.get("entities", []):
        nodes.append({
            "id": entity["id"],
            "label": entity["label"],
            "type": entity["type"],
            "description": entity.get("description", ""),
            "importance": entity.get("importance", 5),
        })
    for rel in extraction.get("relationships", []):
        links.append({
            "source": rel["source"],
            "target": rel["target"],
            "type": rel["type"],
            "label": rel.get("label", ""),
        })
    return {"nodes": nodes, "links": links}


async def process_message(
    user_message: str,
    graph_context: str = "",
    graphiti_client: Any = None,
    emit: EmitFn = _noop_emit,
) -> dict:
    global last_reflection

    result: dict[str, Any] = {
        "response": "",
        "graph_updates": {"nodes": [], "links": []},
        "correction_info": None,
    }

    saved_last_reflection = last_reflection

    # ------------------------------------------------------------------
    # Step 1 (parallel): Listener + Learner
    # ------------------------------------------------------------------
    await emit({"type": "agent_status", "agent": "listener", "status": "running"})
    if saved_last_reflection:
        await emit({"type": "agent_status", "agent": "learner", "status": "running"})

    t0 = time.monotonic()

    async def _run_listener():
        try:
            return await extract_entities(user_message, graph_context)
        except Exception as e:
            print(f"Listener extraction error: {e}")
            return {"entities": [], "relationships": []}

    async def _run_learner():
        if not saved_last_reflection:
            return None
        try:
            return await classify_response(
                user_message, saved_last_reflection, conversation_history
            )
        except Exception as e:
            print(f"Learner classification error: {e}")
            return None

    extraction, correction = await asyncio.gather(
        _run_listener(), _run_learner()
    )

    t_parallel = time.monotonic()

    if not extraction.get("entities"):
        extraction = _minimal_extraction(user_message)

    entity_count = len(extraction.get("entities", []))
    rel_count = len(extraction.get("relationships", []))
    await emit({
        "type": "agent_status",
        "agent": "listener",
        "status": "done",
        "summary": f"Extracted {entity_count} entities, {rel_count} relationships",
        "durationMs": int((t_parallel - t0) * 1000),
    })

    result["correction_info"] = correction
    if saved_last_reflection:
        correction_label = correction["correction_type"] if correction else "agreement"
        await emit({
            "type": "agent_status",
            "agent": "learner",
            "status": "done",
            "summary": f"Classified as {correction_label}",
            "durationMs": int((t_parallel - t0) * 1000),
        })

    # Build and IMMEDIATELY emit graph updates — don't wait for Reflector/Guardian
    graph_updates = _build_graph_updates(extraction)
    result["graph_updates"] = graph_updates

    if graph_updates["nodes"]:
        await emit({"type": "graph_update", "graphData": graph_updates})

    # Graphiti ingest (fire-and-forget)
    if graphiti_client and extraction.get("entities"):
        async def _ingest():
            try:
                await graphiti_client.add_episode(
                    name=f"memory_{len(conversation_history)}",
                    episode_body=f"User shared: {user_message}",
                    source_description="user_conversation",
                    reference_time=datetime.now(timezone.utc),
                )
            except Exception as e:
                print(f"Graphiti ingestion error: {e}")
        asyncio.create_task(_ingest())

    # ------------------------------------------------------------------
    # Step 2: Reflector
    # ------------------------------------------------------------------
    await emit({"type": "agent_status", "agent": "reflector", "status": "running"})
    t1 = time.monotonic()

    graph_summary = json.dumps(extraction, indent=2)
    pref_profile = get_preference_profile()

    try:
        reflection = await generate_reflection(
            user_message,
            graph_summary,
            conversation_history,
            pref_profile,
        )
    except Exception as e:
        print(f"Reflector error: {e}")
        reflection = (
            "Thank you for sharing that with me. "
            "I'd love to hear more whenever you're ready."
        )

    t2 = time.monotonic()
    await emit({
        "type": "agent_status",
        "agent": "reflector",
        "status": "done",
        "summary": f"{len(reflection.split())} words",
        "durationMs": int((t2 - t1) * 1000),
    })

    # ------------------------------------------------------------------
    # Step 3: Guardian
    # ------------------------------------------------------------------
    await emit({"type": "agent_status", "agent": "guardian", "status": "running"})
    t3 = time.monotonic()

    try:
        safety = await evaluate_response(
            reflection, user_message, conversation_history
        )
    except Exception as e:
        print(f"Guardian error: {e}")
        safety = {"approved": True, "reason": "Guardian unavailable", "crisis_detected": False}

    t4 = time.monotonic()

    if safety.get("crisis_detected"):
        result["response"] = (
            "I hear you, and what you're feeling matters deeply. "
            "If you're in crisis, please reach out to the 988 Suicide & Crisis Lifeline "
            "(call or text 988). You don't have to go through this alone.\n\n"
            + (safety.get("modified_response") or reflection)
        )
        guardian_summary = "Crisis detected — resources provided"
    elif not safety.get("approved"):
        result["response"] = safety.get("modified_response", reflection)
        guardian_summary = f"Modified — {safety.get('reason', 'policy')}"
    else:
        result["response"] = reflection
        guardian_summary = "Approved"

    await emit({
        "type": "agent_status",
        "agent": "guardian",
        "status": "done",
        "summary": guardian_summary,
        "durationMs": int((t4 - t3) * 1000),
    })

    # ------------------------------------------------------------------
    # Emit correction event with before/after diff
    # ------------------------------------------------------------------
    if correction and correction.get("correction_type") in ("productive", "clarifying"):
        affected_ids = [n["id"] for n in graph_updates.get("nodes", [])]
        await emit({
            "type": "correction_detected",
            "correctionType": correction["correction_type"],
            "beforeClaim": saved_last_reflection[:200] if saved_last_reflection else "",
            "afterInsight": user_message[:200],
            "learnerReflection": correction.get("reflection_about_what_worked", ""),
            "newMemoryUnlocked": correction.get("new_memory_unlocked", False),
            "affectedNodeIds": affected_ids,
        })

    # Update conversation history
    conversation_history.append({"role": "user", "content": user_message})
    conversation_history.append({"role": "assistant", "content": result["response"]})
    last_reflection = result["response"]

    return result
