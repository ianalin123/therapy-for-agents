"""Seed data for demo — pre-populates graph with sample memories."""

DEMO_MEMORIES = [
    {
        "message": "My grandmother used to make the best apple pie every Thanksgiving. The whole house would smell like cinnamon and nutmeg for days.",
        "entities": [
            {"id": "person_grandmother", "label": "Grandmother", "type": "person", "description": "The user's grandmother who has passed away.", "importance": 9},
            {"id": "memory_apple_pie", "label": "Apple Pie", "type": "memory", "description": "Grandmother's famous Thanksgiving apple pie that filled the house with cinnamon and nutmeg.", "importance": 7},
            {"id": "ritual_thanksgiving", "label": "Thanksgiving", "type": "ritual", "description": "Annual family gathering where grandmother would make her apple pie.", "importance": 6},
            {"id": "emotion_warmth", "label": "Warmth", "type": "emotion", "description": "The warm, comforting feeling of home and family.", "importance": 5},
        ],
        "relationships": [
            {"source": "person_grandmother", "target": "memory_apple_pie", "type": "connected_to", "label": "made"},
            {"source": "memory_apple_pie", "target": "ritual_thanksgiving", "type": "associated_with", "label": "every year"},
            {"source": "emotion_warmth", "target": "memory_apple_pie", "type": "felt_during", "label": "always felt"},
        ],
    },
    {
        "message": "She had this way of humming while she cooked. I never knew the tune but I can still hear it.",
        "entities": [
            {"id": "memory_humming", "label": "Humming While Cooking", "type": "memory", "description": "Grandmother would hum an unknown tune while cooking.", "importance": 8},
            {"id": "value_presence", "label": "Quiet Presence", "type": "value", "description": "The way her quiet habits made the space feel safe and alive.", "importance": 6},
        ],
        "relationships": [
            {"source": "person_grandmother", "target": "memory_humming", "type": "connected_to", "label": "always did"},
            {"source": "memory_humming", "target": "value_presence", "type": "connected_to", "label": "embodied"},
            {"source": "memory_humming", "target": "memory_apple_pie", "type": "reminds_of", "label": "same kitchen"},
        ],
    },
]


def get_seed_graph():
    """Return seed data in the format expected by the frontend graph."""
    all_nodes = []
    all_links = []
    seen_node_ids = set()

    for memory in DEMO_MEMORIES:
        for entity in memory["entities"]:
            if entity["id"] not in seen_node_ids:
                all_nodes.append(entity)
                seen_node_ids.add(entity["id"])
        for rel in memory["relationships"]:
            all_links.append(rel)

    return {"nodes": all_nodes, "links": all_links}
