"""
Knowledge Router — classifies a query into one of three modes:

  general  → LLM-only, Cognee bypassed
  memory   → Cognee-only, LLM just formats the retrieved text (no hallucination)
  hybrid   → Cognee retrieval + LLM reasoning combined (default)

Used when the client sends mode="auto".  Explicit mode from the client always wins.
"""
from __future__ import annotations
import re

# Phrases that strongly indicate the user is asking about something stored in memory
_MEMORY_PATTERNS = [
    r"\bdo you remember\b",
    r"\bwhat did i (tell|say|share|mention)\b",
    r"\bwhat do you know about me\b",
    r"\bmy name\b",
    r"\bdid i tell you\b",
    r"\bwhat have i (told|shared)\b",
    r"\bremember when\b",
    r"\brecall what\b",
    r"\bfrom my memory\b",
    r"\bwhat('s| is) my\b",
    r"\bwhere do i (live|work|study)\b",
    r"\bwho am i\b",
    r"\btell me what you (know|remember) about me\b",
    r"\bmy (project|goal|preference|team|company|email|age)\b",
]

# Phrases that signal a pure factual / world-knowledge question with no personal context
_GENERAL_PATTERNS = [
    r"^what is ",
    r"^what are ",
    r"^how does ",
    r"^how do ",
    r"^explain ",
    r"^define ",
    r"^describe ",
    r"^tell me about ",
    r"^who (is|was|invented|created|discovered) ",
    r"^when (was|did|is) ",
    r"^why (is|does|did|do) ",
    r"^what('s| is) the (difference|meaning|definition|purpose)",
    r"^can you explain",
    r"^give me an? (example|overview|summary)",
]

# Words that pull a "general pattern" match back to hybrid (personal context present)
_PERSONAL_SIGNALS = [
    r"\bmy\b", r"\bi\b", r"\bme\b", r"\bmine\b",
    r"\bi've\b", r"\bi'm\b", r"\bour\b", r"\bwe\b",
]


def route(message: str) -> str:
    """Return 'general', 'memory', or 'hybrid'."""
    msg = message.lower().strip()

    if any(re.search(p, msg) for p in _MEMORY_PATTERNS):
        return "memory"

    if any(re.search(p, msg) for p in _GENERAL_PATTERNS):
        has_personal = any(re.search(p, msg) for p in _PERSONAL_SIGNALS)
        if not has_personal:
            return "general"

    return "hybrid"
