# Frontend Improvement Plan: Hackathon Demo Polish + Clinical Modalities Expansion

## Problem Statement

The current frontend is functional but reads as "vibe-coded" — it works, but the visual design lacks intentionality, hierarchy, and the kind of polish that makes a hackathon demo memorable. Additionally, the project currently frames itself only as "therapy for AI agents" (AI is the patient), but the pasted-content research reveals a compelling second angle: **AI agents as simulated patients for training human therapists**, with different clinical modalities.

---

## Part 1: De-Vibecoding the Frontend

### What "vibe-coded" looks like right now

| Issue | Current State | Why It Hurts |
|-------|--------------|--------------|
| **No visual hierarchy** | White/dark background with floating panels, no clear zones | The eye doesn't know where to look first |
| **Generic header** | Plain text "AgentTherapy The Sycophant" | No brand weight, looks like a dev placeholder |
| **Persona Vectors panel** | Basic colored bars floating top-left | Looks like a debug dashboard, not a clinical instrument |
| **Session Transcript** | Raw text with colored names, no message framing | Reads like console output, not a therapy session log |
| **Input bar** | Minimal text input + "Send" button | No personality, could be any chat app |
| **Graph area** | Sparse nodes on blank canvas, no framing | The most impressive feature has no visual context |
| **Case File Overlay** | Functional but plain modal | Doesn't set the tone for the experience |
| **Warmth indicator** | Small floating pill at bottom | Easy to miss, unclear what it means |

### Design Changes

**1. Layout Structure — Three-Column Clinical Interface**
- **Left sidebar** (280px): Scenario info, Persona Vectors, clinical modality selector, session metadata
- **Center** (flex): Graph visualization with subtle grid/radial background pattern
- **Right sidebar** (320px): Session Transcript with proper message bubbles, agent pipeline status

**2. Header — Branded Top Bar**
- Full-width bar with logo mark, scenario title as a proper heading, session timer, and modality badge
- Subtle bottom border with accent gradient

**3. Persona Vectors — Clinical Gauge Design**
- Replace flat bars with semicircular gauges or radial indicators
- Add labels that read like clinical metrics, not debug values
- Group under "Clinical Indicators" heading

**4. Session Transcript — Proper Chat Design**
- User messages right-aligned with subtle background
- Part responses left-aligned with colored left-border accent (matching part color)
- Timestamps between message groups
- "Processing..." state with animated typing indicator that shows which agent is active

**5. Input Bar — Therapeutic Context**
- Wider input with subtle inner shadow
- Dynamic placeholder that changes based on session state ("Begin by addressing a part...", "Probe deeper...", "Challenge that assumption...")
- Voice button with proper microphone icon and recording state

**6. Graph Background — Contextual Canvas**
- Subtle radial gradient from center (dark) to edges (slightly lighter)
- Faint concentric circles or grid dots to give depth perception
- Subtle vignette effect at edges

**7. Case File Overlay — Clinical Dossier Feel**
- Styled like a manila folder / case file with "CLASSIFIED" or "CASE FILE #001" stamp
- Typewriter-style text for the case description
- Animated reveal of parts (fade in sequentially)

---

## Part 2: Clinical Modalities Expansion — Tool for Therapists

### The Angle

The current demo shows: "AI is the patient, human is the clinician."

The expanded vision shows: "This same framework can train human therapists by simulating patients across different clinical modalities."

### What to Add

**1. Modality Selector (Left Sidebar)**

A dropdown or tab group showing available therapeutic frameworks:

| Modality | Description | How It Maps |
|----------|-------------|-------------|
| **IFS (Internal Family Systems)** | Current default — parts-based therapy | Direct mapping: parts = IFS parts |
| **CBT (Cognitive Behavioral Therapy)** | Identify cognitive distortions, challenge automatic thoughts | Parts become "Automatic Thought", "Core Belief", "Behavioral Pattern" |
| **Psychodynamic** | Unconscious drives, defense mechanisms, transference | Parts become "Conscious Self", "Defense Mechanism", "Unconscious Drive" |
| **DBT (Dialectical Behavior Therapy)** | Emotional regulation, distress tolerance | Parts become "Emotional Mind", "Rational Mind", "Wise Mind" |
| **Motivational Interviewing** | Ambivalence, change talk, sustain talk | Parts become "Change Talk", "Sustain Talk", "Ambivalence" |

**2. "For Therapists" Section (Accessible from Header)**

A slide-out panel or modal that explains the training use case:
- "Practice with AI patients before seeing real clients"
- "Get timestamped feedback on your therapeutic technique"
- "Simulate rare clinical scenarios safely"
- "Track skill development across sessions"

**3. Session Feedback Panel (Post-Session)**

After a breakthrough or session end, show a feedback summary:
- Techniques identified (reflection, confrontation, reframing)
- Moments flagged ("You interrupted at 2:14", "Missed emotional cue at 5:30")
- Skill rating across dimensions
- This is a **mockup** — it shows what the platform *could* do, not what it does today

**4. Modality Badge in Header**

Show the current therapeutic framework as a badge next to the scenario title:
`[IFS] The Sycophant` or `[CBT] The Catastrophizer`

---

## Implementation Priority

1. **Layout restructure** — Three-column layout with proper zones (highest impact)
2. **Header redesign** — Branded, informative top bar
3. **Transcript polish** — Proper message bubbles with part colors
4. **Input bar upgrade** — Dynamic placeholders, better styling
5. **Graph background** — Subtle depth cues
6. **Modality selector** — Left sidebar with framework options (visual only for now)
7. **"For Therapists" panel** — Explains the expanded vision
8. **Session feedback mockup** — Post-breakthrough skill summary

All changes are **frontend-only** and maintain full compatibility with the existing WebSocket backend.
