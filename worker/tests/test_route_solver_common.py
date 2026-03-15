import unittest

from solvers.route_solver_common import (
    MAX_WINDOW_SECONDS,
    StopConstraint,
    build_stop_constraints,
    compute_total_time_seconds,
    departure_after_service,
    has_hard_time_windows,
    start_departure_seconds,
    travel_time_seconds,
)


class RouteSolverCommonTests(unittest.TestCase):
    def test_build_stop_constraints_ignores_invalid_and_out_of_range_inputs(self) -> None:
        constraints = build_stop_constraints(
            stop_windows=[
                {"stopIndex": 1, "windowStartMinutes": 5, "windowEndMinutes": 20, "serviceMinutes": 3},
                {"stopIndex": 99, "windowStartMinutes": 1, "windowEndMinutes": 2, "serviceMinutes": 1},
                {"stopIndex": "bad", "windowStartMinutes": 1, "windowEndMinutes": 2, "serviceMinutes": 1},
            ],
            node_count=3,
        )

        self.assertEqual(len(constraints), 3)
        self.assertEqual(constraints[0], StopConstraint())
        self.assertEqual(constraints[1].window_start_seconds, 5 * 60)
        self.assertEqual(constraints[1].window_end_seconds, 20 * 60)
        self.assertEqual(constraints[1].service_seconds, 3 * 60)
        self.assertEqual(constraints[2], StopConstraint())

    def test_build_stop_constraints_clamps_values_and_preserves_previous_service_on_non_positive_value(self) -> None:
        constraints = build_stop_constraints(
            stop_windows=[
                {
                    "stopIndex": 1,
                    "windowStartMinutes": 5000,
                    "windowEndMinutes": 5000,
                    "serviceMinutes": 7,
                },
                {
                    "stopIndex": 1,
                    "windowStartMinutes": 10,
                    "windowEndMinutes": 20,
                    "serviceMinutes": 0,
                },
            ],
            node_count=3,
        )

        self.assertEqual(constraints[1].window_start_seconds, 10 * 60)
        self.assertEqual(constraints[1].window_end_seconds, 20 * 60)
        self.assertEqual(constraints[1].service_seconds, 7 * 60)

    def test_travel_time_seconds_validates_bounds_and_value_type(self) -> None:
        dist = [
            [0, 15, -1, True],
            [9, 0, 8, 7],
        ]

        self.assertEqual(travel_time_seconds(dist, 0, 1), 15)
        self.assertIsNone(travel_time_seconds(dist, -1, 0))
        self.assertIsNone(travel_time_seconds(dist, 2, 0))
        self.assertIsNone(travel_time_seconds(dist, 0, 99))
        self.assertIsNone(travel_time_seconds(dist, 0, 2))
        self.assertIsNone(travel_time_seconds(dist, 0, 3))

    def test_departure_after_service_respects_window(self) -> None:
        constraint = StopConstraint(window_start_seconds=300, window_end_seconds=600, service_seconds=120)

        self.assertEqual(departure_after_service(100, constraint), 420)
        self.assertIsNone(departure_after_service(700, constraint))

    def test_start_departure_seconds_for_empty_and_first_constraint(self) -> None:
        self.assertEqual(start_departure_seconds([]), 0)

        feasible = [StopConstraint(window_start_seconds=0, window_end_seconds=60, service_seconds=0)]
        infeasible = [StopConstraint(window_start_seconds=120, window_end_seconds=60, service_seconds=0)]
        self.assertEqual(start_departure_seconds(feasible), 0)
        self.assertIsNone(start_departure_seconds(infeasible))

    def test_has_hard_time_windows_detects_defaults_and_custom_windows(self) -> None:
        soft = [StopConstraint(), StopConstraint()]
        hard_start = [StopConstraint(window_start_seconds=1)]
        hard_end = [StopConstraint(window_end_seconds=MAX_WINDOW_SECONDS - 1)]

        self.assertFalse(has_hard_time_windows(soft))
        self.assertTrue(has_hard_time_windows(hard_start))
        self.assertTrue(has_hard_time_windows(hard_end))

    def test_compute_total_time_seconds_returns_total_for_valid_route(self) -> None:
        dist = [
            [0, 10, 30],
            [10, 0, 20],
            [30, 20, 0],
        ]
        constraints = [
            StopConstraint(),
            StopConstraint(window_start_seconds=15, window_end_seconds=500, service_seconds=5),
            StopConstraint(window_start_seconds=0, window_end_seconds=500, service_seconds=10),
        ]

        total = compute_total_time_seconds(dist, [0, 1, 2], constraints, start_departure=0)

        # 0->1 (10), wait to 15, service 5 => depart 20; 1->2 (20), service 10 => 50
        self.assertEqual(total, 50)

    def test_compute_total_time_seconds_returns_none_for_bad_travel_or_missed_window(self) -> None:
        bad_dist = [
            [0, -10],
            [10, 0],
        ]
        constraints = [StopConstraint(), StopConstraint()]
        self.assertIsNone(compute_total_time_seconds(bad_dist, [0, 1], constraints, start_departure=0))

        tight_constraints = [
            StopConstraint(),
            StopConstraint(window_start_seconds=0, window_end_seconds=5, service_seconds=0),
        ]
        dist = [
            [0, 10],
            [10, 0],
        ]
        self.assertIsNone(compute_total_time_seconds(dist, [0, 1], tight_constraints, start_departure=0))


if __name__ == "__main__":
    unittest.main()
