"""Initialize Graphiti with Neo4j for the grief companion."""

import os
from dotenv import load_dotenv
from graphiti_core import Graphiti
from graphiti_core.llm_client import OpenAIClient
from graphiti_core.llm_client.config import LLMConfig

load_dotenv()


async def create_graphiti_client() -> Graphiti:
    """Create and initialize Graphiti client connected to Neo4j.

    Uses OpenAI for Graphiti's internal LLM calls (entity extraction,
    graph operations) since graphiti-core 0.7 only supports OpenAI natively.
    The agent pipeline uses Claude separately via the Anthropic SDK.
    """
    llm_config = LLMConfig(
        api_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4o-mini",
    )
    llm_client = OpenAIClient(config=llm_config)

    client = Graphiti(
        uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
        user=os.getenv("NEO4J_USER", "neo4j"),
        password=os.getenv("NEO4J_PASSWORD", "grieflygrief2026"),
        llm_client=llm_client,
    )

    await client.build_indices_and_constraints()
    return client
