"""
Active store selector.

USE_COGNEE=true → CogneeAdapter (local: lancedb+ladybug, cloud: weaviate+neo4j)
USE_COGNEE=false → LocalMemoryStore (in-process mock, zero deps)
"""
from app.config import settings

_has_any_llm_key = bool(settings.groq_api_key or settings.gemini_api_key)

if settings.use_cognee:
    from app.services.cognee_adapter import CogneeAdapter
    active_store = CogneeAdapter()
    _backend = "cognee-local" if not settings.vector_db_url else "cognee-cloud"
else:
    from app.services.memory_store import memory_store
    active_store = memory_store
    _backend = "local-mock"
