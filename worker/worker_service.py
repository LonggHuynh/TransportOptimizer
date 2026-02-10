import logging
import time
from typing import Optional, Protocol

from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

from models import (
    RouteJobPayload,
    RouteResultDict,
    STATUS_COMPLETED,
    STATUS_FAILED,
)
from route_solver import compute_route

logger = logging.getLogger(__name__)


class JobQueue(Protocol):
    def pop_job(self, timeout: int = 1) -> Optional[str]:
        ...

    def ack_job(self, job_id: str) -> None:
        ...

    def fetch_payload(self, job_id: str) -> Optional[RouteJobPayload]:
        ...

    def update_status(
        self,
        job_id: str,
        status: str,
        result: Optional[RouteResultDict] = None,
        error: Optional[str] = None,
        result_ttl_seconds: int = 300,
    ) -> None:
        ...


def _mark_current_span_error(error_message: str, exc: Exception | None = None) -> None:
    span = trace.get_current_span()
    span_context = span.get_span_context()
    if not span_context.is_valid:
        return

    if exc is not None:
        span.record_exception(exc)
    span.set_status(Status(StatusCode.ERROR, error_message))


def process_job(queue: JobQueue, job_id: str, result_ttl_seconds: int) -> None:
    logger.info("Processing job %s", job_id)
    try:
        payload = queue.fetch_payload(job_id)
        if not payload:
            error = "Job payload not found."
            _mark_current_span_error(error)
            logger.error("%s job_id=%s", error, job_id)
            queue.update_status(job_id, STATUS_FAILED, error=error)
            queue.ack_job(job_id)
            return

        dist = payload.distance_matrix
        stop_windows = payload.stop_windows
        result = compute_route(dist, stop_windows)

        queue.update_status(
            job_id,
            STATUS_COMPLETED,
            result=result.to_dict(),
            result_ttl_seconds=result_ttl_seconds,
        )
        queue.ack_job(job_id)
    except Exception as exc:
        _mark_current_span_error(str(exc), exc)
        logger.exception("Job processing failed job_id=%s", job_id)
        queue.update_status(job_id, STATUS_FAILED, error=str(exc))
        queue.ack_job(job_id)
        time.sleep(0.5)


class RouteWorker:
    def __init__(self, queue: JobQueue, poll_timeout: int = 1, result_ttl_seconds: int = 300) -> None:
        self._queue = queue
        self._poll_timeout = poll_timeout
        self._result_ttl_seconds = result_ttl_seconds

    def _process_job(self, job_id: str) -> None:
        process_job(self._queue, job_id, self._result_ttl_seconds)
