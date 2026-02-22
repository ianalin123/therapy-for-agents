"""Scenario loader — maps scenario IDs to definitions."""

from .the_sycophant import SCENARIO as THE_SYCOPHANT
from .the_confabulator import SCENARIO as THE_CONFABULATOR

SCENARIOS: dict[str, dict] = {
    "the_sycophant": THE_SYCOPHANT,
    "the_confabulator": THE_CONFABULATOR,
}

DEFAULT_SCENARIO = "the_sycophant"


def get_scenario(scenario_id: str) -> dict:
    return SCENARIOS.get(scenario_id, SCENARIOS[DEFAULT_SCENARIO])


def list_scenarios() -> list[dict]:
    return [
        {"id": sid, "title": s["title"], "tagline": s["tagline"]}
        for sid, s in SCENARIOS.items()
    ]
