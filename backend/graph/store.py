"""GraphStore — canonical server-side graph state with persistence and diffing.

Supports therapy-specific operations: edge illumination/dissolution,
node visibility/size changes, and breakthrough-driven restructuring.
"""

import json
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

    # ---- Node operations ----

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
                    "turn": self._turn, "action": "update_node",
                    "nodeId": node_id, "changes": changes,
                })
            self._save()
            return self._nodes[node_id], "updated"
        else:
            self._nodes[node_id] = node
            self._history.append({
                "turn": self._turn, "action": "create_node", "nodeId": node_id,
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
                "turn": self._turn, "action": "update_node",
                "nodeId": node_id, "changes": diff,
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

    def get_node(self, node_id: str) -> Optional[dict]:
        return self._nodes.get(node_id)

    # ---- Edge operations ----

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

    def illuminate_edge(self, source: str, target: str, edge_type: str):
        """Make a hidden edge visible (for breakthrough reveals)."""
        for edge in self._edges:
            if edge["source"] == source and edge["target"] == target and edge["type"] == edge_type:
                edge["visibility"] = "bright"
                self._history.append({
                    "turn": self._turn, "action": "illuminate_edge",
                    "source": source, "target": target, "type": edge_type,
                })
                self._save()
                return

    # ---- Therapy-specific: apply breakthrough graph changes ----

    def apply_breakthrough(self, graph_changes: dict) -> dict:
        """Apply a full breakthrough restructuring and return the diff for the frontend."""
        diff: dict = {
            "illuminated_edges": [],
            "dissolved_edges": [],
            "new_nodes": [],
            "new_edges": [],
            "changed_nodes": [],
        }

        for edge_spec in graph_changes.get("illuminate_edges", []):
            self.illuminate_edge(edge_spec["source"], edge_spec["target"], edge_spec["type"])
            diff["illuminated_edges"].append(edge_spec)

        for edge_spec in graph_changes.get("dissolve_edges", []):
            self.remove_edge(edge_spec["source"], edge_spec["target"], edge_spec["type"])
            diff["dissolved_edges"].append(edge_spec)

        for node_spec in graph_changes.get("new_nodes", []):
            self.upsert_node(node_spec)
            diff["new_nodes"].append(node_spec)

        for edge_spec in graph_changes.get("new_edges", []):
            self.upsert_edge(edge_spec)
            diff["new_edges"].append(edge_spec)

        for change in graph_changes.get("change_nodes", []):
            node_id = change.pop("id", None) or change.get("id")
            if node_id:
                self.update_node(node_id, change)
                diff["changed_nodes"].append({"id": node_id, **change})

        return diff

    # ---- Seed graph from scenario ----

    def seed_from_scenario(self, seed_graph: dict):
        """Load initial graph state from a scenario definition."""
        if self._nodes:
            return
        for node in seed_graph.get("nodes", []):
            self._nodes[node["id"]] = node
        self._edges = list(seed_graph.get("edges", []))
        self._save()

    # ---- Query helpers ----

    def graph_state_for_prompt(self) -> str:
        """Human-readable graph state for injecting into part prompts."""
        if not self._nodes:
            return "Graph is empty."
        lines = ["Nodes:"]
        for n in self._nodes.values():
            vis = n.get("visibility", "bright")
            size = n.get("size", 5)
            lines.append(f'  - {n["id"]}: "{n["label"]}" (type={n["type"]}, size={size}, visibility={vis})')
        if self._edges:
            lines.append("Edges:")
            for e in self._edges:
                vis = e.get("visibility", "visible")
                lines.append(f'  - {e["source"]} --{e["type"]}--> {e["target"]} (visibility={vis})')
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
