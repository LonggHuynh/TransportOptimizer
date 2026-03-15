import json
import unittest

from models import STATUS_FAILED
from redis_queue import RedisQueue


class FakeRedis:
    def __init__(self) -> None:
        self.kv: dict[str, str] = {}
        self.lists: dict[str, list[str]] = {}
        self.last_set: tuple[str, str, bool] | None = None
        self.last_lrem: tuple[str, int, str] | None = None

    def get(self, key: str):
        return self.kv.get(key)

    def set(self, key: str, value: str, keepttl: bool = False) -> None:
        self.last_set = (key, value, keepttl)
        self.kv[key] = value

    def lpush(self, key: str, value: str) -> int:
        items = self.lists.setdefault(key, [])
        items.insert(0, value)
        return len(items)

    def ltrim(self, key: str, start: int, stop: int) -> None:
        items = self.lists.get(key, [])
        self.lists[key] = items[start : stop + 1]

    def brpoplpush(self, source: str, destination: str, timeout: int = 1):
        _ = timeout
        source_items = self.lists.get(source, [])
        if not source_items:
            return None

        value = source_items.pop()
        destination_items = self.lists.setdefault(destination, [])
        destination_items.insert(0, value)
        return value

    def lrem(self, key: str, count: int, value: str) -> int:
        self.last_lrem = (key, count, value)
        items = self.lists.get(key, [])
        removed = 0
        updated: list[str] = []

        for item in items:
            if item == value and removed < count:
                removed += 1
                continue
            updated.append(item)

        self.lists[key] = updated
        return removed


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

    def test_pop_job_moves_job_id_from_queue_to_processing(self) -> None:
        db = FakeRedis()
        db.lists["{route}:queue"] = ["job-2", "job-1"]
        queue = RedisQueue(db)

        popped = queue.pop_job(timeout=5)

        self.assertEqual(popped, "job-1")
        self.assertEqual(db.lists["{route}:queue"], ["job-2"])
        self.assertEqual(db.lists["{route}:queue:processing"], ["job-1"])

    def test_ack_job_removes_job_from_processing_list(self) -> None:
        db = FakeRedis()
        db.lists["{route}:queue:processing"] = ["job-3", "job-2", "job-1"]
        queue = RedisQueue(db)

        queue.ack_job("job-2")

        self.assertEqual(db.last_lrem, ("{route}:queue:processing", 1, "job-2"))
        self.assertEqual(db.lists["{route}:queue:processing"], ["job-3", "job-1"])

    def test_fetch_request_returns_request_dict_when_present(self) -> None:
        db = FakeRedis()
        queue = RedisQueue(db)
        job_id = "job-fetch-request"
        db.set(
            f"{{route}}:job:{job_id}",
            json.dumps(
                {
                    "request": {
                        "distanceMatrix": [[0, 5], [5, 0]],
                        "stopWindows": [],
                    },
                }
            ),
        )

        request = queue.fetch_request(job_id)

        self.assertIsNotNone(request)
        self.assertIn("distanceMatrix", request)

    def test_fetch_request_returns_none_when_request_is_not_dict(self) -> None:
        db = FakeRedis()
        queue = RedisQueue(db)
        job_id = "job-fetch-request-invalid"
        db.set(f"{{route}}:job:{job_id}", json.dumps({"request": "invalid"}))

        request = queue.fetch_request(job_id)

        self.assertIsNone(request)

    def test_fetch_payload_returns_model_when_payload_exists(self) -> None:
        db = FakeRedis()
        queue = RedisQueue(db)
        job_id = "job-fetch-payload"
        db.set(
            f"{{route}}:job:{job_id}",
            json.dumps(
                {
                    "payload": {
                        "distanceMatrix": [[0, 10], [10, 0]],
                        "stopWindows": [],
                    },
                }
            ),
        )

        payload = queue.fetch_payload(job_id)

        self.assertIsNotNone(payload)
        self.assertEqual(payload.distance_matrix, [[0, 10], [10, 0]])

    def test_fetch_payload_returns_none_when_job_or_payload_missing(self) -> None:
        db = FakeRedis()
        queue = RedisQueue(db)

        self.assertIsNone(queue.fetch_payload("missing-job"))

        job_id = "job-without-payload"
        db.set(f"{{route}}:job:{job_id}", json.dumps({"jobId": job_id}))
        self.assertIsNone(queue.fetch_payload(job_id))

    def test_update_status_completed_sets_result_and_clears_error(self) -> None:
        db = FakeRedis()
        queue = RedisQueue(db)
        job_id = "job-success"
        job_key = f"{{route}}:job:{job_id}"
        db.set(job_key, json.dumps({"jobId": job_id, "status": "processing", "error": "old"}))

        queue.update_status(
            job_id,
            "completed",
            result={"order": [0, 1], "totalTime": 123},
            result_ttl_seconds=111,
        )

        stored_job = json.loads(db.get(job_key))
        self.assertEqual(stored_job["status"], "completed")
        self.assertEqual(stored_job["result"], {"order": [0, 1], "totalTime": 123})
        self.assertNotIn("error", stored_job)
        self.assertIsNotNone(stored_job.get("updatedAt"))
        self.assertIsNotNone(db.last_set)
        self.assertTrue(db.last_set[2])

    def test_update_status_non_failed_without_result_clears_result_and_error(self) -> None:
        db = FakeRedis()
        queue = RedisQueue(db)
        job_id = "job-processing"
        job_key = f"{{route}}:job:{job_id}"
        db.set(job_key, json.dumps({"jobId": job_id, "result": {"order": [0], "totalTime": 0}, "error": "old"}))

        queue.update_status(job_id, "processing")

        stored_job = json.loads(db.get(job_key))
        self.assertEqual(stored_job["status"], "processing")
        self.assertNotIn("result", stored_job)
        self.assertNotIn("error", stored_job)
        self.assertEqual(db.lists.get("{route}:queue:dlq", []), [])

    def test_update_status_returns_without_writing_when_job_missing(self) -> None:
        db = FakeRedis()
        queue = RedisQueue(db)

        queue.update_status("missing", "failed", error="oops")

        self.assertEqual(db.kv, {})
        self.assertEqual(db.lists.get("{route}:queue:dlq", []), [])


if __name__ == "__main__":
    unittest.main()
