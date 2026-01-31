from dataclasses import dataclass
from typing import List, Optional, TypedDict

STATUS_QUEUED = "queued"
STATUS_PROCESSING = "processing"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"


class Requirement(TypedDict):
    __annotations__ = {"from": int, "to": int}


class RouteJobPayload(TypedDict):
    distanceMatrix: List[List[int]]
    requirements: List[Requirement]


class RouteResultDict(TypedDict):
    order: List[int]
    totalTime: Optional[int]


@dataclass(frozen=True)
class RouteResult:
    order: List[int]
    total_time: Optional[int]

    def to_dict(self) -> RouteResultDict:
        return {"order": self.order, "totalTime": self.total_time}
