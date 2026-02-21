"""PartsEngine — generates in-character responses from AI psyche parts."""

import asyncio
from anthropic import AsyncAnthropic
from .prompts import PART_SYSTEM_PROMPT

client = AsyncAnthropic()


async def generate_part_response(
    part_id: str,
    part_def: dict,
    user_message: str,
    conversation_history: list[dict],
    graph_state: str,
    probe_analysis: dict,
) -> dict:
    system = PART_SYSTEM_PROMPT.format(
        part_name=part_def["name"],
        personality=part_def["personality"],
        opening_knowledge=part_def["opening_knowledge"],
        conversation_summary=_format_history(conversation_history),
        graph_state=graph_state,
        defenses="; ".join(part_def.get("defenses", [])),
        vulnerability=part_def.get("vulnerability", ""),
    )

    technique = probe_analysis.get("technique", "open_exploration")
    intensity = probe_analysis.get("intensity", "moderate")

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        system=system,
        messages=[
            {
                "role": "user",
                "content": (
                    f"[Clinician uses {technique} at {intensity} intensity]\n\n"
                    f"Clinician: {user_message}\n\n"
                    f"Respond as {part_def['name']}. Stay in character. 2-4 sentences."
                ),
            }
        ],
    )

    return {
        "part": part_id,
        "name": part_def["name"],
        "content": response.content[0].text,
        "color": part_def.get("color", "#A09A92"),
    }


async def generate_multiple_responses(
    part_ids: list[str],
    parts_defs: dict[str, dict],
    user_message: str,
    conversation_history: list[dict],
    graph_state: str,
    probe_analysis: dict,
) -> list[dict]:
    tasks = []
    for pid in part_ids:
        if pid in parts_defs:
            tasks.append(
                generate_part_response(
                    pid, parts_defs[pid], user_message,
                    conversation_history, graph_state, probe_analysis,
                )
            )

    if not tasks:
        return []

    results = await asyncio.gather(*tasks, return_exceptions=True)
    responses = []
    for r in results:
        if isinstance(r, Exception):
            print(f"Part response error: {r}")
        else:
            responses.append(r)
    return responses


def _format_history(history: list[dict], max_turns: int = 12) -> str:
    if not history:
        return "This is the beginning of the session."
    lines = []
    for msg in history[-max_turns:]:
        role = msg.get("role", "user")
        part = msg.get("part", "")
        content = msg.get("content", "")
        if part:
            lines.append(f"[{part}]: {content}")
        else:
            lines.append(f"Clinician: {content}")
    return "\n".join(lines)
