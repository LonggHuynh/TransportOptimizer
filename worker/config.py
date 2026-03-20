from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    redis_url: str = "localhost:6379"
    redis_iam_auth_enabled: bool = False
    redis_use_tls: bool = False
    result_ttl_seconds: int = 300
    celery_broker_url: str | None = None
    celery_result_backend: str | None = None
    celery_queue: str = "route"
    celery_max_retries: int = Field(default=3, ge=0)
    celery_retry_backoff_seconds: int = Field(default=10, ge=0)
    celery_retry_backoff_max_seconds: int = Field(default=300, ge=0)
    celery_dlq_key: str = "{route}:queue:dlq"
    celery_dlq_max_entries: int = Field(default=1000, ge=1)
    otel_service_name: str = "transport-optimizer-worker"
    otel_exporter_otlp_endpoint: str | None = None
