import os
import random
import unittest
from dataclasses import dataclass
from typing import Sequence

from models import StopWindow
from route_solver import compute_route
from route_solver_legacy import compute_route as compute_route_legacy
from route_solver_ortools import compute_route_ortools

SECONDS_PER_MINUTE = 60
MAX_WINDOW_MINUTES = 24 * 60 - 1


@dataclass(frozen=True)
class Constraint:
    start_seconds: int
    end_seconds: int
    service_seconds: int


def _ortools_available() -> bool:
    probe = compute_route_ortools([[0, 1], [1, 0]], [])
    return probe is not None


def _build_constraints(stop_windows: Sequence[StopWindow], node_count: int) -> list[Constraint]:
    constraints = [
        Constraint(
            start_seconds=0,
            end_seconds=MAX_WINDOW_MINUTES * SECONDS_PER_MINUTE,
            service_seconds=0,
        )
        for _ in range(node_count)
    ]

    for window in stop_windows:
        stop_index = window.get("stopIndex")
        if not isinstance(stop_index, int) or stop_index < 0 or stop_index >= node_count:
            continue

        start_minutes = window.get("windowStartMinutes")
        end_minutes = window.get("windowEndMinutes")
        service_minutes = window.get("serviceMinutes")

        current = constraints[stop_index]
        start_seconds = current.start_seconds
        end_seconds = current.end_seconds
        service_seconds = current.service_seconds

        if isinstance(start_minutes, int):
            start_seconds = max(0, min(MAX_WINDOW_MINUTES, start_minutes)) * SECONDS_PER_MINUTE
        if isinstance(end_minutes, int):
            end_seconds = max(0, min(MAX_WINDOW_MINUTES, end_minutes)) * SECONDS_PER_MINUTE
        if isinstance(service_minutes, int) and service_minutes > 0:
            service_seconds = min(MAX_WINDOW_MINUTES, service_minutes) * SECONDS_PER_MINUTE

        constraints[stop_index] = Constraint(
            start_seconds=start_seconds,
            end_seconds=end_seconds,
            service_seconds=service_seconds,
        )

    return constraints


def _evaluate_route(
    dist: Sequence[Sequence[int]],
    stop_windows: Sequence[StopWindow],
    order: list[int],
) -> int | None:
    node_count = len(dist)
    if node_count == 0:
        return 0 if not order else None

    if not order:
        return None
    if order[0] != 0 or order[-1] != node_count - 1:
        return None

    intermediate = order[1:-1]
    expected = set(range(1, node_count - 1))
    if set(intermediate) != expected or len(intermediate) != len(expected):
        return None

    constraints = _build_constraints(stop_windows, node_count)

    current_time = 0
    origin = constraints[0]
    service_start = max(current_time, origin.start_seconds)
    if service_start > origin.end_seconds:
        return None
    current_time = service_start + origin.service_seconds

    for index in range(1, len(order)):
        from_stop = order[index - 1]
        to_stop = order[index]
        if from_stop < 0 or from_stop >= node_count:
            return None
        if to_stop < 0 or to_stop >= len(dist[from_stop]):
            return None
        travel_time = dist[from_stop][to_stop]
        if not isinstance(travel_time, int) or travel_time < 0:
            return None

        arrival = current_time + travel_time
        constraint = constraints[to_stop]
        service_start = max(arrival, constraint.start_seconds)
        if service_start > constraint.end_seconds:
            return None
        current_time = service_start + constraint.service_seconds

    return current_time


def _generate_case(rng: random.Random, node_count: int) -> tuple[list[list[int]], list[StopWindow]]:
    dist: list[list[int]] = []
    for i in range(node_count):
        row: list[int] = []
        for j in range(node_count):
            if i == j:
                row.append(0)
                continue
            row.append(rng.randint(30, 1800))
        dist.append(row)

    stop_windows: list[StopWindow] = []
    for stop_index in range(1, node_count - 1):
        service_minutes = rng.randint(0, 30)
        if rng.random() < 0.75:
            window_start = rng.randint(0, 900)
            window_size = rng.randint(120, 600)
            window_end = min(MAX_WINDOW_MINUTES, window_start + window_size)
        else:
            window_start = 0
            window_end = MAX_WINDOW_MINUTES

        stop_windows.append(
            StopWindow(
                stopIndex=stop_index,
                windowStartMinutes=window_start,
                windowEndMinutes=window_end,
                serviceMinutes=service_minutes,
            ),
        )

    return dist, stop_windows


