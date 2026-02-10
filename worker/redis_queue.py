import json
from datetime import datetime, timezone
from typing import Any, Optional

from models import (
    RouteJobPayload,
    RouteResultDict,
    STATUS_COMPLETED,
    STATUS_FAILED,
    STATUS_PROCESSING,
)


class RedisQueue:
    def __init__(
        self,
        redis_client,
        queue_key: str = "{route}:queue",
        processing_key: str = "{route}:queue:processing",
    ) -> None:
        self._db = redis_client
        self._queue_key = queue_key
        self._processing_key = processing_key
        self._job_key_prefix = "{route}:job:"
        self._request_suffix = ":request"
        self._status_suffix = ":status"
        self._payload_suffix = ":payload"
        self._result_suffix = ":result"

    def pop_job(self, timeout: int = 1) -> Optional[str]:
        return self._db.brpoplpush(self._queue_key, self._processing_key, timeout=timeout)

    def ack_job(self, job_id: str) -> None:
        self._db.lrem(self._processing_key, 1, job_id)

    def fetch_request(self, job_id: str) -> Optional[dict[str, Any]]:
        data = self._db.get(self._job_request_key(job_id))
        if not data:
            return None
        return json.loads(data)

    def fetch_payload(self, job_id: str) -> Optional[RouteJobPayload]:
        data = self._db.get(self._job_payload_key(job_id))
        if not data:
            return None
        return RouteJobPayload.model_validate_json(data)

    def update_status(
        self,
        job_id: str,
        status: str,
        result: Optional[RouteResultDict] = None,
        error: Optional[str] = None,
        result_ttl_seconds: int = 300,
    ) -> None:
        payload = {
            "jobId": job_id,
            "status": status,
            "updatedAt": self._now_iso(),
        }
        if error is not None:
            payload["error"] = error
        status_key = self._job_status_key(job_id)
        result_key = self._job_result_key(job_id)
        payload_json = json.dumps(payload)

        if self._is_terminal_status(status) and result_ttl_seconds > 0:
            self._db.set(status_key, payload_json, ex=result_ttl_seconds)
        else:
            self._db.set(status_key, payload_json)

        if result is not None:
            if result_ttl_seconds > 0:
                self._db.set(result_key, json.dumps(result), ex=result_ttl_seconds)
            else:
                self._db.set(result_key, json.dumps(result))
            return

        if status in {STATUS_PROCESSING, STATUS_FAILED}:
            self._db.delete(result_key)

    def _job_request_key(self, job_id: str) -> str:
        return f"{self._job_key_prefix}{job_id}{self._request_suffix}"

    def _job_status_key(self, job_id: str) -> str:
        return f"{self._job_key_prefix}{job_id}{self._status_suffix}"

    def _job_payload_key(self, job_id: str) -> str:
        return f"{self._job_key_prefix}{job_id}{self._payload_suffix}"

    def _job_result_key(self, job_id: str) -> str:
        return f"{self._job_key_prefix}{job_id}{self._result_suffix}"

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _is_terminal_status(status: str) -> bool:
        return status in {STATUS_COMPLETED, STATUS_FAILED}
