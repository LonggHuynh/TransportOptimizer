from dataclasses import dataclass
from typing import Any, List, Mapping, Optional, TypeAlias, TypedDict

from pydantic import BaseModel, ConfigDict, Field, StrictInt

STATUS_QUEUED = "queued"
STATUS_PROCESSING = "processing"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"


class StopWindow(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    stop_index: StrictInt = Field(alias="stopIndex", ge=0)
    window_start_minutes: StrictInt | None = Field(default=None, alias="windowStartMinutes")
    window_end_minutes: StrictInt | None = Field(default=None, alias="windowEndMinutes")
    service_minutes: StrictInt | None = Field(default=None, alias="serviceMinutes")


StopWindowInput: TypeAlias = StopWindow | Mapping[str, Any]


class RouteJobPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    distance_matrix: List[List[StrictInt]] = Field(default_factory=list, alias="distanceMatrix")
    stop_windows: List[StopWindow] = Field(default_factory=list, alias="stopWindows")


class RouteResultDict(TypedDict):
    order: List[int]
    totalTime: Optional[int]


@dataclass(frozen=True)
class RouteResult:
    order: List[int]
    total_time: Optional[int]

    def to_dict(self) -> RouteResultDict:
        return {"order": self.order, "totalTime": self.total_time}
