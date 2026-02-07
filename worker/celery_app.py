from __future__ import annotations

from urllib.parse import urlparse

from celery import Celery

from config import Settings
from redis_client import normalize_redis_url


def _normalize_broker_url(raw_url: str) -> str:
    if "://" not in raw_url:
        return normalize_redis_url(raw_url)
    parsed = urlparse(raw_url)
    if parsed.scheme in ("redis", "rediss"):
        return normalize_redis_url(raw_url)
    return raw_url


def _resolve_broker_url(override: str | None, fallback: str, settings: Settings) -> str:
    if override:
        return _normalize_broker_url(override)
    if settings.redis_iam_auth_enabled:
        raise RuntimeError(
            "Celery broker cannot use IAM auth tokens. Set CELERY_BROKER_URL to a non-IAM "
            "broker or disable REDIS_IAM_AUTH_ENABLED."
        )
    return _normalize_broker_url(fallback)


settings = Settings()
broker_url = _resolve_broker_url(settings.celery_broker_url, settings.redis_url, settings)
backend_url = (
    _normalize_broker_url(settings.celery_result_backend)
    if settings.celery_result_backend
    else (None if settings.redis_iam_auth_enabled else _normalize_broker_url(settings.redis_url))
)

app = Celery("route_worker", broker=broker_url, backend=backend_url)

app.conf.update(
    task_default_queue=settings.celery_queue,
    task_default_exchange=settings.celery_queue,
    task_default_routing_key=settings.celery_queue,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_ignore_result=True,
)

import tasks  # noqa: F401
