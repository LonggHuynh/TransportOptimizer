import unittest

from route_solver import compute_route


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


if __name__ == "__main__":
    unittest.main()
