"""GraphStore — canonical server-side graph state with persistence and diffing."""

import json
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional


class GraphStore:
    def __init__(self, session_id: str, data_dir: str = "data/sessions"):
        self.session_id = session_id
        self._data_dir = Path(data_dir)
        self._nodes: dict[str, dict] = {}
        self._edges: list[dict] = []
        self._history: list[dict] = []
        self._turn: int = 0
        self._load()

    def _file_path(self) -> Path:
        return self._data_dir / f"{self.session_id}.json"

    def _load(self):
        path = self._file_path()
        if path.exists():
            with open(path) as f:
                data = json.load(f)
            self._nodes = {n["id"]: n for n in data.get("nodes", [])}
            self._edges = data.get("edges", [])
            self._history = data.get("history", [])
            self._turn = data.get("turn", 0)

    def _save(self):
        self._data_dir.mkdir(parents=True, exist_ok=True)
        with open(self._file_path(), "w") as f:
            json.dump({
                "nodes": list(self._nodes.values()),
                "edges": self._edges,
                "history": self._history,
                "turn": self._turn,
            }, f, indent=2)

    @property
    def turn(self) -> int:
        return self._turn

    def advance_turn(self):
        self._turn += 1

    def upsert_node(self, node: dict) -> tuple[dict, str]:
        node_id = node["id"]
        if node_id in self._nodes:
            old = self._nodes[node_id].copy()
            self._nodes[node_id].update(node)
            changes = {
                k: {"old": old.get(k), "new": node[k]}
                for k in node if old.get(k) != node.get(k) and k != "id"
            }
            if changes:
                self._history.append({
                    "turn": self._turn,
                    "action": "update_node",
                    "nodeId": node_id,
                    "changes": changes,
                })
            self._save()
            return self._nodes[node_id], "updated"
        else:
            self._nodes[node_id] = node
            self._history.append({
                "turn": self._turn,
                "action": "create_node",
                "nodeId": node_id,
            })
            self._save()
            return node, "created"

    def update_node(self, node_id: str, changes: dict) -> Optional[dict]:
        if node_id not in self._nodes:
            return None
        old = self._nodes[node_id].copy()
        self._nodes[node_id].update(changes)
        diff = {
            k: {"old": old.get(k), "new": changes[k]}
            for k in changes if old.get(k) != changes.get(k) and k != "id"
        }
        if diff:
            self._history.append({
                "turn": self._turn,
                "action": "update_node",
                "nodeId": node_id,
                "changes": diff,
            })
        self._save()
        return self._nodes[node_id]

    def remove_node(self, node_id: str):
        if node_id in self._nodes:
            del self._nodes[node_id]
            self._edges = [
                e for e in self._edges
                if e["source"] != node_id and e["target"] != node_id
            ]
            self._history.append({
                "turn": self._turn, "action": "remove_node", "nodeId": node_id,
            })
            self._save()

    def upsert_edge(self, edge: dict):
        key = (edge["source"], edge["target"], edge["type"])
        for existing in self._edges:
            if (existing["source"], existing["target"], existing["type"]) == key:
                existing.update(edge)
                self._save()
                return
        self._edges.append(edge)
        self._history.append({
            "turn": self._turn, "action": "create_edge",
            "source": edge["source"], "target": edge["target"], "type": edge["type"],
        })
        self._save()

    def remove_edge(self, source: str, target: str, edge_type: str):
        before = len(self._edges)
        self._edges = [
            e for e in self._edges
            if not (e["source"] == source and e["target"] == target and e["type"] == edge_type)
        ]
        if len(self._edges) < before:
            self._history.append({
                "turn": self._turn, "action": "remove_edge",
                "source": source, "target": target, "type": edge_type,
            })
            self._save()

    def get_node(self, node_id: str) -> Optional[dict]:
        return self._nodes.get(node_id)

    def find_similar(self, label: str, node_type: str, threshold: float = 0.6) -> Optional[dict]:
        best_match = None
        best_score = 0.0
        label_lower = label.lower()
        for node in self._nodes.values():
            if node["type"] != node_type:
                continue
            score = SequenceMatcher(None, label_lower, node["label"].lower()).ratio()
            if score > best_score and score >= threshold:
                best_score = score
                best_match = node
        return best_match

    def node_list_for_prompt(self) -> str:
        if not self._nodes:
            return "No nodes yet."
        lines = []
        for n in self._nodes.values():
            lines.append(f'- {n["id"]}: "{n["label"]}" ({n["type"]})')
        return "\n".join(lines)

    def snapshot(self) -> dict:
        return {
            "nodes": list(self._nodes.values()),
            "links": self._edges,
            "turn": self._turn,
        }

    def node_changes_since(self, since_turn: int) -> list[dict]:
        changes = []
        for entry in self._history:
            if entry["turn"] <= since_turn:
                continue
            if entry.get("action") == "update_node":
                for field, vals in entry.get("changes", {}).items():
                    changes.append({
                        "nodeId": entry["nodeId"],
                        "field": field,
                        "oldValue": vals["old"],
                        "newValue": vals["new"],
                    })
        return changes
