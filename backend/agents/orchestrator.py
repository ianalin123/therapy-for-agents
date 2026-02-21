"""Orchestrator — routes user messages through the full agent pipeline.

Designed for graceful degradation: if any agent (Listener, Learner,
Reflector, Guardian) or Graphiti fails, the pipeline continues and
always returns at least one graph node so the frontend can transition.
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Any

from .listener import extract_entities
from .reflector import generate_reflection
from .guardian import evaluate_response
from .learner import classify_response, get_preference_profile

conversation_history: list[dict] = []
last_reflection: str = ""


def _minimal_extraction(user_message: str) -> dict:
    """Create a minimal extraction with a single 'memory' node from the
    user's message.  Used when the Listener fails or returns empty."""
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
    graph_context: str = "",
    graphiti_client: Any = None,
) -> dict:
    global last_reflection

    result = {
        "response": "",
        "graph_updates": {"nodes": [], "links": []},
        "correction_info": None,
    }

    # ------------------------------------------------------------------
    # Step 1 (parallel): Listener + Learner run concurrently
    # ------------------------------------------------------------------
    async def _run_listener():
        try:
            return await extract_entities(user_message, graph_context)
        except Exception as e:
            print(f"Listener extraction error: {e}")
            return {"entities": [], "relationships": []}

    async def _run_learner():
        if not last_reflection:
            return None
        try:
            return await classify_response(
                user_message, last_reflection, conversation_history
            )
        except Exception as e:
            print(f"Learner classification error: {e}")
            return None

    extraction, correction = await asyncio.gather(
        _run_listener(), _run_learner()
    )
    result["correction_info"] = correction

    # If listener extraction failed or returned empty, create a minimal node
    if not extraction.get("entities"):
        extraction = _minimal_extraction(user_message)

    # ------------------------------------------------------------------
    # Ingest into Graphiti (fire-and-forget)
    # ------------------------------------------------------------------
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

    # Transform entities for frontend graph
    for entity in extraction.get("entities", []):
        result["graph_updates"]["nodes"].append({
            "id": entity["id"],
            "label": entity["label"],
            "type": entity["type"],
            "description": entity.get("description", ""),
            "importance": entity.get("importance", 5),
        })

    for rel in extraction.get("relationships", []):
        result["graph_updates"]["links"].append({
            "source": rel["source"],
            "target": rel["target"],
            "type": rel["type"],
            "label": rel.get("label", ""),
        })

    # ------------------------------------------------------------------
    # Step 2: Reflector — generate response with productive imprecision
    # ------------------------------------------------------------------
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

    # ------------------------------------------------------------------
    # Step 3: Guardian — safety check
    # ------------------------------------------------------------------
    try:
        safety = await evaluate_response(
            reflection, user_message, conversation_history
        )
    except Exception as e:
        print(f"Guardian error: {e}")
        safety = {"approved": True, "reason": "Guardian unavailable — default approval", "crisis_detected": False}

    if safety.get("crisis_detected"):
        result["response"] = (
            "I hear you, and what you're feeling matters deeply. "
            "If you're in crisis, please reach out to the 988 Suicide & Crisis Lifeline "
            "(call or text 988). You don't have to go through this alone.\n\n"
            + (safety.get("modified_response") or reflection)
        )
    elif not safety.get("approved"):
        result["response"] = safety.get("modified_response", reflection)
    else:
        result["response"] = reflection

    # Update conversation history
    conversation_history.append({"role": "user", "content": user_message})
    conversation_history.append({"role": "assistant", "content": result["response"]})
    last_reflection = result["response"]

    return result
