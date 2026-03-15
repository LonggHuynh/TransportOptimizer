import logging
import time
from typing import Callable, Optional, Protocol, Sequence

from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

from models import (
    RouteJobPayload,
    RouteResultDict,
    StopWindowInput,
    STATUS_COMPLETED,
    STATUS_FAILED,
)
from route_solver import compute_route

logger = logging.getLogger(__name__)


class RouteComputationResult(Protocol):
    def to_dict(self) -> RouteResultDict:
        ...


ComputeRouteFn = Callable[[Sequence[Sequence[int]], Sequence[StopWindowInput]], RouteComputationResult]
SleepFn = Callable[[float], None]
MarkSpanErrorFn = Callable[[str, Exception | None], None]


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


def process_job(
    queue: JobQueue,
    job_id: str,
    result_ttl_seconds: int,
    compute_route_fn: ComputeRouteFn | None = None,
    sleep_fn: SleepFn | None = None,
    mark_span_error_fn: MarkSpanErrorFn | None = None,
) -> None:
    route_solver = compute_route_fn or compute_route
    sleep = sleep_fn or time.sleep
    mark_span_error = mark_span_error_fn or _mark_current_span_error

    logger.info("Processing job %s", job_id)
    try:
        payload = queue.fetch_payload(job_id)
        if not payload:
            error = "Job payload not found."
            mark_span_error(error)
            logger.error("%s job_id=%s", error, job_id)
            queue.update_status(job_id, STATUS_FAILED, error=error)
            queue.ack_job(job_id)
            return

        dist = payload.distance_matrix
        stop_windows = payload.stop_windows
        result = route_solver(dist, stop_windows)

        queue.update_status(
            job_id,
            STATUS_COMPLETED,
            result=result.to_dict(),
            result_ttl_seconds=result_ttl_seconds,
        )
        queue.ack_job(job_id)
    except Exception as exc:
        mark_span_error(str(exc), exc)
        logger.exception("Job processing failed job_id=%s", job_id)
        queue.update_status(job_id, STATUS_FAILED, error=str(exc))
        queue.ack_job(job_id)
        sleep(0.5)


class RouteWorker:
    def __init__(
        self,
        queue: JobQueue,
        poll_timeout: int = 1,
        result_ttl_seconds: int = 300,
        process_job_fn: Callable[[JobQueue, str, int], None] | None = None,
    ) -> None:
        self._queue = queue
        self._poll_timeout = poll_timeout
        self._result_ttl_seconds = result_ttl_seconds
        self._process_job_fn = process_job_fn

    def _process_job(self, job_id: str) -> None:
        process_job_fn = self._process_job_fn or process_job
        process_job_fn(self._queue, job_id, self._result_ttl_seconds)
