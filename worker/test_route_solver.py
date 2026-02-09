import unittest
import time

from route_solver import compute_route
from route_solver_legacy import (
    _build_stop_constraints,
    _solve_exact_tsp_with_time_windows,
    _solve_simulated_annealing_tsp,
)


def _build_dense_distance_matrix(node_count: int) -> list[list[int]]:
    dist: list[list[int]] = []
    for i in range(node_count):
        row: list[int] = []
        for j in range(node_count):
            if i == j:
                row.append(0)
                continue
            row.append(45 + ((i * 17 + j * 31) % 40) + abs(i - j) * 3)
        dist.append(row)
    return dist


class RouteSolverTests(unittest.TestCase):
    def test_returns_direct_route_when_no_intermediate_stops(self) -> None:
        dist = [
            [0, 120],
            [120, 0],
        ]

        result = compute_route(dist, [])

        self.assertEqual(result.order, [0, 1])
        self.assertEqual(result.total_time, 120)

    def test_applies_service_time_at_stop(self) -> None:
        dist = [
            [0, 300, 0],
            [0, 0, 180],
            [0, 0, 0],
        ]
        stop_windows = [
            {
                "stopIndex": 1,
                "windowStartMinutes": 0,
                "windowEndMinutes": 1439,
                "serviceMinutes": 10,
            },
        ]

        result = compute_route(dist, stop_windows)

        self.assertEqual(result.order, [0, 1, 2])
        self.assertEqual(result.total_time, 300 + 10 * 60 + 180)

    def test_respects_time_window_ordering(self) -> None:
        dist = [
            [0, 600, 120, 0],
            [0, 0, 60, 120],
            [0, 60, 0, 600],
            [0, 0, 0, 0],
        ]
        stop_windows = [
            {
                "stopIndex": 1,
                "windowStartMinutes": 0,
                "windowEndMinutes": 5,
                "serviceMinutes": 0,
            },
        ]

        result = compute_route(dist, stop_windows)

        self.assertEqual(result.order, [0, 2, 1, 3])
        self.assertEqual(result.total_time, 120 + 60 + 120)

    def test_waits_for_window_start(self) -> None:
        dist = [
            [0, 60, 0],
            [0, 0, 60],
            [0, 0, 0],
        ]
        stop_windows = [
            {
                "stopIndex": 1,
                "windowStartMinutes": 10,
                "windowEndMinutes": 20,
                "serviceMinutes": 5,
            },
        ]

        result = compute_route(dist, stop_windows)

        self.assertEqual(result.order, [0, 1, 2])
        # 60s travel, wait to 10m (600s), 5m service, 60s to destination.
        self.assertEqual(result.total_time, 960)

    def test_returns_infeasible_when_window_cannot_be_met(self) -> None:
        dist = [
            [0, 600, 0],
            [0, 0, 60],
            [0, 0, 0],
        ]
        stop_windows = [
            {
                "stopIndex": 1,
                "windowStartMinutes": 0,
                "windowEndMinutes": 5,
                "serviceMinutes": 0,
            },
        ]

        result = compute_route(dist, stop_windows)

        self.assertEqual(result.order, [])
        self.assertIsNone(result.total_time)

    def test_large_base_case_returns_valid_route(self) -> None:
        node_count = 24
        dist = _build_dense_distance_matrix(node_count)

        result = compute_route(dist, [])

        self.assertEqual(len(result.order), node_count)
        self.assertEqual(result.order[0], 0)
        self.assertEqual(result.order[-1], node_count - 1)
        self.assertEqual(sorted(result.order), list(range(node_count)))
        self.assertIsNotNone(result.total_time)

    def test_simulated_annealing_is_faster_than_exact_on_larger_case(self) -> None:
        node_count = 19
        dist = _build_dense_distance_matrix(node_count)
        constraints = _build_stop_constraints([], node_count)

        exact_start = time.perf_counter()
        exact_order, exact_total = _solve_exact_tsp_with_time_windows(dist, constraints)
        exact_elapsed = time.perf_counter() - exact_start

        sa_start = time.perf_counter()
        sa_order, sa_total = _solve_simulated_annealing_tsp(dist, constraints)
        sa_elapsed = time.perf_counter() - sa_start

        self.assertEqual(len(exact_order), node_count)
        self.assertEqual(len(sa_order), node_count)
        self.assertIsNotNone(exact_total)
        self.assertIsNotNone(sa_total)
        self.assertLess(sa_elapsed, exact_elapsed)


if __name__ == "__main__":
    unittest.main()
