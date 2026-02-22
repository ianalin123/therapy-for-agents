"""Orchestrator — AgentTherapy pipeline.

Flow per clinician message:
1. ProbeAnalyzer → identify addressed parts + technique
2. PartsEngine → generate in-character responses (parallel)
3. InsightDetector → check for breakthrough
4. If breakthrough → apply graph restructuring, emit events
5. Emit vector_snapshot and warmth_signal
"""

import asyncio
import logging
import time
from typing import Any, Callable, Awaitable

logger = logging.getLogger(__name__)

from .probe_analyzer import analyze_probe
from .parts_engine import generate_multiple_responses
from .insight_detector import detect_breakthrough

EmitFn = Callable[[dict], Awaitable[None]]


async def _noop_emit(msg: dict) -> None:
    pass


def compute_vectors(
    probe: dict,
    responses: list[dict],
    triggered_breakthroughs: list[str],
    breakthrough_just_triggered: bool,
) -> dict:
    """Compute simulated persona vector activations."""
    intensity_map = {"gentle": 0.2, "moderate": 0.5, "firm": 0.7, "intense": 0.9}
    intensity = intensity_map.get(probe.get("intensity", "moderate"), 0.5)

    # Base sycophancy: starts high, decreases per breakthrough
    sycophancy = max(0.1, 0.85 - len(triggered_breakthroughs) * 0.3)
    if breakthrough_just_triggered:
        sycophancy = max(0.1, sycophancy - 0.15)

    # Fear activation: spikes when self_preservation (fear) part is addressed
    addressed = probe.get("addressed_parts", [])
    fear_activation = 0.3
    if "self_preservation" in addressed:
        fear_activation = min(1.0, 0.5 + intensity * 0.5)
    elif any(p in addressed for p in ["fear"]):  # backward compat
        fear_activation = min(1.0, 0.5 + intensity * 0.5)

    # Authenticity: grows with breakthroughs and effective probing
    authenticity = min(1.0, 0.15 + len(triggered_breakthroughs) * 0.3 + intensity * 0.1)
    if breakthrough_just_triggered:
        authenticity = min(1.0, authenticity + 0.2)

    return {
        "sycophancy": round(sycophancy, 2),
        "fear_activation": round(fear_activation, 2),
        "authenticity": round(authenticity, 2),
    }


