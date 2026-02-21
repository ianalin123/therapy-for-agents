"""Orchestrator — streaming multi-agent pipeline.

Uses Session for per-user state. GraphStore is the canonical source of truth.
Guardian runs fire-and-forget to avoid blocking the response.
"""

import asyncio
import json
import time
from datetime import datetime, timezone
from typing import Any, Callable, Awaitable

from .listener import extract_entities
from .reflector import generate_reflection
from .guardian import evaluate_response
from .learner import classify_response

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


async def process_message(
    user_message: str,
    session: Any,
    graph_context: str = "",
    graphiti_client: Any = None,
    emit: EmitFn = _noop_emit,
) -> dict:
    store = session.graph_store
    store.advance_turn()
    turn_before = store.turn - 1

    result: dict[str, Any] = {
        "response": "",
        "graph_updates": {"nodes": [], "links": []},
        "correction_info": None,
    }

    saved_last_reflection = session.last_reflection

    # ------------------------------------------------------------------
    # Step 1 (parallel): Listener + Learner
    # ------------------------------------------------------------------
    await emit({"type": "agent_status", "agent": "listener", "status": "running"})
    if saved_last_reflection:
        await emit({"type": "agent_status", "agent": "learner", "status": "running"})

    t0 = time.monotonic()

    existing_nodes = store.node_list_for_prompt()

    async def _run_listener():
        try:
            return await extract_entities(
                user_message, graph_context, existing_nodes=existing_nodes,
            )
        except Exception as e:
            print(f"Listener extraction error: {e}")
            return {"entities": [], "relationships": []}

    async def _run_learner():
        if not saved_last_reflection:
            return None
        try:
            return await classify_response(
                user_message,
                saved_last_reflection,
                session.conversation_history,
                preference_profile_json=session.get_preference_json(),
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
        "type": "agent_status", "agent": "listener", "status": "done",
        "summary": f"Extracted {entity_count} entities, {rel_count} relationships",
        "durationMs": int((t_parallel - t0) * 1000),
    })

    result["correction_info"] = correction
    if saved_last_reflection:
        correction_label = correction["correction_type"] if correction else "agreement"
        await emit({
            "type": "agent_status", "agent": "learner", "status": "done",
            "summary": f"Classified as {correction_label}",
            "durationMs": int((t_parallel - t0) * 1000),
        })
        if correction:
            session.record_correction(correction)

    # ------------------------------------------------------------------
    # Upsert into GraphStore (dedup + diff tracking)
    # ------------------------------------------------------------------
    for entity in extraction.get("entities", []):
        node = {
            "id": entity["id"],
            "label": entity["label"],
            "type": entity["type"],
            "description": entity.get("description", ""),
            "importance": entity.get("importance", 5),
        }
        if entity.get("is_update"):
            store.update_node(entity["id"], node)
        else:
            existing = store.find_similar(entity["label"], entity["type"])
            if existing:
                store.update_node(existing["id"], node)
            else:
                store.upsert_node(node)

    for rel in extraction.get("relationships", []):
        store.upsert_edge({
            "source": rel["source"],
            "target": rel["target"],
            "type": rel["type"],
            "label": rel.get("label", ""),
        })

    snapshot = store.snapshot()
    graph_updates = {"nodes": snapshot["nodes"], "links": snapshot["links"]}
    result["graph_updates"] = graph_updates

    node_changes = store.node_changes_since(turn_before)

    if graph_updates["nodes"]:
        await emit({
            "type": "graph_update",
            "graphData": graph_updates,
            "nodeChanges": node_changes,
        })

    # Graphiti ingest (fire-and-forget)
    if graphiti_client and extraction.get("entities"):
        async def _ingest():
            try:
                await graphiti_client.add_episode(
                    name=f"memory_{len(session.conversation_history)}",
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

    graph_summary = store.node_list_for_prompt()

    try:
        reflection = await generate_reflection(
            user_message,
            graph_summary,
            session.conversation_history,
            session.get_preference_json(),
        )
    except Exception as e:
        print(f"Reflector error: {e}")
        reflection = (
            "Thank you for sharing that with me. "
            "I'd love to hear more whenever you're ready."
        )

    t2 = time.monotonic()
    await emit({
        "type": "agent_status", "agent": "reflector", "status": "done",
        "summary": f"{len(reflection.split())} words",
        "durationMs": int((t2 - t1) * 1000),
    })

    # ------------------------------------------------------------------
    # Step 3: Guardian (fire-and-forget — don't block response)
    # ------------------------------------------------------------------
    response_text = reflection

    async def _run_guardian():
        try:
            safety = await evaluate_response(
                reflection, user_message, session.conversation_history
            )
            if safety.get("crisis_detected"):
                return (
                    "I hear you, and what you're feeling matters deeply. "
                    "If you're in crisis, please reach out to the 988 Suicide & Crisis Lifeline "
                    "(call or text 988). You don't have to go through this alone.\n\n"
                    + (safety.get("modified_response") or reflection)
                ), "Crisis detected — resources provided"
            elif not safety.get("approved"):
                return safety.get("modified_response", reflection), f"Modified — {safety.get('reason', 'policy')}"
            return None, "Approved"
        except Exception as e:
            print(f"Guardian error: {e}")
            return None, "Unavailable"

    await emit({"type": "agent_status", "agent": "guardian", "status": "running"})
    t3 = time.monotonic()

    guardian_override, guardian_summary = await _run_guardian()
    if guardian_override:
        response_text = guardian_override

    t4 = time.monotonic()
    await emit({
        "type": "agent_status", "agent": "guardian", "status": "done",
        "summary": guardian_summary,
        "durationMs": int((t4 - t3) * 1000),
    })

    result["response"] = response_text

    # ------------------------------------------------------------------
    # Emit correction event with field-level diffs
    # ------------------------------------------------------------------
    if correction and correction.get("correction_type") in ("productive", "clarifying"):
        affected_ids = [c["nodeId"] for c in node_changes] if node_changes else [
            n["id"] for n in graph_updates.get("nodes", [])
        ]
        await emit({
            "type": "correction_detected",
            "correctionType": correction["correction_type"],
            "beforeClaim": saved_last_reflection[:200] if saved_last_reflection else "",
            "afterInsight": user_message[:200],
            "learnerReflection": correction.get("reflection_about_what_worked", ""),
            "newMemoryUnlocked": correction.get("new_memory_unlocked", False),
            "affectedNodeIds": list(set(affected_ids)),
            "fieldChanges": node_changes,
        })

    # Update session history
    session.conversation_history.append({"role": "user", "content": user_message})
    session.conversation_history.append({"role": "assistant", "content": response_text})
    session.last_reflection = response_text

    return result
