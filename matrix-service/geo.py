from __future__ import annotations

import math

EARTH_RADIUS_METERS: float = 6_371_000.0
DEGREES_TO_RADIANS: float = math.pi / 180.0


def haversine_distance_meters(
    origin_latitude: float,
    origin_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
) -> float:
    origin_lat_rad = origin_latitude * DEGREES_TO_RADIANS
    destination_lat_rad = destination_latitude * DEGREES_TO_RADIANS
    latitude_delta = (destination_latitude - origin_latitude) * DEGREES_TO_RADIANS
    longitude_delta = (destination_longitude - origin_longitude) * DEGREES_TO_RADIANS

    sine_latitude = math.sin(latitude_delta / 2.0)
    sine_longitude = math.sin(longitude_delta / 2.0)

    intermediate = (sine_latitude * sine_latitude) + (
        math.cos(origin_lat_rad)
        * math.cos(destination_lat_rad)
        * sine_longitude
        * sine_longitude
    )

    angular_distance = 2.0 * math.atan2(
        math.sqrt(intermediate), math.sqrt(1.0 - intermediate)
    )
    return EARTH_RADIUS_METERS * angular_distance
