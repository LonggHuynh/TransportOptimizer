import unittest
from contextlib import nullcontext
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import tasks


class TasksCompositionTests(unittest.TestCase):
    def setUp(self) -> None:
        self._original_dependencies = tasks._dependencies
        tasks._dependencies = None

    def tearDown(self) -> None:
        tasks._dependencies = self._original_dependencies

    def test_build_dependencies_constructs_defaults(self) -> None:
        settings = SimpleNamespace(celery_queue="route", result_ttl_seconds=12)
        queue = object()
        tracer = object()

        with (
            patch("tasks.Settings", return_value=settings) as settings_factory,
            patch("tasks._create_queue", return_value=queue) as create_queue,
            patch("tasks.get_tracer", return_value=tracer) as tracer_factory,
        ):
            dependencies = tasks._build_dependencies()

        self.assertIs(dependencies.settings, settings)
        self.assertIs(dependencies.queue, queue)
        self.assertIs(dependencies.tracer, tracer)
        self.assertIs(dependencies.process_job_fn, tasks.process_job)
        settings_factory.assert_called_once_with()
        create_queue.assert_called_once_with(settings)
        tracer_factory.assert_called_once_with("tasks")

    def test_get_dependencies_builds_once_and_caches(self) -> None:
        dependencies = tasks.TaskDependencies(
            settings=SimpleNamespace(celery_queue="route", result_ttl_seconds=90),
            queue=object(),
            tracer=object(),
            process_job_fn=MagicMock(),
        )

        with patch("tasks._build_dependencies", return_value=dependencies) as build_dependencies:
            first = tasks._get_dependencies()
            second = tasks._get_dependencies()

        self.assertIs(first, dependencies)
        self.assertIs(second, dependencies)
        build_dependencies.assert_called_once()

    def test_extract_parent_context_uses_headers_when_dict(self) -> None:
        task = SimpleNamespace(request=SimpleNamespace(headers={"traceparent": "value"}))
        extracted_context = object()

        with patch("tasks.extract", return_value=extracted_context) as extract_mock:
            context = tasks._extract_parent_context(task)

        self.assertIs(context, extracted_context)
        extract_mock.assert_called_once_with({"traceparent": "value"})

    def test_extract_parent_context_uses_empty_headers_when_not_dict(self) -> None:
        task = SimpleNamespace(request=SimpleNamespace(headers="invalid"))
        extracted_context = object()

        with patch("tasks.extract", return_value=extracted_context) as extract_mock:
            context = tasks._extract_parent_context(task)

        self.assertIs(context, extracted_context)
        extract_mock.assert_called_once_with({})

    def test_process_route_job_uses_dependencies_and_span_attributes(self) -> None:
        settings = SimpleNamespace(celery_queue="route-main", result_ttl_seconds=45)
        queue = object()
        process_job_fn = MagicMock()
        tracer = MagicMock()
        tracer.start_as_current_span.return_value = nullcontext()
        task = SimpleNamespace(request=SimpleNamespace(headers={"traceparent": "abc"}))
        parent_context = object()
        dependencies = tasks.TaskDependencies(
            settings=settings,
            queue=queue,
            tracer=tracer,
            process_job_fn=process_job_fn,
        )

        with (
            patch("tasks.configure_observability") as configure_observability,
            patch("tasks._extract_parent_context", return_value=parent_context),
        ):
            tasks._process_route_job(task, "job-42", dependencies)

        configure_observability.assert_called_once_with(settings)
        process_job_fn.assert_called_once_with(queue, "job-42", 45)
        tracer.start_as_current_span.assert_called_once()

        span_call = tracer.start_as_current_span.call_args
        self.assertEqual(span_call.args[0], "route.process_job")
        self.assertIs(span_call.kwargs["context"], parent_context)
        self.assertEqual(span_call.kwargs["kind"], tasks.SpanKind.CONSUMER)
        self.assertEqual(
            span_call.kwargs["attributes"],
            {
                "messaging.system": "redis",
                "messaging.destination.name": "route-main",
                "messaging.operation": "process",
                "messaging.message.id": "job-42",
                "route.job.id": "job-42",
            },
        )


if __name__ == "__main__":
    unittest.main()
