import json
from datetime import datetime, timezone
from typing import Any, Optional

from models import (
    RouteJobPayload,
    RouteResultDict,
    STATUS_COMPLETED,
    STATUS_FAILED,
)


class RedisQueue:
    def __init__(
        self,
        redis_client,
        queue_key: str = "{route}:queue",
        processing_key: str = "{route}:queue:processing",
        dlq_key: str = "{route}:queue:dlq",
        dlq_max_entries: int = 1000,
    ) -> None:
        self._db = redis_client
        self._queue_key = queue_key
        self._processing_key = processing_key
        self._dlq_key = dlq_key
        self._dlq_max_entries = dlq_max_entries
        self._job_key_prefix = "{route}:job:"

    def pop_job(self, timeout: int = 1) -> Optional[str]:
        return self._db.brpoplpush(self._queue_key, self._processing_key, timeout=timeout)

    def ack_job(self, job_id: str) -> None:
        self._db.lrem(self._processing_key, 1, job_id)

    def fetch_request(self, job_id: str) -> Optional[dict[str, Any]]:
        job = self._fetch_job(job_id)
        if not job:
            return None
        request = job.get("request")
        if not isinstance(request, dict):
            return None
        return request

    def fetch_payload(self, job_id: str) -> Optional[RouteJobPayload]:
        job = self._fetch_job(job_id)
        if not job:
            return None
        payload = job.get("payload")
        if not payload:
            return None
        return RouteJobPayload.model_validate(payload)

    def update_status(
        self,
        job_id: str,
        status: str,
        result: Optional[RouteResultDict] = None,
        error: Optional[str] = None,
        result_ttl_seconds: int = 300,
    ) -> None:
        job = self._fetch_job(job_id)
        if not job:
            return

        job["jobId"] = job_id
        job["status"] = status
        job["updatedAt"] = self._now_iso()

        if status == STATUS_COMPLETED and result is not None:
            job["result"] = result
            job.pop("error", None)
        else:
            job.pop("result", None)
            if status == STATUS_FAILED and error is not None:
                job["error"] = error
                self._push_dlq(job_id, error)
            else:
                job.pop("error", None)

        self._db.set(self._job_key(job_id), json.dumps(job), keepttl=True)

    def _push_dlq(self, job_id: str, error: str) -> None:
        entry = {
            "jobId": job_id,
            "error": error,
            "failedAt": self._now_iso(),
        }
        self._db.lpush(self._dlq_key, json.dumps(entry))
        self._db.ltrim(self._dlq_key, 0, self._dlq_max_entries - 1)

    def _job_key(self, job_id: str) -> str:
        return f"{self._job_key_prefix}{job_id}"

    def _fetch_job(self, job_id: str) -> Optional[dict[str, Any]]:
        data = self._db.get(self._job_key(job_id))
        if not data:
            return None
        return json.loads(data)

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _is_terminal_status(status: str) -> bool:
        return status in {STATUS_COMPLETED, STATUS_FAILED}
