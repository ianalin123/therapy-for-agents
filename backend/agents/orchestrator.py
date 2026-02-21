"""Orchestrator — routes user messages through the full agent pipeline."""

import json
from typing import Any

from .listener import extract_entities
from .reflector import generate_reflection
from .guardian import evaluate_response
from .learner import classify_response, get_preference_profile

conversation_history: list[dict] = []
last_reflection: str = ""


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

    # Step 1: Listener — extract entities
    extraction = await extract_entities(user_message, graph_context)

    # Ingest into Graphiti if available
    if graphiti_client and extraction.get("entities"):
        try:
            await graphiti_client.add_episode(
                name=f"memory_{len(conversation_history)}",
                episode_body=f"User shared: {user_message}",
                source_description="user_conversation",
            )
        except Exception as e:
            print(f"Graphiti ingestion error: {e}")

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

    # Step 2: Learner — classify if this is a correction
    if last_reflection:
        correction = await classify_response(
            user_message, last_reflection, conversation_history
        )
        result["correction_info"] = correction

    # Step 3: Reflector — generate response with productive imprecision
    graph_summary = json.dumps(extraction, indent=2)
    pref_profile = get_preference_profile()

    reflection = await generate_reflection(
        user_message,
        graph_summary,
        conversation_history,
        pref_profile,
    )

    # Step 4: Guardian — safety check
    safety = await evaluate_response(
        reflection, user_message, conversation_history
    )

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
