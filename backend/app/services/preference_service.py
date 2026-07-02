"""
Preference Service — learns and stores user preferences.
Preferences influence recall ranking and agent responses.
Stored separately from factual memories.
"""
from __future__ import annotations
import re
from typing import Dict, List, Optional
from datetime import datetime

from app.models.preference import UserPreference

_preferences: Dict[str, UserPreference] = {}

# Keyword patterns to detect preference statements
PREFER_PATTERNS = [
    (r'\bi prefer\b (.+)', 'prefer', 1.0),
    (r'\bi always use\b (.+)', 'technology', 1.2),
    (r'\bi like\b (.+)', 'prefer', 0.8),
    (r'\buse (.+?) (always|for everything)', 'technology', 1.1),
    (r'\bdon\'t (use|recommend|suggest)\b (.+)', 'avoid', 1.0),
    (r'\bnever (use|recommend|suggest)\b (.+)', 'avoid', 1.2),
    (r'\bmy favorite\b (.+)', 'prefer', 1.3),
    (r'\bi hate\b (.+)', 'avoid', 1.1),
    (r'\bprefer (.+?) (over|instead of)\b', 'prefer', 1.0),
    (r'\bi work with\b (.+)', 'technology', 0.9),
    (r'\bmy (team|company|project) uses\b (.+)', 'technology', 0.9),
]

TECH_KEYWORDS = {
    'library': ['react', 'vue', 'angular', 'jquery', 'fastapi', 'flask', 'django', 'express', 'next'],
    'database': ['postgres', 'mysql', 'mongodb', 'sqlite', 'redis', 'neo4j', 'cassandra'],
    'architecture': ['microservices', 'monolith', 'singleton', 'mvc', 'rest', 'graphql', 'grpc'],
    'language': ['python', 'javascript', 'typescript', 'go', 'rust', 'java', 'kotlin'],
    'style': ['verbose', 'concise', 'brief', 'detailed', 'step-by-step'],
}


def _detect_category(value: str) -> str:
    val_lower = value.lower()
    for cat, keywords in TECH_KEYWORDS.items():
        if any(kw in val_lower for kw in keywords):
            return cat
    return 'general'


def extract_preferences(user_message: str) -> List[UserPreference]:
    """Extract preferences from a user message. Returns newly created preferences."""
    msg_lower = user_message.lower().strip()
    new_prefs = []

    for pattern, pref_type, strength_mult in PREFER_PATTERNS:
        match = re.search(pattern, msg_lower)
        if not match:
            continue
        value = match.group(1).strip().rstrip('.,!?')
        if len(value) < 2 or len(value) > 100:
            continue

        key = _detect_category(value)
        # Check if we already have this preference
        existing = next(
            (p for p in _preferences.values()
             if p.category == pref_type and p.value.lower() == value and p.is_active),
            None,
        )
        if existing:
            existing.strength = min(2.0, existing.strength + 0.1)
            existing.updated_at = datetime.utcnow()
            continue

        pref = UserPreference(
            category=pref_type,
            key=key,
            value=value,
            strength=round(min(2.0, strength_mult), 2),
            source="inferred",
        )
        _preferences[pref.id] = pref
        new_prefs.append(pref)

    return new_prefs


def add_preference(category: str, key: str, value: str, strength: float = 1.0, source: str = "explicit") -> UserPreference:
    pref = UserPreference(category=category, key=key, value=value, strength=strength, source=source)
    _preferences[pref.id] = pref
    return pref


def get_preferences(category: Optional[str] = None) -> List[UserPreference]:
    prefs = [p for p in _preferences.values() if p.is_active]
    if category:
        prefs = [p for p in prefs if p.category == category]
    return sorted(prefs, key=lambda p: p.strength, reverse=True)


def get_preference(pref_id: str) -> Optional[UserPreference]:
    return _preferences.get(pref_id)


def delete_preference(pref_id: str) -> bool:
    pref = _preferences.get(pref_id)
    if not pref:
        return False
    pref.is_active = False
    return True


def apply_to_recall(memories, query: str):
    """Re-rank memories based on active preferences. Boosts matching, penalizes avoided."""
    if not memories or not _preferences:
        return memories
    prefs = get_preferences()
    avoid = [p for p in prefs if p.category == 'avoid']
    prefer = [p for p in prefs if p.category in ('prefer', 'technology', 'library', 'database')]

    scored = []
    for mem in memories:
        boost = 0.0
        content_lower = mem.content.lower()
        for p in prefer:
            if p.value.lower() in content_lower:
                boost += 0.2 * p.strength
        for p in avoid:
            if p.value.lower() in content_lower:
                boost -= 0.3 * p.strength
        scored.append((boost, mem))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [m for _, m in scored]


def get_preference_context() -> str:
    """Format active preferences as a string for injection into LLM system prompt."""
    prefs = get_preferences()
    if not prefs:
        return ""
    lines = ["USER PREFERENCES (apply these automatically):"]
    prefer = [p for p in prefs if p.category not in ('avoid',)]
    avoid = [p for p in prefs if p.category == 'avoid']
    if prefer:
        lines.append("Prefer: " + ", ".join(f"{p.value} ({p.key})" for p in prefer[:8]))
    if avoid:
        lines.append("Avoid: " + ", ".join(p.value for p in avoid[:5]))
    return "\n".join(lines)
