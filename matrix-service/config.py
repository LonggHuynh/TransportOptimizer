from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_DRIVING_SPEED_KMH: float = 40.0
DEFAULT_WALKING_SPEED_KMH: float = 5.0
DEFAULT_BICYCLING_SPEED_KMH: float = 15.0
DEFAULT_TRANSIT_SPEED_KMH: float = 25.0

SECONDS_PER_HOUR: int = 3600
METERS_PER_KILOMETER: int = 1000

TRAVEL_MODE_WALKING = "walking"
TRAVEL_MODE_BICYCLING = "bicycling"
TRAVEL_MODE_CYCLING = "cycling"
TRAVEL_MODE_TRANSIT = "transit"
TRAVEL_MODE_DRIVING = "driving"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    host: str = "0.0.0.0"
    port: int = 8082
    driving_speed_kmh: float = Field(default=DEFAULT_DRIVING_SPEED_KMH, gt=0)
    walking_speed_kmh: float = Field(default=DEFAULT_WALKING_SPEED_KMH, gt=0)
    bicycling_speed_kmh: float = Field(default=DEFAULT_BICYCLING_SPEED_KMH, gt=0)
    transit_speed_kmh: float = Field(default=DEFAULT_TRANSIT_SPEED_KMH, gt=0)


def resolve_speed_kmh(settings: Settings, travel_mode: str | None) -> float:
    if travel_mode == TRAVEL_MODE_WALKING:
        return settings.walking_speed_kmh
    if travel_mode in (TRAVEL_MODE_BICYCLING, TRAVEL_MODE_CYCLING):
        return settings.bicycling_speed_kmh
    if travel_mode == TRAVEL_MODE_TRANSIT:
        return settings.transit_speed_kmh
    return settings.driving_speed_kmh


def to_duration_seconds(distance_meters: float, speed_kmh: float) -> int:
    speed_meters_per_second = (speed_kmh * METERS_PER_KILOMETER) / SECONDS_PER_HOUR
    if speed_meters_per_second <= 0:
        return 0
    seconds = distance_meters / speed_meters_per_second
    return int(round(seconds))