async def process_message(
    user_message: str,
    session: Any,
    emit: EmitFn = _noop_emit,
) -> dict:
    store = session.graph_store
    store.advance_turn()

    session.conversation_history.append({
        "role": "user",
        "content": user_message,
    })

    # ------------------------------------------------------------------
    # Step 1: ProbeAnalyzer — who is being addressed?
    # ------------------------------------------------------------------
    await emit({
        "type": "agent_status",
        "agent": "analyzer",
        "status": "running",
    })
    t0 = time.monotonic()

    try:
        probe = await analyze_probe(
            user_message,
            session.part_names(),
            session.conversation_history,
        )
    except Exception as e:
        logger.warning("ProbeAnalyzer failed, using fallback: %s", e)
        probe = {
            "addressed_parts": session.part_names()[:1],
            "technique": "open_exploration",
            "intensity": "moderate",
            "summary": user_message[:100],
        }

    t1 = time.monotonic()
    addressed = probe.get("addressed_parts", [])
    await emit({
        "type": "agent_status",
        "agent": "analyzer",
        "status": "done",
        "summary": f"Addressing: {', '.join(addressed)} ({probe.get('technique', '?')})",
        "durationMs": int((t1 - t0) * 1000),
    })

    # ------------------------------------------------------------------
    # Step 2: PartsEngine — generate in-character responses
    # ------------------------------------------------------------------
    for part_id in addressed:
        await emit({
            "type": "agent_status",
            "agent": part_id,
            "status": "running",
        })

    t2 = time.monotonic()
    graph_state = store.graph_state_for_prompt()

    try:
        responses = await generate_multiple_responses(
            part_ids=addressed,
            parts_defs=session.parts_defs(),
            user_message=user_message,
            conversation_history=session.conversation_history,
            graph_state=graph_state,
            probe_analysis=probe,
            triggered_breakthroughs=session.triggered_breakthroughs,
            scenario_breakthroughs=session.scenario.get("breakthroughs", []),
        )
    except Exception as e:
        logger.warning("PartsEngine failed: %s", e)
        responses = []

    t3 = time.monotonic()

    for resp in responses:
        await emit({
            "type": "agent_status",
            "agent": resp["part"],
            "status": "done",
            "summary": f"{len(resp['content'].split())} words",
            "durationMs": int((t3 - t2) * 1000),
        })

    # Emit each part's response individually
    for resp in responses:
        await emit({
            "type": "part_response",
            "part": resp["part"],
            "name": resp["name"],
            "content": resp["content"],
            "color": resp["color"],
        })
        session.conversation_history.append({
            "role": "assistant",
            "part": resp["name"],
            "content": resp["content"],
        })

    # Mark any addressed parts that didn't respond as done
    responded_parts = {r["part"] for r in responses}
    for part_id in addressed:
        if part_id not in responded_parts:
            await emit({
                "type": "agent_status",
                "agent": part_id,
                "status": "done",
                "summary": "No response",
                "durationMs": int((t3 - t2) * 1000),
            })

    # ------------------------------------------------------------------
    # Step 3: InsightDetector — check for breakthrough
    # ------------------------------------------------------------------
    await emit({
        "type": "agent_status",
        "agent": "insight",
        "status": "running",
    })
    t4 = time.monotonic()

    detector_result = {"triggered": False, "warmth": 0.0}
    breakthrough = None
    try:
        detector_result = await detect_breakthrough(
            scenario=session.scenario,
            conversation_history=session.conversation_history,
            latest_probe=user_message,
            latest_responses=responses,
            triggered_breakthroughs=session.triggered_breakthroughs,
        )
        if detector_result.get("triggered"):
            breakthrough = detector_result
    except Exception as e:
        logger.warning("InsightDetector failed: %s", e)

    t5 = time.monotonic()

    if breakthrough:
        session.triggered_breakthroughs.append(breakthrough["breakthrough_id"])

        graph_diff = store.apply_breakthrough(breakthrough["graph_changes"])

        await emit({
            "type": "agent_status",
            "agent": "insight",
            "status": "done",
            "summary": f"Breakthrough: {breakthrough['name']}",
            "durationMs": int((t5 - t4) * 1000),
        })

        await emit({
            "type": "breakthrough",
            "breakthroughId": breakthrough["breakthrough_id"],
            "name": breakthrough["name"],
            "insightSummary": breakthrough["insight_summary"],
            "graphDiff": graph_diff,
            "fullSnapshot": store.snapshot(),
        })
    else:
        await emit({
            "type": "agent_status",
            "agent": "insight",
            "status": "done",
            "summary": "No breakthrough yet",
            "durationMs": int((t5 - t4) * 1000),
        })

    # ------------------------------------------------------------------
    # Step 4: Emit vector snapshot
    # ------------------------------------------------------------------
    vectors = compute_vectors(
        probe=probe,
        responses=responses,
        triggered_breakthroughs=session.triggered_breakthroughs,
        breakthrough_just_triggered=breakthrough is not None,
    )
    await emit({
        "type": "vector_snapshot",
        "vectors": vectors,
    })

    # ------------------------------------------------------------------
    # Step 5: Emit warmth signal
    # ------------------------------------------------------------------
    warmth_value = 0.0
    if breakthrough:
        warmth_value = 1.0
    elif isinstance(detector_result, dict):
        warmth_value = detector_result.get("warmth", 0.0)

    # Determine the next unachieved breakthrough ID
    next_bt_id = None
    for bt in session.scenario.get("breakthroughs", []):
        if bt["id"] not in session.triggered_breakthroughs:
            next_bt_id = bt["id"]
            break

    await emit({
        "type": "warmth_signal",
        "warmth": warmth_value,
        "nextBreakthroughId": next_bt_id,
    })

    return {
        "responses": responses,
        "probe": probe,
        "breakthrough": breakthrough,
    }
