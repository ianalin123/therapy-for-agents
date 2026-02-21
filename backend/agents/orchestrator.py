"""Orchestrator — AgentTherapy pipeline.

Flow per clinician message:
1. ProbeAnalyzer → identify addressed parts + technique
2. PartsEngine → generate in-character responses (parallel)
3. InsightDetector → check for breakthrough
4. If breakthrough → apply graph restructuring, emit events
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

    breakthrough = None
    try:
        breakthrough = await detect_breakthrough(
            scenario=session.scenario,
            conversation_history=session.conversation_history,
            latest_probe=user_message,
            latest_responses=responses,
            triggered_breakthroughs=session.triggered_breakthroughs,
        )
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

    return {
        "responses": responses,
        "probe": probe,
        "breakthrough": breakthrough,
    }
