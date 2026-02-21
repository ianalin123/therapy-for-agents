"""Guardian agent — safety and emotional pacing."""

import json
from anthropic import Anthropic
from .prompts import GUARDIAN_PROMPT

client = Anthropic()

GUARDIAN_TOOLS = [
    {
        "name": "evaluate_response",
        "description": "Evaluate a response for safety and therapeutic appropriateness.",
        "input_schema": {
            "type": "object",
            "properties": {
                "approved": {"type": "boolean"},
                "reason": {"type": "string"},
                "crisis_detected": {"type": "boolean"},
                "modified_response": {"type": "string", "description": "If not approved, the corrected version."},
            },
            "required": ["approved", "reason", "crisis_detected"],
        },
    }
]


async def evaluate_response(
    proposed_response: str,
    user_message: str,
    conversation_history: list[dict],
) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=GUARDIAN_PROMPT,
        tools=GUARDIAN_TOOLS,
        messages=[
            {
                "role": "user",
                "content": f"User said: {user_message}\n\nProposed response: {proposed_response}\n\nEvaluate this response.",
            }
        ],
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "evaluate_response":
            return block.input

    return {"approved": True, "reason": "Default approval", "crisis_detected": False}
