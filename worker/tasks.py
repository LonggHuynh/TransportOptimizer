from __future__ import annotations

from celery import Task
from opentelemetry.propagate import extract
from opentelemetry.trace import SpanKind

from config import Settings
from celery_app import app
from redis_client import create_redis_client
from redis_queue import RedisQueue
from telemetry import get_tracer
from worker_service import process_job

_settings: Settings | None = None
_queue: RedisQueue | None = None
_tracer = get_tracer(__name__)


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


def _extract_parent_context(task: Task):
    headers = getattr(task.request, "headers", None)
    if isinstance(headers, dict):
        return extract(headers)
    return extract({})


@app.task(name="route.process_job", bind=True)
def process_route_job(self: Task, job_id: str) -> None:
    settings = _get_settings()
    queue = _get_queue()
    parent_context = _extract_parent_context(self)

    with _tracer.start_as_current_span(
        "route.process_job",
        context=parent_context,
        kind=SpanKind.CONSUMER,
        attributes={
            "messaging.system": "redis",
            "messaging.destination.name": settings.celery_queue,
            "messaging.operation": "process",
            "messaging.message.id": job_id,
            "route.job.id": job_id,
        },
    ):
        process_job(queue, job_id, settings.result_ttl_seconds)
