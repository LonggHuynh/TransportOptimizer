from __future__ import annotations

from models import Coordinate, MatrixResponse
from config import Settings, resolve_speed_kmh, to_duration_seconds
from geo import haversine_distance_meters


class MatrixService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def compute_duration_matrix(
        self, places: list[Coordinate], travel_mode: str | None
    ) -> MatrixResponse:
        if len(places) == 0:
            return MatrixResponse(duration_matrix=[])

        speed_kmh = resolve_speed_kmh(self._settings, travel_mode)
        size = len(places)
        matrix: list[list[int]] = []

        for origin_index in range(size):
            row: list[int] = []
            origin = places[origin_index]
            for destination_index in range(size):
                if origin_index == destination_index:
                    row.append(0)
                    continue
                destination = places[destination_index]
                distance_meters = haversine_distance_meters(
                    origin.latitude,
                    origin.longitude,
                    destination.latitude,
                    destination.longitude,
                )
                row.append(to_duration_seconds(distance_meters, speed_kmh))
            matrix.append(row)

        return MatrixResponse(duration_matrix=matrix)
