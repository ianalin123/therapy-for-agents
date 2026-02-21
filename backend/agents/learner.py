"""Learner agent — classifies corrections and builds preference profile."""

import json
from anthropic import AsyncAnthropic
from .prompts import LEARNER_PROMPT

client = AsyncAnthropic()

preference_profile = {
    "corrections": [],
    "preferred_register": "unknown",
    "sensitive_topics": [],
    "productive_topics": [],
    "imprecision_that_works": [],
    "imprecision_that_fails": [],
    "summary": "No profile yet — first interaction.",
}

CLASSIFY_TOOLS = [
    {
        "name": "classify_correction",
        "description": "Classify a user's response to a reflection.",
        "input_schema": {
            "type": "object",
            "properties": {
                "correction_type": {
                    "type": "string",
                    "enum": ["productive", "clarifying", "rejecting", "agreement"],
                },
                "new_memory_unlocked": {"type": "boolean"},
                "reflection_about_what_worked": {"type": "string"},
                "updated_preference_note": {"type": "string"},
            },
            "required": ["correction_type", "new_memory_unlocked", "reflection_about_what_worked"],
        },
    }
]


async def classify_response(
    user_response: str,
    previous_reflection: str,
    conversation_history: list[dict],
) -> dict:
    system = LEARNER_PROMPT.format(current_profile=json.dumps(preference_profile, indent=2))

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=system,
        tools=CLASSIFY_TOOLS,
        messages=[
            {
                "role": "user",
                "content": f"Previous AI reflection: {previous_reflection}\n\nUser's response: {user_response}\n\nClassify this response.",
            }
        ],
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "classify_correction":
            result = block.input
            preference_profile["corrections"].append({
                "type": result["correction_type"],
                "reflection": result["reflection_about_what_worked"],
            })
            if result.get("updated_preference_note"):
                preference_profile["summary"] = result["updated_preference_note"]
            return result

    return {"correction_type": "agreement", "new_memory_unlocked": False, "reflection_about_what_worked": ""}


def get_preference_profile() -> str:
    return json.dumps(preference_profile, indent=2)
