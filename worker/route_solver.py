from __future__ import annotations

from typing import Sequence

from models import RouteResult, StopWindow
from route_solver_legacy import compute_route as compute_route_legacy


def compute_route(dist: Sequence[Sequence[int]], stop_windows: Sequence[StopWindow]) -> RouteResult:
    return compute_route_legacy(dist, stop_windows)
