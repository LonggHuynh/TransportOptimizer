from __future__ import annotations

from config import Settings
from celery_app import app
from redis_client import create_redis_client
from redis_queue import RedisQueue
from worker_service import process_job

_settings: Settings | None = None
_queue: RedisQueue | None = None


def _get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def _get_queue() -> RedisQueue:
    global _queue
    if _queue is None:
        settings = _get_settings()
        _queue = RedisQueue(create_redis_client(settings))
    return _queue


@app.task(name="route.process_job")
def process_route_job(job_id: str) -> None:
    settings = _get_settings()
    queue = _get_queue()
    process_job(queue, job_id, settings.result_ttl_seconds)
