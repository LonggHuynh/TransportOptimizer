import time
from typing import Optional, Protocol

from route_solver import compute_route
from models import (
    Requirement,
    RouteJobPayload,
    RouteResultDict,
    STATUS_COMPLETED,
    STATUS_FAILED,
    STATUS_PROCESSING,
)


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


class RouteWorker:
    def __init__(self, queue: JobQueue, poll_timeout: int = 1, result_ttl_seconds: int = 300) -> None:
        self._queue = queue
        self._poll_timeout = poll_timeout
        self._result_ttl_seconds = result_ttl_seconds

    def run_forever(self) -> None:
        while True:
            job_id = self._queue.pop_job(timeout=self._poll_timeout)
            if not job_id:
                continue
            self._process_job(job_id)

    def _process_job(self, job_id: str) -> None:
        print("Processing job")
        try:
            payload = self._queue.fetch_payload(job_id)
            if not payload:
                self._queue.update_status(job_id, "failed", error="Job payload not found.")
                self._queue.ack_job(job_id)
                return

            self._queue.update_status(job_id, STATUS_PROCESSING)
            dist = payload.get("distanceMatrix", [])
            requirements: list[Requirement] = payload.get("requirements", [])
            result = compute_route(dist, requirements)

            self._queue.update_status(
                job_id,
                STATUS_COMPLETED,
                result=result.to_dict(),
                result_ttl_seconds=self._result_ttl_seconds,
            )
            self._queue.ack_job(job_id)
        except Exception as exc:
            self._queue.update_status(job_id, STATUS_FAILED, error=str(exc))
            self._queue.ack_job(job_id)
            time.sleep(0.5)
