import unittest
from unittest.mock import MagicMock, patch

from models import RouteJobPayload, StopWindow
from worker_service import RouteWorker, _mark_current_span_error, process_job


class FakeQueue:
    def __init__(self, payload=None) -> None:
        self.payload = payload
        self.update_calls = []
        self.acked = []

    def fetch_payload(self, job_id: str):
        _ = job_id
        return self.payload

    def update_status(
        self,
        job_id: str,
        status: str,
        result=None,
        error=None,
        result_ttl_seconds: int = 300,
    ) -> None:
        self.update_calls.append(
            {
                "job_id": job_id,
                "status": status,
                "result": result,
                "error": error,
                "result_ttl_seconds": result_ttl_seconds,
            }
        )

    def ack_job(self, job_id: str) -> None:
        self.acked.append(job_id)


class WorkerServiceTests(unittest.TestCase):
    def test_mark_current_span_error_returns_when_span_context_is_invalid(self) -> None:
        span = MagicMock()
        span_context = MagicMock()
        span_context.is_valid = False
        span.get_span_context.return_value = span_context

        with patch("worker_service.trace.get_current_span", return_value=span):
            _mark_current_span_error("bad")

        span.record_exception.assert_not_called()
        span.set_status.assert_not_called()

    def test_mark_current_span_error_records_exception_and_status_when_span_context_is_valid(self) -> None:
        span = MagicMock()
        span_context = MagicMock()
        span_context.is_valid = True
        span.get_span_context.return_value = span_context
        exc = RuntimeError("boom")

        with patch("worker_service.trace.get_current_span", return_value=span):
            _mark_current_span_error("bad", exc)

        span.record_exception.assert_called_once_with(exc)
        span.set_status.assert_called_once()

    def test_process_job_marks_failed_when_payload_missing(self) -> None:
        queue = FakeQueue(payload=None)

        process_job(queue, "job-missing", result_ttl_seconds=120)

        self.assertEqual(queue.acked, ["job-missing"])
        self.assertEqual(len(queue.update_calls), 1)
        update = queue.update_calls[0]
        self.assertEqual(update["status"], "failed")
        self.assertEqual(update["error"], "Job payload not found.")
        self.assertIsNone(update["result"])

    def test_process_job_marks_completed_when_solver_returns_result(self) -> None:
        payload = RouteJobPayload(
            distanceMatrix=[[0, 10], [10, 0]],
            stopWindows=[StopWindow(stopIndex=0)],
        )
        queue = FakeQueue(payload=payload)

        with patch("worker_service.compute_route") as compute_route:
            compute_route.return_value.to_dict.return_value = {"order": [0, 1], "totalTime": 10}

            process_job(queue, "job-ok", result_ttl_seconds=555)

        self.assertEqual(queue.acked, ["job-ok"])
        self.assertEqual(len(queue.update_calls), 1)
        update = queue.update_calls[0]
        self.assertEqual(update["status"], "completed")
        self.assertEqual(update["result"], {"order": [0, 1], "totalTime": 10})
        self.assertIsNone(update["error"])
        self.assertEqual(update["result_ttl_seconds"], 555)
        compute_route.assert_called_once_with(payload.distance_matrix, payload.stop_windows)

    def test_process_job_marks_failed_on_exception_and_sleeps(self) -> None:
        payload = RouteJobPayload(distanceMatrix=[[0]], stopWindows=[])
        queue = FakeQueue(payload=payload)

        with (
            patch("worker_service.compute_route", side_effect=ValueError("solver-error")),
            patch("worker_service.time.sleep") as sleep,
        ):
            process_job(queue, "job-fail", result_ttl_seconds=300)

        self.assertEqual(queue.acked, ["job-fail"])
        self.assertEqual(len(queue.update_calls), 1)
        update = queue.update_calls[0]
        self.assertEqual(update["status"], "failed")
        self.assertEqual(update["error"], "solver-error")
        sleep.assert_called_once_with(0.5)

    def test_process_job_uses_injected_dependencies(self) -> None:
        payload = RouteJobPayload(distanceMatrix=[[0]], stopWindows=[])
        queue = FakeQueue(payload=payload)
        solver = MagicMock(side_effect=ValueError("injected-error"))
        sleep = MagicMock()
        mark_span_error = MagicMock()

        process_job(
            queue,
            "job-fail-injected",
            result_ttl_seconds=111,
            compute_route_fn=solver,
            sleep_fn=sleep,
            mark_span_error_fn=mark_span_error,
        )

        self.assertEqual(queue.acked, ["job-fail-injected"])
        self.assertEqual(len(queue.update_calls), 1)
        update = queue.update_calls[0]
        self.assertEqual(update["status"], "failed")
        self.assertEqual(update["error"], "injected-error")
        solver.assert_called_once_with(payload.distance_matrix, payload.stop_windows)
        sleep.assert_called_once_with(0.5)
        mark_args = mark_span_error.call_args.args
        self.assertEqual(mark_args[0], "injected-error")
        self.assertIsInstance(mark_args[1], ValueError)

    def test_route_worker_process_job_delegates_to_process_job_with_ttl(self) -> None:
        queue = FakeQueue(payload=None)
        worker = RouteWorker(queue, poll_timeout=5, result_ttl_seconds=999)

        with patch("worker_service.process_job") as process_job_mock:
            worker._process_job("job-delegate")

        process_job_mock.assert_called_once_with(queue, "job-delegate", 999)

    def test_route_worker_uses_injected_process_function(self) -> None:
        queue = FakeQueue(payload=None)
        process_job_fn = MagicMock()
        worker = RouteWorker(queue, result_ttl_seconds=321, process_job_fn=process_job_fn)

        worker._process_job("job-custom")

        process_job_fn.assert_called_once_with(queue, "job-custom", 321)


if __name__ == "__main__":
    unittest.main()
