from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from celery import Task
from opentelemetry.propagate import extract
from opentelemetry.trace import SpanKind

from celery_app import app
from config import Settings
from redis_client import create_redis_client
from redis_queue import RedisQueue
from telemetry import configure_observability, get_tracer
from worker_service import JobQueue, process_job

ProcessJobFn = Callable[[JobQueue, str, int], None]


@dataclass(frozen=True)
class TaskDependencies:
    settings: Settings
    queue: JobQueue
    tracer: object
    process_job_fn: ProcessJobFn


_dependencies: TaskDependencies | None = None


def _create_queue(settings: Settings) -> RedisQueue:
    return RedisQueue(
        create_redis_client(settings),
        dlq_key=settings.celery_dlq_key,
        dlq_max_entries=settings.celery_dlq_max_entries,
    )


def _build_dependencies() -> TaskDependencies:
    settings = Settings()
    queue = _create_queue(settings)
    tracer = get_tracer(__name__)
    return TaskDependencies(
        settings=settings,
        queue=queue,
        tracer=tracer,
        process_job_fn=process_job,
    )


def _get_dependencies() -> TaskDependencies:
    global _dependencies
    if _dependencies is None:
        _dependencies = _build_dependencies()
    return _dependencies


def _extract_parent_context(task: Task):
    headers = getattr(task.request, "headers", None)
    if isinstance(headers, dict):
        return extract(headers)
    return extract({})


def _process_route_job(task: Task, job_id: str, dependencies: TaskDependencies) -> None:
    settings = dependencies.settings
    configure_observability(settings)
    parent_context = _extract_parent_context(task)

    with dependencies.tracer.start_as_current_span(
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
        dependencies.process_job_fn(dependencies.queue, job_id, settings.result_ttl_seconds)


@app.task(name="route.process_job", bind=True)
def process_route_job(self: Task, job_id: str) -> None:
    _process_route_job(self, job_id, _get_dependencies())
