from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_HOST: str = "0.0.0.0"
DEFAULT_PORT: int = 8083
DEFAULT_TOKEN_LEEWAY_SECONDS: int = 30
DEFAULT_JWKS_CACHE_TTL_SECONDS: int = 300


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    host: str = DEFAULT_HOST
    port: int = DEFAULT_PORT
    oidc_issuer: str = Field(default="", description="OIDC issuer URL (e.g. https://accounts.google.com)")
    oidc_audience: str = Field(default="", description="Expected token audience (client ID).")
    oidc_jwks_uri: str = Field(default="", description="Override JWKS URI. If empty, discovered from issuer metadata.")
    token_leeway_seconds: int = Field(default=DEFAULT_TOKEN_LEEWAY_SECONDS, ge=0)
    jwks_cache_ttl_seconds: int = Field(default=DEFAULT_JWKS_CACHE_TTL_SECONDS, ge=1)
