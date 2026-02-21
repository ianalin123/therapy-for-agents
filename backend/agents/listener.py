"""Listener agent — extracts entities and relationships from user input."""

from anthropic import AsyncAnthropic
from .prompts import LISTENER_PROMPT

client = AsyncAnthropic()

EXTRACTION_TOOLS = [
    {
        "name": "extract_entities",
        "description": "Extract entities and relationships from the user's message.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entities": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string", "description": "Reuse an existing node ID if this entity matches one, otherwise create a new unique ID like 'memory_bike_rides'"},
                            "label": {"type": "string", "description": "Short label (2-5 words)"},
                            "type": {"type": "string", "enum": ["memory", "person", "value", "emotion", "ritual", "place", "artifact"]},
                            "description": {"type": "string", "description": "1-2 sentence description"},
                            "importance": {"type": "integer", "minimum": 1, "maximum": 10},
                            "is_update": {"type": "boolean", "description": "True if this updates an existing node rather than creating a new one"},
                        },
                        "required": ["id", "label", "type", "description", "importance"],
                    },
                },
                "relationships": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source": {"type": "string"},
                            "target": {"type": "string"},
                            "type": {"type": "string", "enum": ["felt_during", "connected_to", "reminds_of", "valued_by", "associated_with", "evolved_from", "contradicts"]},
                            "label": {"type": "string", "description": "Short description of relationship"},
                        },
                        "required": ["source", "target", "type"],
                    },
                },
            },
            "required": ["entities", "relationships"],
        },
    }
]


async def extract_entities(
    user_message: str,
    graph_context: str = "",
    existing_nodes: str = "",
) -> dict:
    node_section = ""
    if existing_nodes and existing_nodes != "No nodes yet.":
        node_section = (
            f"\n\nExisting graph nodes (reuse these IDs if the entity matches, set is_update=true):\n"
            f"{existing_nodes}\n\n"
            f"IMPORTANT: If an entity matches an existing node, reuse its exact ID and set is_update=true.\n"
            f"Only create new IDs for genuinely new entities."
        )

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system=LISTENER_PROMPT,
        tools=EXTRACTION_TOOLS,
        messages=[
            {
                "role": "user",
                "content": f"Current graph context:\n{graph_context}{node_section}\n\nUser message:\n{user_message}",
            }
        ],
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "extract_entities":
            return block.input

    return {"entities": [], "relationships": []}
