"""Session management — per-user state for AgentTherapy."""

from graph.store import GraphStore
from scenarios import get_scenario, DEFAULT_SCENARIO


class Session:
    def __init__(self, session_id: str, scenario_id: str = DEFAULT_SCENARIO):
        self.id = session_id
        self.scenario_id = scenario_id
        self.scenario = get_scenario(scenario_id)
        self.graph_store = GraphStore(session_id)
        self.conversation_history: list[dict] = []
        self.triggered_breakthroughs: list[str] = []

        self.graph_store.seed_from_scenario(self.scenario["seed_graph"])

    def part_names(self) -> list[str]:
        return list(self.scenario["parts"].keys())

    def parts_defs(self) -> dict[str, dict]:
        return self.scenario["parts"]


_sessions: dict[str, Session] = {}


def get_or_create_session(session_id: str, scenario_id: str = DEFAULT_SCENARIO) -> Session:
    if session_id not in _sessions:
        _sessions[session_id] = Session(session_id, scenario_id)
    return _sessions[session_id]