class RouteSolverComparisonTests(unittest.TestCase):
    def setUp(self) -> None:
        self._previous_engine = os.environ.get("ROUTE_SOLVER_ENGINE")

    def tearDown(self) -> None:
        if self._previous_engine is None:
            os.environ.pop("ROUTE_SOLVER_ENGINE", None)
        else:
            os.environ["ROUTE_SOLVER_ENGINE"] = self._previous_engine

    def test_auto_matches_legacy_on_small_autogenerated_cases(self) -> None:
        rng = random.Random(20260209)
        os.environ["ROUTE_SOLVER_ENGINE"] = "auto"

        for _ in range(25):
            node_count = rng.randint(3, 12)
            dist, stop_windows = _generate_case(rng, node_count)
            legacy = compute_route_legacy(dist, stop_windows)
            auto = compute_route(dist, stop_windows)

            self.assertEqual(auto.order, legacy.order)
            self.assertEqual(auto.total_time, legacy.total_time)

            if legacy.order:
                evaluated = _evaluate_route(dist, stop_windows, legacy.order)
                self.assertIsNotNone(evaluated)
                self.assertEqual(legacy.total_time, evaluated)

    def test_legacy_vs_ortools_on_small_autogenerated_cases(self) -> None:
        if not _ortools_available():
            self.skipTest("OR-Tools is not available in this environment.")

        rng = random.Random(20260210)

        for _ in range(16):
            node_count = rng.randint(4, 12)
            dist, stop_windows = _generate_case(rng, node_count)

            legacy = compute_route_legacy(dist, stop_windows)
            ortools = compute_route_ortools(dist, stop_windows, time_limit_seconds=2)
            self.assertIsNotNone(ortools)
            assert ortools is not None

            legacy_eval = _evaluate_route(dist, stop_windows, legacy.order)
            ortools_eval = _evaluate_route(dist, stop_windows, ortools.order)

            if legacy.order:
                self.assertIsNotNone(legacy_eval)
                self.assertEqual(legacy.total_time, legacy_eval)
            else:
                self.assertIsNone(legacy.total_time)

            if ortools.order:
                self.assertIsNotNone(ortools_eval)
                assert ortools_eval is not None
                self.assertGreaterEqual(ortools.total_time, ortools_eval)
            else:
                self.assertIsNone(ortools.total_time)

            if legacy_eval is not None and ortools_eval is not None:
                # Legacy solver is exact in this node-count range.
                self.assertLessEqual(legacy_eval, ortools.total_time)

    def test_auto_produces_valid_results_on_large_autogenerated_cases(self) -> None:
        if not _ortools_available():
            self.skipTest("OR-Tools is not available in this environment.")

        rng = random.Random(20260211)
        os.environ["ROUTE_SOLVER_ENGINE"] = "auto"

        for _ in range(6):
            node_count = rng.randint(25, 40)
            dist, stop_windows = _generate_case(rng, node_count)

            auto = compute_route(dist, stop_windows)
            legacy = compute_route_legacy(dist, stop_windows)
            ortools = compute_route_ortools(dist, stop_windows, time_limit_seconds=3)
            self.assertIsNotNone(ortools)
            assert ortools is not None

            auto_eval = _evaluate_route(dist, stop_windows, auto.order)
            legacy_eval = _evaluate_route(dist, stop_windows, legacy.order)
            ortools_eval = _evaluate_route(dist, stop_windows, ortools.order)

            if auto.order:
                self.assertIsNotNone(auto_eval)
                self.assertEqual(auto.total_time, auto_eval)
            else:
                self.assertIsNone(auto.total_time)

            if legacy.order:
                self.assertIsNotNone(legacy_eval)
                self.assertEqual(legacy.total_time, legacy_eval)
                # Auto mode should never be less feasible than legacy mode.
                self.assertIsNotNone(auto_eval)

            if ortools.order:
                self.assertIsNotNone(ortools_eval)
                self.assertEqual(ortools.total_time, ortools_eval)

            if ortools_eval is None and legacy_eval is not None:
                self.assertEqual(auto.order, legacy.order)
                self.assertEqual(auto.total_time, legacy.total_time)


if __name__ == "__main__":
    unittest.main()
