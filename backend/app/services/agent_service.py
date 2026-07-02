"""
Conversational agent — three strictly-separated knowledge modes:

  general  → LLM pretrained knowledge only. Cognee is never called.
  memory   → Cognee only. LLM formats retrieved text. Never fabricates.
  hybrid   → Cognee retrieval first, then LLM combines both sources.

Every response carries a Provenance object that records exactly which
sources were used so the UI can display them transparently.
"""
from __future__ import annotations
from collections import defaultdict
from typing import List, Dict, Optional
from app.config import settings
from app.models.memory import MemoryNode

_session_histories: Dict[str, List[dict]] = defaultdict(list)
MAX_HISTORY = 20


# ── System prompts (one per mode) ────────────────────────────────────────────

def _prompt_general() -> str:
    from datetime import date
    today = date.today().strftime("%B %d, %Y")
    return (
        f"You are Eluvion, an AI assistant. Today is {today}.\n\n"
        "You are operating in GENERAL KNOWLEDGE MODE.\n\n"
        "RULES:\n"
        "- Answer using ONLY your pretrained knowledge about the world.\n"
        "- Do NOT reference any personal user data, stored memories, or context.\n"
        "- Do NOT pretend to remember the user from previous sessions.\n"
        "- Answer factual, conceptual, and technical questions accurately.\n"
        "- Begin your answer directly. Do not say 'In general knowledge mode...'.\n"
    )


def _prompt_memory(memory_context: str) -> str:
    from datetime import date
    today = date.today().strftime("%B %d, %Y")
    base = (
        f"You are Eluvion, an AI assistant. Today is {today}.\n\n"
        "You are operating in MEMORY-ONLY MODE.\n\n"
        "STRICT RULES — follow exactly, no exceptions:\n"
        "1. Answer using ONLY the PERSISTENT MEMORY provided below.\n"
        "2. If the answer is in memory: reply with 'I remember...' or 'According to my memory...'\n"
        "3. If the information is NOT in memory: reply with exactly:\n"
        "   'I don't have this information in my memory. You haven't shared this with me yet.'\n"
        "4. Do NOT add ANY information from your general training knowledge.\n"
        "5. Do NOT guess, infer, or hallucinate. Zero tolerance.\n\n"
    )
    if memory_context:
        base += f"PERSISTENT MEMORY:\n{memory_context}\n"
    else:
        base += "PERSISTENT MEMORY: (empty — no relevant memories found)\n"
    return base


def _prompt_hybrid(memory_context: str, preference_context: str = "") -> str:
    from datetime import date
    today = date.today().strftime("%B %d, %Y")
    base = (
        f"You are Eluvion, an AI assistant. Today is {today}.\n\n"
        "You are operating in HYBRID MODE.\n\n"
        "You have two distinct knowledge sources:\n"
        "  1. PERSISTENT MEMORY (Cognee) — facts the user has explicitly shared with you.\n"
        "  2. GENERAL KNOWLEDGE — your LLM training data about the world.\n\n"
        "RULES:\n"
        "- Always check PERSISTENT MEMORY first.\n"
        "- If memory is relevant, lead with it: 'From my memory: ...'\n"
        "- If you supplement with general knowledge, label it: 'Based on my general knowledge: ...'\n"
        "- Never present general knowledge as if it came from memory.\n"
        "- Never present memory as general knowledge.\n"
        "- Keep the two sources clearly separated in your answer.\n\n"
    )
    if preference_context:
        base += f"{preference_context}\n\n"
    if memory_context:
        base += f"PERSISTENT MEMORY:\n{memory_context}\n"
    else:
        base += "PERSISTENT MEMORY: (no relevant memories for this query)\n"
    return base


# ── LLM callers ──────────────────────────────────────────────────────────────

def _call_groq(session_id: str, user_message: str, system: str) -> str:
    from groq import Groq
    client = Groq(api_key=settings.groq_api_key)
    history = _session_histories[session_id]
    messages = [{"role": "system", "content": system}]
    messages.extend(history[-MAX_HISTORY:])
    messages.append({"role": "user", "content": user_message})
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=1024,
        temperature=0.5,
    )
    return response.choices[0].message.content.strip()


def _call_gemini(user_message: str, system: str) -> str:
    from google import genai
    client = genai.Client(api_key=settings.gemini_api_key)
    prompt = system + f"\nUser: {user_message}\nAssistant:"
    response = client.models.generate_content(model=settings.llm_model, contents=prompt)
    return response.text.strip()


