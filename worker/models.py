from dataclasses import dataclass
from typing import List, Optional

STATUS_QUEUED = "queued"
STATUS_PROCESSING = "processing"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"


@dataclass(frozen=True)
class RouteResult:
    order: List[int]
    total_time: Optional[int]

    def to_dict(self) -> dict:
        return {"order": self.order, "totalTime": self.total_time}
