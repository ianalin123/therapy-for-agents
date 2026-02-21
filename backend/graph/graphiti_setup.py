"""Initialize Graphiti with Neo4j for the grief companion."""

import os
from dotenv import load_dotenv
from graphiti_core import Graphiti
from graphiti_core.llm_client import AnthropicClient

load_dotenv()


async def create_graphiti_client() -> Graphiti:
    """Create and initialize Graphiti client connected to Neo4j."""
    llm_client = AnthropicClient(
        api_key=os.getenv("ANTHROPIC_API_KEY"),
        model="claude-sonnet-4-20250514",
    )

    client = Graphiti(
        uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
        user=os.getenv("NEO4J_USER", "neo4j"),
        password=os.getenv("NEO4J_PASSWORD", "brieflygrief2026"),
        llm_client=llm_client,
    )

    await client.build_indices_and_constraints()
    return client
