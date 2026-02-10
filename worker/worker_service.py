import time
from typing import Optional, Protocol

from models import (
    RouteJobPayload,
    RouteResultDict,
    STATUS_COMPLETED,
    STATUS_FAILED,
    STATUS_PROCESSING,
)
from route_solver import compute_route


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


def process_job(queue: JobQueue, job_id: str, result_ttl_seconds: int) -> None:
    print(f"Processing job {job_id}")
    try:
        payload = queue.fetch_payload(job_id)
        if not payload:
            queue.update_status(job_id, STATUS_FAILED, error="Job payload not found.")
            queue.ack_job(job_id)
            return

        queue.update_status(job_id, STATUS_PROCESSING)
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
