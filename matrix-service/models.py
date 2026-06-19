from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Coordinate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class MatrixRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    places: list[Coordinate] = Field(default_factory=list)
    travel_mode: Optional[str] = Field(default=None, alias="travelMode")

    @field_validator("travel_mode")
    @classmethod
    def normalize_travel_mode(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        trimmed = value.strip().lower()
        return trimmed if trimmed else None


class MatrixResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    duration_matrix: list[list[int]] = Field(alias="durationMatrix")
