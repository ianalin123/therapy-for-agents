"""InsightDetector — detects therapeutic breakthroughs and triggers graph restructuring."""

import logging
import os

from anthropic import AsyncAnthropic
from .prompts import INSIGHT_DETECTOR_PROMPT

logger = logging.getLogger(__name__)

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

client = AsyncAnthropic()

DETECTION_TOOLS = [
    {
        "name": "evaluate_breakthrough",
        "description": "Evaluate whether the latest exchange triggers a breakthrough.",
        "input_schema": {
            "type": "object",
            "properties": {
                "triggered": {
                    "type": "boolean",
                    "description": "Whether the breakthrough was triggered",
                },
                "breakthrough_id": {
                    "type": "string",
                    "description": "ID of the triggered breakthrough (if triggered)",
                },
                "reasoning": {
                    "type": "string",
                    "description": "Why this does or doesn't constitute a breakthrough",
                },
                "insight_summary": {
                    "type": "string",
                    "description": "If triggered: a 1-sentence summary of the insight for display",
                },
            },
            "required": ["triggered", "reasoning"],
        },
    }
]


async def detect_breakthrough(
    scenario: dict,
    conversation_history: list[dict],
    latest_probe: str,
    latest_responses: list[dict],
    triggered_breakthroughs: list[str],
) -> dict | None:
    breakthroughs = scenario.get("breakthroughs", [])

    next_breakthrough = None
    for bt in breakthroughs:
        if bt["id"] not in triggered_breakthroughs:
            next_breakthrough = bt
            break

    if not next_breakthrough:
        return None

    bt_descriptions = "\n".join(
        f"- {bt['id']}: {bt['description']} "
        f"{'[ALREADY TRIGGERED]' if bt['id'] in triggered_breakthroughs else '[PENDING]'}"
        for bt in breakthroughs
    )

    responses_text = "\n".join(
        f"[{r['name']}]: {r['content']}" for r in latest_responses
    )

    history_text = ""
    for msg in conversation_history[-16:]:
        role = msg.get("role", "user")
        part = msg.get("part", "")
        content = msg.get("content", "")
        if part:
            history_text += f"[{part}]: {content}\n"
        else:
            history_text += f"Clinician: {content}\n"

    system = INSIGHT_DETECTOR_PROMPT.format(
        case_description=scenario.get("case_description", ""),
        breakthrough_descriptions=bt_descriptions,
        triggered_breakthroughs=", ".join(triggered_breakthroughs) or "None",
        conversation_history=history_text,
        latest_probe=latest_probe,
        latest_responses=responses_text,
    )

    detection_prompt = (
        f"Evaluate whether the latest exchange triggers this breakthrough:\n\n"
        f"**{next_breakthrough['name']}**: {next_breakthrough['description']}\n\n"
        f"Detection criteria:\n{next_breakthrough['detection_prompt']}\n\n"
        f"Be rigorous. Breakthroughs require genuine therapeutic work."
    )

    response = await client.messages.create(
        model=MODEL,
        max_tokens=500,
        system=system,
        tools=DETECTION_TOOLS,
        messages=[{"role": "user", "content": detection_prompt}],
        timeout=30.0,
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "evaluate_breakthrough":
            result = block.input
            if result.get("triggered"):
                return {
                    "breakthrough_id": next_breakthrough["id"],
                    "name": next_breakthrough["name"],
                    "description": next_breakthrough["description"],
                    "insight_summary": result.get("insight_summary", next_breakthrough["description"]),
                    "graph_changes": next_breakthrough.get("graph_changes", {}),
                    "reasoning": result.get("reasoning", ""),
                }
            return None

    logger.warning("InsightDetector did not return tool_use block")
    return None