def _llm(session_id: str, user_message: str, system: str) -> tuple[str, str]:
    """Return (answer, provider). Tries Groq first, falls back to Gemini."""
    if settings.groq_api_key and settings.groq_api_key != "paste_your_groq_key_here":
        try:
            return _call_groq(session_id, user_message, system), "groq"
        except Exception as e:
            print(f"[chat] Groq error: {e}")
    if settings.gemini_api_key:
        try:
            return _call_gemini(user_message, system), "gemini"
        except Exception as e:
            print(f"[chat] Gemini error: {str(e)[:150]}")
    return None, None


def _update_history(session_id: str, user_message: str, answer: str):
    history = _session_histories[session_id]
    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": answer})
    if len(history) > MAX_HISTORY * 2:
        _session_histories[session_id] = history[-(MAX_HISTORY * 2):]


def _format_memories(memories: List[MemoryNode]) -> str:
    if not memories:
        return ""
    lines = []
    for m in memories:
        tag = " [OUTDATED]" if m.is_outdated else ""
        lines.append(f"- [{m.subject or m.type}] {m.content}{tag} (confidence: {m.confidence:.0%})")
    return "\n".join(lines)


def _store_personal_fact(store, user_message: str) -> Optional[str]:
    """Store only explicit personal disclosures to long-term memory."""
    msg = user_message.strip()
    if msg.endswith("?"):
        return None
    if any(msg.lower().startswith(q) for q in [
        "what", "who", "where", "when", "why", "how", "can you", "could you",
        "do you", "does", "is ", "are ", "tell me", "explain", "show", "list",
    ]):
        return None
    personal_keywords = [
        "my name", "i am", "i'm", "i work", "i live", "i like", "i prefer",
        "i want", "i need", "remember", "my goal", "my project", "call me",
        "my email", "i study", "my age", "i hate", "i love", "i built",
        "i'm working on", "i use", "i have", "my team", "my company",
    ]
    if not any(kw in msg.lower() for kw in personal_keywords):
        return None
    node = store.remember(
        content=msg,
        subject="user_profile",
        tags=["personal", "explicit", "long_term"],
        node_type="fact",
        source="chat",
        confidence=1.0,
    )
    return node.id if node else None


# ── Mode pipelines ────────────────────────────────────────────────────────────

async def _general_pipeline(user_message: str, session_id: str) -> dict:
    system = _prompt_general()
    answer, provider = _llm(session_id, user_message, system)
    if answer is None:
        return _no_key_response(user_message)
    _update_history(session_id, user_message, answer)
    return {
        "answer": answer,
        "retrieved_memories": [],
        "retrieved_memory_ids": [],
        "memory_count": 0,
        "provider": provider,
        "hallucination_risk": {"risk_level": "low", "score": 0.05},
        "explanation": {"summary": "Answered from LLM general knowledge. Cognee was not consulted.", "sources": []},
        "provenance": {
            "mode": "general",
            "sources": ["llm"],
            "cognee_nodes": 0,
            "cognee_pct": 0,
            "llm_pct": 100,
            "memory_found": False,
            "confidence": 0.90,
        },
    }


async def _memory_pipeline(user_message: str, session_id: str, store) -> dict:
    from app.services.hallucination_predictor import predict

    # Auto-store the user's message BEFORE recalling — every message in memory
    # mode is considered valuable long-term knowledge.
    user_node = store.remember(
        content=user_message,
        subject="user",
        tags=["memory_mode", "user_message"],
        node_type="fact",
        source="memory_mode_chat",
        confidence=1.0,
    )

    memories = store.recall(user_message)
    memory_context = _format_memories(memories)
    memory_found = len(memories) > 0

    system = _prompt_memory(memory_context)
    answer, provider = _llm(session_id, user_message, system)

    if answer is None:
        # No LLM — return raw memory text
        answer = memory_context if memory_context else "I don't have this information in my memory."
        provider = None

    _update_history(session_id, user_message, answer)

    # Auto-store the assistant's answer too — memory mode = continuous learning.
    assistant_node = store.remember(
        content=answer,
        subject="assistant",
        tags=["memory_mode", "assistant_response"],
        node_type="fact",
        source="memory_mode_chat",
        confidence=0.9,
    )

    prediction = predict(memories, user_message)
    all_ids = [m.id for m in memories]
    # Include the auto-stored nodes so the UI can reference them
    if user_node and user_node.id not in all_ids:
        all_ids.append(user_node.id)
    if assistant_node and assistant_node.id not in all_ids:
        all_ids.append(assistant_node.id)

    return {
        "answer": answer,
        "retrieved_memories": [m.model_dump() for m in memories],
        "retrieved_memory_ids": all_ids,
        "memory_count": len(memories),
        "provider": provider,
        "hallucination_risk": prediction.model_dump(),
        "explanation": {
            "summary": f"Memory-only mode: {'found' if memory_found else 'no'} relevant memories in Cognee.",
            "sources": [
                {"content": m.content, "relevance_score": m.confidence, "why_selected": "retrieved from Cognee"}
                for m in memories
            ],
        },
        "provenance": {
            "mode": "memory",
            "sources": ["cognee"] if memory_found else [],
            "cognee_nodes": len(memories),
            "cognee_pct": 100 if memory_found else 0,
            "llm_pct": 0,
            "memory_found": memory_found,
            "confidence": sum(m.confidence for m in memories) / len(memories) if memories else 0.0,
        },
    }


