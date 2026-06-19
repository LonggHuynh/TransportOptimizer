from __future__ import annotations

import json
import threading
import unittest
import urllib.request

from config import Settings
from geo import haversine_distance_meters
from models import Coordinate, MatrixRequest
from matrix_service import MatrixService


def _settings() -> Settings:
    return Settings(
        driving_speed_kmh=40.0,
        walking_speed_kmh=5.0,
        bicycling_speed_kmh=15.0,
        transit_speed_kmh=25.0,
    )


class GeoCalculatorTests(unittest.TestCase):
    def test_same_point_returns_zero(self) -> None:
        distance = haversine_distance_meters(10.0, 20.0, 10.0, 20.0)
        self.assertAlmostEqual(distance, 0.0, places=4)

    def test_known_route_returns_expected_distance(self) -> None:
        distance = haversine_distance_meters(52.5200, 13.4050, 48.8566, 2.3522)
        self.assertAlmostEqual(distance, 877617.0, delta=1000.0)


class MatrixServiceTests(unittest.TestCase):
    def test_empty_places_returns_empty_matrix(self) -> None:
        service = MatrixService(_settings())
        response = service.compute_duration_matrix([], None)
        self.assertEqual(response.duration_matrix, [])

    def test_single_place_returns_zero_matrix(self) -> None:
        service = MatrixService(_settings())
        places = [Coordinate(latitude=10.0, longitude=20.0)]
        response = service.compute_duration_matrix(places, None)
        self.assertEqual(response.duration_matrix, [[0]])

    def test_two_places_returns_symmetric_durations(self) -> None:
        service = MatrixService(_settings())
        places = [
            Coordinate(latitude=52.5200, longitude=13.4050),
            Coordinate(latitude=48.8566, longitude=2.3522),
        ]
        response = service.compute_duration_matrix(places, None)
        matrix = response.duration_matrix

        self.assertEqual(len(matrix), 2)
        self.assertEqual(matrix[0][0], 0)
        self.assertEqual(matrix[1][1], 0)
        self.assertGreater(matrix[0][1], 0)
        self.assertAlmostEqual(matrix[0][1], matrix[1][0], delta=1)

    def test_walking_mode_returns_larger_duration_than_driving(self) -> None:
        service = MatrixService(_settings())
        places = [
            Coordinate(latitude=52.5200, longitude=13.4050),
            Coordinate(latitude=48.8566, longitude=2.3522),
        ]
        driving = service.compute_duration_matrix(places, "driving")
        walking = service.compute_duration_matrix(places, "walking")
        self.assertGreater(walking.duration_matrix[0][1], driving.duration_matrix[0][1])

    def test_unknown_travel_mode_defaults_to_driving(self) -> None:
        service = MatrixService(_settings())
        places = [
            Coordinate(latitude=52.5200, longitude=13.4050),
            Coordinate(latitude=48.8566, longitude=2.3522),
        ]
        driving = service.compute_duration_matrix(places, "driving")
        unknown = service.compute_duration_matrix(places, "flying")
        self.assertEqual(driving.duration_matrix[0][1], unknown.duration_matrix[0][1])


class ModelTests(unittest.TestCase):
    def test_matrix_request_normalizes_travel_mode(self) -> None:
        request = MatrixRequest.model_validate(
            {"places": [], "travelMode": "  Walking  "}
        )
        self.assertEqual(request.travel_mode, "walking")

    def test_coordinate_rejects_invalid_latitude(self) -> None:
        with self.assertRaises(ValueError):
            Coordinate(latitude=200.0, longitude=0.0)


class HttpAppTests(unittest.TestCase):
    def setUp(self) -> None:
        from app import create_server

        self._settings = Settings(host="127.0.0.1", port=0)
        self._server = create_server(self._settings)
        self._port = self._server.server_address[1]
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()

    def tearDown(self) -> None:
        self._server.shutdown()
        self._server.server_close()
        self._thread.join(timeout=5)

    def test_health_endpoint(self) -> None:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{self._port}/healthz", timeout=5
        ) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.read().decode("utf-8"), "ok")

    def test_matrix_endpoint_returns_duration_matrix(self) -> None:
        body = json.dumps(
            {
                "places": [
                    {"latitude": 52.5200, "longitude": 13.4050},
                    {"latitude": 48.8566, "longitude": 2.3522},
                ],
                "travelMode": "driving",
            }
        ).encode("utf-8")

        req = urllib.request.Request(
            f"http://127.0.0.1:{self._port}/matrix",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            self.assertEqual(response.status, 200)
            payload = json.loads(response.read().decode("utf-8"))

        matrix = payload["durationMatrix"]
        self.assertEqual(len(matrix), 2)
        self.assertEqual(matrix[0][0], 0)
        self.assertEqual(matrix[1][1], 0)
        self.assertGreater(matrix[0][1], 0)

    def test_matrix_endpoint_rejects_invalid_coordinates(self) -> None:
        body = json.dumps(
            {"places": [{"latitude": 200.0, "longitude": 0.0}]}
        ).encode("utf-8")

        req = urllib.request.Request(
            f"http://127.0.0.1:{self._port}/matrix",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            urllib.request.urlopen(req, timeout=5)
        except urllib.error.HTTPError as error:
            self.assertEqual(error.code, 400)
        else:
            self.fail("expected HTTP 400 for invalid coordinates")

    def test_unknown_path_returns_404(self) -> None:
        req = urllib.request.Request(
            f"http://127.0.0.1:{self._port}/unknown",
            method="POST",
            data=b"{}",
        )
        try:
            urllib.request.urlopen(req, timeout=5)
        except urllib.error.HTTPError as error:
            self.assertEqual(error.code, 404)
        else:
            self.fail("expected HTTP 404 for unknown path")


if __name__ == "__main__":
    unittest.main()
