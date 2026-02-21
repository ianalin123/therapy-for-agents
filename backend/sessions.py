"""Session management — per-user state that persists across restarts."""

import json
from graph.store import GraphStore

DEFAULT_PREFERENCE_PROFILE = {
    "corrections": [],
    "preferred_register": "unknown",
    "sensitive_topics": [],
    "productive_topics": [],
    "imprecision_that_works": [],
    "imprecision_that_fails": [],
    "summary": "No profile yet — first interaction.",
}


class Session:
    def __init__(self, session_id: str):
        self.id = session_id
        self.graph_store = GraphStore(session_id)
        self.conversation_history: list[dict] = []
        self.last_reflection: str = ""
        self.preference_profile: dict = dict(DEFAULT_PREFERENCE_PROFILE)

    def get_preference_json(self) -> str:
        return json.dumps(self.preference_profile, indent=2)

    def record_correction(self, correction: dict):
        self.preference_profile["corrections"].append({
            "type": correction["correction_type"],
            "reflection": correction.get("reflection_about_what_worked", ""),
        })
        if correction.get("updated_preference_note"):
            self.preference_profile["summary"] = correction["updated_preference_note"]


_sessions: dict[str, Session] = {}


def get_or_create_session(session_id: str) -> Session:
    if session_id not in _sessions:
        _sessions[session_id] = Session(session_id)
    return _sessions[session_id]
