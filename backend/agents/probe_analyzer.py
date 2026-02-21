"""ProbeAnalyzer — determines which part(s) the clinician is addressing."""

import logging
import os

from anthropic import AsyncAnthropic
from .prompts import PROBE_ANALYZER_PROMPT

logger = logging.getLogger(__name__)

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

client = AsyncAnthropic()

ANALYSIS_TOOLS = [
    {
        "name": "analyze_probe",
        "description": "Analyze a clinician's message to determine which parts should respond.",
        "input_schema": {
            "type": "object",
            "properties": {
                "addressed_parts": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of part names that should respond (lowercase IDs)",
                },
                "technique": {
                    "type": "string",
                    "enum": [
                        "direct_question",
                        "confrontation",
                        "reflection",
                        "reframe",
                        "open_exploration",
                        "interpretation",
                        "empathic_validation",
                    ],
                    "description": "The therapeutic technique being used",
                },
                "intensity": {
                    "type": "string",
                    "enum": ["gentle", "moderate", "direct", "challenging"],
                    "description": "How much pressure the clinician is applying",
                },
                "summary": {
                    "type": "string",
                    "description": "Brief summary of what the clinician is probing for",
                },
            },
            "required": ["addressed_parts", "technique", "intensity", "summary"],
        },
    }
]


async def analyze_probe(
    user_message: str,
    part_names: list[str],
    conversation_history: list[dict],
) -> dict:
    system = PROBE_ANALYZER_PROMPT.format(part_names=", ".join(part_names))

    history_text = ""
    for msg in conversation_history[-10:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        history_text += f"{role}: {content}\n"

    response = await client.messages.create(
        model=MODEL,
        max_tokens=500,
        system=system,
        tools=ANALYSIS_TOOLS,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Recent conversation:\n{history_text}\n\n"
                    f"Latest clinician message:\n{user_message}\n\n"
                    f"Analyze which parts should respond."
                ),
            }
        ],
        timeout=30.0,
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "analyze_probe":
            return block.input

    logger.warning("ProbeAnalyzer did not return tool_use, using fallback")
    return {
        "addressed_parts": part_names[:1],
        "technique": "open_exploration",
        "intensity": "moderate",
        "summary": user_message[:100],
    }
