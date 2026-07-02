from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import chat, memory, graph, health, diagnosis, repair
from app.api.routes import surgery, evolution
from app.api.routes import feedback, versions, preferences, contradictions, explorer, audit


@asynccontextmanager
async def lifespan(app: FastAPI):
    label = _backend_label()
    print(f"[Eluvion v2] Memory backend: {label}")
    from app.services.mri_monitor import start_monitor
    start_monitor()
    print("[Eluvion v2] MRI monitor started")
    from app.services.evolution_service import start_evolution
    start_evolution()
    print("[Eluvion v2] Evolution service started")
    yield


app = FastAPI(title="Eluvion API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router,          prefix="/api")
app.include_router(memory.router,        prefix="/api")
app.include_router(graph.router,         prefix="/api")
app.include_router(health.router,        prefix="/api")
app.include_router(diagnosis.router,     prefix="/api")
app.include_router(repair.router,        prefix="/api")
app.include_router(surgery.router,       prefix="/api")
app.include_router(evolution.router,     prefix="/api")
app.include_router(feedback.router,      prefix="/api")
app.include_router(versions.router,      prefix="/api")
app.include_router(preferences.router,   prefix="/api")
app.include_router(contradictions.router, prefix="/api")
app.include_router(explorer.router,      prefix="/api")
app.include_router(audit.router,         prefix="/api")


def _backend_label() -> str:
    if not settings.use_cognee:
        return "local-mock"
    if settings.cognee_service_url or settings.vector_db_url:
        return "cognee-cloud"
    return "cognee-local"



@app.get("/api/ping")
def ping():
    return {"status": "ok", "app": settings.app_name, "version": "2.0.0", "backend": _backend_label()}


@app.get("/api/status")
def get_status():
    from app.services.store import active_store
    from app.services.mri_monitor import get_health, get_last_scan
    health = get_health()
    last_scan = get_last_scan()

    try:
        from app.services.preference_service import get_preferences
        preference_count = len(get_preferences())
    except Exception:
        preference_count = 0

    return {
        "memory_backend": _backend_label(),
        "cognee_active": settings.use_cognee,
        "cognee_cloud": bool(settings.vector_db_url),
        "llm": settings.llm_provider if (settings.groq_api_key or settings.gemini_api_key) else "none",
        "llm_model": settings.llm_model,
        "vector_db": settings.vector_db_provider,
        "graph_db": settings.graph_database_provider,
        "node_count": len(active_store.nodes),
        "edge_count": len(active_store.edges),
        "dataset": settings.cognee_dataset,
        "health_score": health.overall_score if health else None,
        "last_mri_scan": last_scan.isoformat() if last_scan else None,
        "pending_contradictions": len(getattr(active_store, '_pending_contradictions', [])),
        "preference_count": preference_count,
    }
