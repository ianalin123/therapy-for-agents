"""Reflector agent — finds patterns and generates productive imprecision."""

from anthropic import Anthropic
from .prompts import REFLECTOR_PROMPT

client = Anthropic()


async def generate_reflection(
    user_message: str,
    graph_summary: str,
    conversation_history: list[dict],
    preference_profile: str = "No profile yet — first interaction.",
) -> str:
    system = REFLECTOR_PROMPT.format(
        preference_profile=preference_profile,
        graph_summary=graph_summary,
    )

    messages = conversation_history + [
        {"role": "user", "content": user_message},
    ]

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        system=system,
        messages=messages,
    )

    return response.content[0].text
