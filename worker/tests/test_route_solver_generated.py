import itertools
import random
import unittest

from route_solver import compute_route
from solvers.heuristic_route_solver import HeuristicRouteSolver
from solvers.route_solver_common import (
    StopConstraint,
    build_stop_constraints,
    compute_total_time_seconds,
    start_departure_seconds,
)


def _build_random_distance_matrix(node_count: int, rng: random.Random) -> list[list[int]]:
    dist: list[list[int]] = []
    for i in range(node_count):
        row: list[int] = []
        for j in range(node_count):
            if i == j:
                row.append(0)
                continue
            row.append(rng.randint(20, 900))
        dist.append(row)
    return dist


def _build_random_stop_windows(node_count: int, rng: random.Random) -> list[dict[str, object]]:
    stop_windows: list[dict[str, object]] = []
    for stop_index in range(node_count):
        if rng.random() < 0.45:
            continue

        window_start = rng.randint(0, 1300)
        window_end = min(1439, window_start + rng.randint(0, 180))
        service_minutes = rng.randint(0, 25)

        stop_window: dict[str, object] = {"stopIndex": stop_index}
        if rng.random() < 0.9:
            stop_window["windowStartMinutes"] = window_start
        if rng.random() < 0.9:
            stop_window["windowEndMinutes"] = window_end
        if rng.random() < 0.8:
            stop_window["serviceMinutes"] = service_minutes

        # Inject occasional contradictory windows to trigger infeasible branches.
        if (
            "windowStartMinutes" in stop_window
            and "windowEndMinutes" in stop_window
            and rng.random() < 0.1
        ):
            stop_window["windowStartMinutes"] = int(stop_window["windowEndMinutes"]) + rng.randint(1, 60)

        stop_windows.append(stop_window)

    # Inject invalid payloads that should be ignored by validation logic.
    if rng.random() < 0.25:
        stop_windows.append({"stopIndex": "invalid", "windowStartMinutes": "x"})  # type: ignore[arg-type]

    return stop_windows


def _brute_force_optimal_total_time(
    dist: list[list[int]],
    constraints: list[StopConstraint],
) -> int | None:
    start_departure = start_departure_seconds(constraints)
    if start_departure is None:
        return None

    node_count = len(dist)
    destination = node_count - 1
    intermediate_stops = list(range(1, destination))

    best_total_time: int | None = None
    for permutation in itertools.permutations(intermediate_stops):
        order = [0, *permutation, destination]
        total_time = compute_total_time_seconds(dist, order, constraints, start_departure)
        if total_time is None:
            continue
        if best_total_time is None or total_time < best_total_time:
            best_total_time = total_time

    return best_total_time


class RouteSolverGeneratedTests(unittest.TestCase):
    def test_generated_small_instances_match_bruteforce_optimum(self) -> None:
        for seed in range(64):
            rng = random.Random(seed)
            node_count = rng.randint(2, 8)
            dist = _build_random_distance_matrix(node_count, rng)
            stop_windows = _build_random_stop_windows(node_count, rng)
            constraints = build_stop_constraints(stop_windows, node_count)

            expected_total_time = _brute_force_optimal_total_time(dist, constraints)
            actual_result = compute_route(dist, stop_windows)

            self.assertEqual(
                actual_result.total_time,
                expected_total_time,
                msg=f"seed={seed} node_count={node_count}",
            )

            if expected_total_time is None:
                self.assertEqual(actual_result.order, [], msg=f"seed={seed}")
                continue

            self.assertEqual(actual_result.order[0], 0, msg=f"seed={seed}")
            self.assertEqual(actual_result.order[-1], node_count - 1, msg=f"seed={seed}")
            self.assertEqual(sorted(actual_result.order), list(range(node_count)), msg=f"seed={seed}")

            departure = start_departure_seconds(constraints)
            self.assertIsNotNone(departure, msg=f"seed={seed}")
            recomputed_total = compute_total_time_seconds(
                dist,
                actual_result.order,
                constraints,
                departure if departure is not None else 0,
            )
            self.assertEqual(recomputed_total, expected_total_time, msg=f"seed={seed}")

    def test_generated_large_instances_are_valid_and_not_worse_than_greedy_seed(self) -> None:
        heuristic_solver = HeuristicRouteSolver()

        for seed in range(200, 208):
            rng = random.Random(seed)
            node_count = rng.randint(23, 30)
            dist = _build_random_distance_matrix(node_count, rng)
            constraints = build_stop_constraints([], node_count)

            route_result = compute_route(dist, [])
            greedy_order, greedy_total = heuristic_solver.solve_greedy(dist, constraints)

            self.assertIsNotNone(greedy_total, msg=f"seed={seed}")
            self.assertIsNotNone(route_result.total_time, msg=f"seed={seed}")
            self.assertEqual(route_result.order[0], 0, msg=f"seed={seed}")
            self.assertEqual(route_result.order[-1], node_count - 1, msg=f"seed={seed}")
            self.assertEqual(sorted(route_result.order), list(range(node_count)), msg=f"seed={seed}")

            start_departure = start_departure_seconds(constraints)
            self.assertIsNotNone(start_departure, msg=f"seed={seed}")
            recomputed_total = compute_total_time_seconds(
                dist,
                route_result.order,
                constraints,
                start_departure if start_departure is not None else 0,
            )
            self.assertEqual(recomputed_total, route_result.total_time, msg=f"seed={seed}")
            self.assertLessEqual(route_result.total_time, greedy_total, msg=f"seed={seed}")
            self.assertEqual(greedy_order[0], 0, msg=f"seed={seed}")
            self.assertEqual(greedy_order[-1], node_count - 1, msg=f"seed={seed}")


if __name__ == "__main__":
    unittest.main()