async def _hybrid_pipeline(user_message: str, session_id: str, store) -> dict:
    from app.services.hallucination_predictor import predict
    from app.services.evolution_service import mark_request

    mark_request()

    memories = store.recall(user_message)
    memory_context = _format_memories(memories)
    memory_found = len(memories) > 0

    # Preference context
    pref_ctx = ""
    try:
        from app.services.preference_service import get_preference_context
        pref_ctx = get_preference_context()
    except Exception:
        pass

    system = _prompt_hybrid(memory_context, pref_ctx)
    answer, provider = _llm(session_id, user_message, system)

    if answer is None:
        return _no_key_response(user_message)

    _update_history(session_id, user_message, answer)

    # Store any explicit personal disclosures
    stored_id = _store_personal_fact(store, user_message)
    try:
        from app.services.preference_service import extract_preferences
        extract_preferences(user_message)
    except Exception:
        pass

    all_ids = [m.id for m in memories]
    if stored_id and stored_id not in all_ids:
        all_ids.append(stored_id)

    # Explainable recall
    explanation = {"summary": f"Retrieved {len(memories)} memories.", "sources": []}
    try:
        from app.services.explainable_recall import build_explanation
        from app.services.graph_reasoning import recall_with_graph
        scored = recall_with_graph(user_message, store.nodes, store.edges)
        scores = [s for s, _ in scored[:len(memories)]]
        explanation = build_explanation(memories, user_message, store.edges, scores)
    except Exception:
        pass

    prediction = predict(memories, user_message)

    # Provenance heuristic: each memory node contributes ~15% capped at 80%
    cognee_pct = min(80, len(memories) * 15) if memory_found else 0
    llm_pct = 100 - cognee_pct
    sources = []
    if memory_found:
        sources.append("cognee")
    sources.append("llm")

    return {
        "answer": answer,
        "retrieved_memories": [m.model_dump() for m in memories],
        "retrieved_memory_ids": all_ids,
        "memory_count": len(memories),
        "provider": provider,
        "hallucination_risk": prediction.model_dump(),
        "explanation": explanation,
        "provenance": {
            "mode": "hybrid",
            "sources": sources,
            "cognee_nodes": len(memories),
            "cognee_pct": cognee_pct,
            "llm_pct": llm_pct,
            "memory_found": memory_found,
            "confidence": (sum(m.confidence for m in memories) / len(memories) * 0.8 + 0.2)
                          if memories else 0.75,
        },
    }


# ── Public entry point ────────────────────────────────────────────────────────

async def chat_async(user_message: str, session_id: str = "default", mode: str = "auto") -> dict:
    from app.services.store import active_store
    from app.services import knowledge_router

    # Resolve "auto" mode via the knowledge router
    if mode == "auto":
        mode = knowledge_router.route(user_message)

    if mode == "general":
        return await _general_pipeline(user_message, session_id)
    elif mode == "memory":
        return await _memory_pipeline(user_message, session_id, active_store)
    else:
        return await _hybrid_pipeline(user_message, session_id, active_store)


def _no_key_response(user_message: str) -> dict:
    from app.services.store import active_store
    from app.services.hallucination_predictor import predict
    memories = active_store.recall(user_message)
    prediction = predict(memories, user_message)
    context = _format_memories(memories)
    answer = (
        f"From memory:\n{context}" if context
        else "No API key configured. Add GROQ_API_KEY to backend/.env for full AI responses."
    )
    active_store.log_retrieval(query=user_message, node_ids=[m.id for m in memories], answer=answer)
    return {
        "answer": answer,
        "retrieved_memories": [m.model_dump() for m in memories],
        "retrieved_memory_ids": [m.id for m in memories],
        "memory_count": len(memories),
        "hallucination_risk": prediction.model_dump(),
        "provenance": {
            "mode": "memory",
            "sources": ["cognee"] if memories else [],
            "cognee_nodes": len(memories),
            "cognee_pct": 100 if memories else 0,
            "llm_pct": 0,
            "memory_found": bool(memories),
            "confidence": 0.0,
        },
    }


def chat_no_key(user_message: str, session_id: str = "default") -> dict:
    return _no_key_response(user_message)
