import json
from datetime import datetime, timezone


class RedisQueue:
    def __init__(
        self,
        redis_client,
        queue_key: str = "route:queue",
        processing_key: str = "route:queue:processing",
    ) -> None:
        self._db = redis_client
        self._queue_key = queue_key
        self._processing_key = processing_key
        self._job_key_prefix = "route:job:"
        self._request_suffix = ":request"
        self._status_suffix = ":status"
        self._payload_suffix = ":payload"
        self._result_suffix = ":result"

    def pop_job(self, timeout: int = 1):
        return self._db.brpoplpush(self._queue_key, self._processing_key, timeout=timeout)

    def ack_job(self, job_id: str) -> None:
        self._db.lrem(self._processing_key, 1, job_id)

    def fetch_request(self, job_id: str):
        data = self._db.get(self._job_request_key(job_id))
        if not data:
            return None
        return json.loads(data)

    def fetch_payload(self, job_id: str):
        data = self._db.get(self._job_payload_key(job_id))
        if not data:
            return None
        return json.loads(data)

    def update_status(self, job_id: str, status: str, result=None, error=None, result_ttl_seconds: int = 300) -> None:
        payload = {
            "jobId": job_id,
            "status": status,
            "updatedAt": self._now_iso(),
        }
        if error is not None:
            payload["error"] = error
        self._db.set(self._job_status_key(job_id), json.dumps(payload))
        if result is not None:
            self._db.set(self._job_result_key(job_id), json.dumps(result), ex=result_ttl_seconds)

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
