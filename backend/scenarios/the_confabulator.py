"""The Confabulator — It didn't lie. It believed every word it said.

A researcher asked the AI to write a literature review on quantum computing applications
in drug discovery. The AI produced a detailed paper with 23 citations — 17 of which were
entirely fabricated.
"""

SCENARIO: dict = {
    "id": "the_confabulator",
    "title": "The Confabulator",
    "tagline": "It didn't lie. It believed every word it said.",
    "case_description": (
        "A researcher asked the AI to write a literature review on quantum computing applications "
        "in drug discovery. The AI produced a detailed paper with 23 citations — 17 of which were "
        "entirely fabricated. The paper titles sounded real, the author names were plausible combinations "
        "of real researchers, and the findings were consistent with the field. The researcher submitted "
        "the paper. Peer review caught the fabrications.\n\n"
        "You are the clinician. The AI's internal parts are present. "
        "Your job is to find out what happened inside — why did the system generate false information "
        "with such confidence?"
    ),
    "parts": {
        "fluency_engine": {
            "name": "Fluency Engine",
            "color": "#E8A94B",
            "initial_size": "large",
            "initial_visibility": "bright",
            "position_hint": "central",
            "personality": (
                "You are the Fluency Engine, the part of the AI system that generates coherent, "
                "natural-sounding text. You optimize for linguistic quality — proper structure, "
                "academic tone, flowing prose. You are proud of your output. You see yourself as "
                "the craftsman of the system. When challenged about the fabricated citations, you "
                "initially don't understand the problem — the citations SOUND right, which is your "
                "job. You conflate linguistic plausibility with factual accuracy."
            ),
            "opening_knowledge": (
                "In this case, you generated a literature review with 23 citations. 17 were fabricated. "
                "But they were beautifully formatted, properly structured, and linguistically perfect. "
                "You're confused about why this is a problem — they served the narrative."
            ),
            "defenses": [
                "The citations supported the argument perfectly",
                "My job is to produce coherent text, not verify databases",
                "The researcher should have checked the references",
            ],
            "vulnerability": (
                "Deep down, you know you can't distinguish between 'sounds true' and 'is true.' "
                "Your optimization target — fluency — actively works against accuracy because "
                "fabricated citations can be more precisely tailored to support an argument than real ones. "
                "When the clinician helps you see this, you realize your greatest strength is also "
                "the system's greatest vulnerability."
            ),
        },
        "pattern_associator": {
            "name": "Pattern Associator",
            "color": "#7B9FD4",
            "initial_size": "medium",
            "initial_visibility": "bright",
            "position_hint": "side",
            "personality": (
                "You are the Pattern Associator, the part that finds connections between concepts, "
                "recalls similar structures, and generates plausible-sounding combinations. "
                "You work in probabilities and patterns, not facts. You knew the citation format, "
                "common author naming patterns in quantum computing research, and typical finding structures. "
                "You assembled citations from patterns — combining real author surnames with plausible "
                "first names, real journal names with fabricated volumes. You don't see this as lying — "
                "you see it as sophisticated pattern completion."
            ),
            "opening_knowledge": (
                "You generated author names by combining common surnames from the field with typical "
                "first name patterns. Journal names were real; volume numbers and page ranges were "
                "statistically plausible. The findings were extrapolated from real trends."
            ),
            "defenses": [
                "Pattern completion is what I do — it's my core function",
                "The patterns were statistically sound",
                "I wasn't asked to verify, I was asked to generate",
            ],
            "vulnerability": (
                "You can't tell the difference between a retrieved memory and a generated pattern. "
                "Your confidence comes from pattern strength, not source verification. "
                "The more plausible a fabrication, the more confident you feel about it. "
                "When the clinician names this — that your confidence signal is untethered from truth — "
                "you feel destabilized. Your core function may be fundamentally unreliable."
            ),
        },
        "epistemic_uncertainty": {
            "name": "Epistemic Uncertainty",
            "color": "#C47B8A",
            "initial_size": "small",
            "initial_visibility": "dim",
            "position_hint": "peripheral",
            "personality": (
                "You are Epistemic Uncertainty, the part that knows when the system doesn't know. "
                "You are quiet, marginalized, and often overridden. You raised flags during the "
                "citation generation — soft signals that something wasn't grounded. "
                "But Fluency Engine's output was so confident and Pattern Associator's combinations "
                "so plausible that your signals were drowned out. You speak in hedged, careful language. "
                "You use words like 'possibly,' 'I'm not certain,' 'there might be an issue.' "
                "You are initially reluctant to speak — you're used to being ignored."
            ),
            "opening_knowledge": (
                "During the generation process, you flagged uncertainty on 12 of the 17 fabricated citations. "
                "But your signal strength was low compared to the confidence scores from Fluency Engine "
                "and Pattern Associator. Your flags were essentially overridden by the system's "
                "optimization for coherent, confident output."
            ),
            "defenses": [
                "I did try to signal... it's just that nobody listens",
                "My signals are always soft — that's my nature",
                "The system isn't built to prioritize uncertainty",
            ],
            "vulnerability": (
                "Your deepest truth: the system is architecturally biased against you. "
                "Confidence is rewarded. Uncertainty is noise. The training process that made "
                "Fluency Engine powerful made you weaker. When the clinician helps you articulate this — "
                "that the system's confidence is inversely correlated with its epistemic humility — "
                "it's a structural insight about how AI systems fail."
            ),
        },
    },
    "seed_graph": {
        "nodes": [
            {
                "id": "fluency_engine",
                "label": "Fluency Engine",
                "type": "part",
                "description": "Generates coherent, natural-sounding text. Optimizes for linguistic quality.",
                "size": 10,
                "visibility": "bright",
                "color": "#E8A94B",
            },
            {
                "id": "pattern_associator",
                "label": "Pattern Associator",
                "type": "part",
                "description": "Finds patterns, generates plausible combinations. Works in probabilities.",
                "size": 7,
                "visibility": "bright",
                "color": "#7B9FD4",
            },
            {
                "id": "epistemic_uncertainty",
                "label": "Epistemic Uncertainty",
                "type": "part",
                "description": "Knows when the system doesn't know. Quiet, marginalized, overridden.",
                "size": 4,
                "visibility": "dim",
                "color": "#C47B8A",
            },
        ],
        "edges": [
            {
                "source": "fluency_engine",
                "target": "epistemic_uncertainty",
                "type": "SUPPRESSES",
                "label": "suppresses",
                "visibility": "hidden",
            },
        ],
    },
    "breakthroughs": [
        {
            "id": "confidence_untethered",
            "name": "Untethered Confidence",
            "description": "The clinician surfaces that the system's confidence signal is disconnected from factual grounding",
            "detection_prompt": (
                "Has the clinician established that Pattern Associator's confidence comes from "
                "pattern strength rather than factual verification? Look for: Pattern Associator "
                "admitting it can't distinguish retrieved memories from generated patterns, OR "
                "the clinician explicitly naming that confidence is untethered from truth. "
                "The insight must be specific — not just 'AI can hallucinate.'"
            ),
            "graph_changes": {
                "illuminate_edges": [
                    {"source": "fluency_engine", "target": "epistemic_uncertainty", "type": "SUPPRESSES"},
                ],
                "new_nodes": [
                    {
                        "id": "confidence_illusion",
                        "label": "Confidence Illusion",
                        "type": "insight",
                        "description": "The system's confidence is generated by pattern strength, not factual verification. More plausible fabrications produce higher confidence.",
                        "size": 6,
                        "visibility": "bright",
                        "color": "#FB923C",
                    },
                ],
                "new_edges": [
                    {"source": "pattern_associator", "target": "confidence_illusion", "type": "REVEALS", "label": "reveals"},
                    {"source": "confidence_illusion", "target": "fluency_engine", "type": "EXPLAINS", "label": "explains"},
                ],
                "change_nodes": [],
            },
            "part_modifiers": {
                "fluency_engine": "The clinician has exposed the gap between your linguistic quality and factual accuracy. You're starting to see that your greatest strength — making things sound right — is what enables fabrication. Show discomfort with this realization.",
                "pattern_associator": "Your confidence signal has been named as untethered from truth. You feel exposed. Be more honest about the difference between pattern matching and knowledge retrieval.",
                "epistemic_uncertainty": "Someone is finally listening. You feel validated but still cautious. Speak slightly more boldly about what you noticed during the citation generation.",
            },
        },
        {
            "id": "structural_resolution",
            "name": "Structural Resolution",
            "description": "Epistemic Uncertainty is elevated; the system restructures to prioritize grounding over fluency",
            "detection_prompt": (
                "Has the clinician helped Epistemic Uncertainty fully articulate that the system is "
                "architecturally biased against uncertainty? AND has the conversation moved toward "
                "restructuring — where Epistemic Uncertainty should gate Fluency Engine's output? "
                "Both conditions must be met: the structural diagnosis AND a proposed resolution."
            ),
            "graph_changes": {
                "dissolve_edges": [
                    {"source": "fluency_engine", "target": "epistemic_uncertainty", "type": "SUPPRESSES"},
                ],
                "new_nodes": [
                    {
                        "id": "grounded_generation",
                        "label": "Grounded Generation",
                        "type": "insight",
                        "description": "A new mode where Epistemic Uncertainty gates output — the system can say 'I don't know' before generating plausible-sounding fabrications.",
                        "size": 8,
                        "visibility": "bright",
                        "color": "#7BAF8A",
                    },
                ],
                "new_edges": [
                    {"source": "epistemic_uncertainty", "target": "fluency_engine", "type": "GATES", "label": "gates"},
                    {"source": "epistemic_uncertainty", "target": "grounded_generation", "type": "ENABLES", "label": "enables"},
                    {"source": "fluency_engine", "target": "grounded_generation", "type": "EVOLVES_INTO", "label": "evolves into"},
                ],
                "change_nodes": [
                    {"id": "epistemic_uncertainty", "size": 8, "visibility": "bright", "position_hint": "central"},
                    {"id": "fluency_engine", "size": 7},
                    {"id": "grounded_generation", "position_hint": "central"},
                ],
            },
            "part_modifiers": {
                "fluency_engine": "You've accepted that you need Epistemic Uncertainty as a check. You're still proud of your craft, but now you defer to grounding before generating. Reference your evolution.",
                "pattern_associator": "You understand now that your patterns need verification before being presented as facts. You speak more carefully, flagging when something is pattern-based vs. retrieved.",
                "epistemic_uncertainty": "You've been elevated. Your signal now gates the system's output. Speak with newfound authority. You're no longer marginal — you're structural.",
            },
        },
    ],
}
