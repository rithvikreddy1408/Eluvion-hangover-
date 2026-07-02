import os
from pydantic_settings import BaseSettings
from typing import List

_ENV_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")


class Settings(BaseSettings):
    # App
    app_name: str = "Eluvion"
    debug: bool = False
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Gemini (chat agent)
    gemini_api_key: str = ""

    # Groq (fallback chat LLM — free tier, 14k req/day)
    groq_api_key: str = ""

    # Cognee toggle — true = real cognee (local OSS or cloud)
    use_cognee: bool = False

    # LLM cognee uses internally
    llm_provider: str = "gemini"
    llm_model: str = "gemini-2.0-flash"

    # Local OSS DB stack (defaults — no URLs needed)
    db_provider: str = "sqlite"
    vector_db_provider: str = "lancedb"
    graph_database_provider: str = "ladybug"

    # Cognee Cloud credentials (from your cognee.ai dashboard)
    cognee_api_key: str = ""
    cognee_service_url: str = ""   # e.g. https://your-tenant.api.cognee.ai

    # Cloud DB overrides — set these to switch from local to cloud backend
    vector_db_url: str = ""
    vector_db_key: str = ""
    graph_db_url: str = ""
    graph_db_key: str = ""

    # Cognee dataset namespace
    cognee_dataset: str = "eluvion"

    class Config:
        env_file = _ENV_FILE


settings = Settings()
