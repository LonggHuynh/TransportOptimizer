import json
import unittest

from models import STATUS_FAILED
from redis_queue import RedisQueue


class FakeRedis:
    def __init__(self) -> None:
        self.kv: dict[str, str] = {}
        self.lists: dict[str, list[str]] = {}

    def get(self, key: str):
        return self.kv.get(key)

    def set(self, key: str, value: str, keepttl: bool = False) -> None:
        _ = keepttl
        self.kv[key] = value

    def lpush(self, key: str, value: str) -> int:
        items = self.lists.setdefault(key, [])
        items.insert(0, value)
        return len(items)

    def ltrim(self, key: str, start: int, stop: int) -> None:
        items = self.lists.get(key, [])
        self.lists[key] = items[start : stop + 1]


class RedisQueueDlqTests(unittest.TestCase):
    def test_failed_status_pushes_job_to_dlq(self) -> None:
        db = FakeRedis()
        queue = RedisQueue(db, dlq_key="{route}:queue:dlq", dlq_max_entries=10)
        job_id = "job-1"
        job_key = f"{{route}}:job:{job_id}"
        db.set(job_key, json.dumps({"jobId": job_id, "status": "queued"}))

        queue.update_status(job_id, STATUS_FAILED, error="boom")

        stored_job = json.loads(db.get(job_key))
        self.assertEqual(stored_job["status"], STATUS_FAILED)
        self.assertEqual(stored_job["error"], "boom")
        self.assertEqual(len(db.lists["{route}:queue:dlq"]), 1)
        dlq_entry = json.loads(db.lists["{route}:queue:dlq"][0])
        self.assertEqual(dlq_entry["jobId"], job_id)
        self.assertEqual(dlq_entry["error"], "boom")
        self.assertIn("failedAt", dlq_entry)

    def test_dlq_is_trimmed_to_max_entries(self) -> None:
        db = FakeRedis()
        queue = RedisQueue(db, dlq_key="{route}:queue:dlq", dlq_max_entries=2)
        for idx in range(3):
            job_id = f"job-{idx}"
            job_key = f"{{route}}:job:{job_id}"
            db.set(job_key, json.dumps({"jobId": job_id, "status": "queued"}))
            queue.update_status(job_id, STATUS_FAILED, error=f"err-{idx}")

        dlq = [json.loads(item) for item in db.lists["{route}:queue:dlq"]]
        self.assertEqual(len(dlq), 2)
        self.assertEqual(dlq[0]["jobId"], "job-2")
        self.assertEqual(dlq[1]["jobId"], "job-1")


if __name__ == "__main__":
    unittest.main()
