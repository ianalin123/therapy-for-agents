"""Grief companion knowledge graph schema for Graphiti."""

from enum import Enum


class NodeType(str, Enum):
    MEMORY = "memory"
    PERSON = "person"
    VALUE = "value"
    EMOTION = "emotion"
    RITUAL = "ritual"
    PLACE = "place"
    ARTIFACT = "artifact"


class EdgeType(str, Enum):
    FELT_DURING = "felt_during"
    CONNECTED_TO = "connected_to"
    REMINDS_OF = "reminds_of"
    VALUED_BY = "valued_by"
    ASSOCIATED_WITH = "associated_with"
    EVOLVED_FROM = "evolved_from"
    CONTRADICTS = "contradicts"


NODE_COLORS = {
    NodeType.MEMORY: "#E8A94B",
    NodeType.PERSON: "#F0EDE8",
    NodeType.VALUE: "#C47B8A",
    NodeType.EMOTION: "#7B9FD4",
    NodeType.RITUAL: "#7BAF8A",
    NodeType.PLACE: "#FB923C",
    NodeType.ARTIFACT: "#F472B6",
}
