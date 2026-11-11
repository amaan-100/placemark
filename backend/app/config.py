from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[1]


def _origin(url: str) -> str:
    """Scheme + host of a URL, e.g. `https://x.neon.tech` from a deeper path."""
    if not url:
        return ""
    parts = urlsplit(url)
    if not parts.scheme or not parts.netloc:
        return url.rstrip("/")
    return f"{parts.scheme}://{parts.netloc}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Placemark API"
    environment: Literal["development", "test", "production"] = "development"
    debug: bool = False
    log_level: str = "INFO"

    database_url: str = f"sqlite:///{(BASE_DIR / 'placement.db').as_posix()}"
    db_pool_size: int = 5
    db_max_overflow: int = 5
    db_pool_recycle_seconds: int = 300
    db_connect_timeout_seconds: int = 10

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    # Allow every Vercel deployment (production + PR previews) so the frontend
    # can call the Render backend from any *.vercel.app origin.
    cors_origin_regex: str = r"https://.*\.vercel\.app"
    session_cookie_name: str = "pc_session"
    session_header_name: str = "X-Session-Id"
    session_max_age_seconds: int = 60 * 60 * 24 * 30
    session_retention_days: int = 30

    # Neon Managed Better Auth. When unset, auth is unavailable and the app
    # behaves exactly like the original anonymous-only product.
    #
    # Note: the JWKS lives under `{origin}{base_path}/.well-known/jwks.json`, but
    # the `iss` and `aud` claims carry only the origin. Leaving these empty
    # derives the origin from neon_auth_base_url, which is the common case.
    neon_auth_base_url: str = ""
    neon_auth_jwks_url: str = ""
    neon_auth_issuer: str = ""
    neon_auth_audience: str = ""

    max_upload_bytes: int = 8 * 1024 * 1024
    max_resume_chars: int = 200_000
    pdf_magic_bytes: str = "%PDF-"

    jobs_provider: Literal["auto", "live", "mock", "multi"] = "auto"
    jobs_api_url: str = "https://jobicy.com/api/v2/remote-jobs"
    jobs_api_url_2: str = "https://remoteok.com/api"
    jobs_api_timeout_seconds: float = 12.0
    jobs_cache_ttl_seconds: int = 3600
    jobs_fetch_count: int = 50
    jobs_max_results: int = 12

    rate_limit_requests: int = 120
    rate_limit_window_seconds: int = 60
    rate_limit_upload_requests: int = 12

    llm_provider: Literal["auto", "ollama", "openai_compatible", "disabled"] = "auto"
    llm_provider_label: str = ""
    llm_base_url: str = "https://router.requesty.ai/v1"
    llm_api_key: str = ""
    llm_model: str = "google/gemma-4-31b-it"
    llm_json_mode: bool = False
    llm_status_cache_seconds: int = 300
    llm_daily_request_limit: int = 180
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen2.5-coder:7b"
    llm_timeout_seconds: float = 60.0
    llm_max_tokens: int = 600
    llm_context_tokens: int = 8192
    llm_temperature: float = 0.2

    @field_validator("database_url", mode="after")
    @classmethod
    def resolve_sqlite_path(cls, value: str) -> str:
        prefix = "sqlite:///"
        if not value.startswith(prefix) or value == "sqlite:///:memory:":
            return value
        raw = value[len(prefix) :]
        if raw.startswith("/"):
            return value
        path = Path(raw)
        if not path.is_absolute():
            path = (BASE_DIR / path).resolve()
        return f"sqlite:///{path.as_posix()}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def auth_issuer(self) -> str:
        if self.neon_auth_issuer:
            return self.neon_auth_issuer
        return _origin(self.neon_auth_base_url)

    @property
    def auth_audience(self) -> str:
        if self.neon_auth_audience:
            return self.neon_auth_audience
        return _origin(self.neon_auth_base_url)

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def llm_enabled(self) -> bool:
        if self.llm_provider == "disabled":
            return False
        if self.llm_provider == "openai_compatible":
            return bool(self.llm_api_key)
        return True


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
