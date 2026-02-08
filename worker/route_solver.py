import random
from typing import Sequence

from models import StopWindow, RouteResult


def _service_minutes_by_stop(stop_windows: Sequence[StopWindow]) -> dict[int, int]:
    service_minutes_by_stop: dict[int, int] = {}
    for stop_window in stop_windows:
        stop_index = stop_window.get("stopIndex")
        service_minutes = stop_window.get("serviceMinutes", 0)
        if not isinstance(stop_index, int) or isinstance(stop_index, bool):
            continue
        if not isinstance(service_minutes, int) or isinstance(service_minutes, bool):
            continue
        if service_minutes <= 0:
            continue
        service_minutes_by_stop[stop_index] = min(1439, service_minutes)
    return service_minutes_by_stop


def _compute_total_time(
    dist: Sequence[Sequence[int]],
    order: list[int],
    service_minutes_by_stop: dict[int, int],
) -> int | None:
    total_time = 0
    for index in range(len(order) - 1):
        from_stop = order[index]
        to_stop = order[index + 1]
        if from_stop >= len(dist) or to_stop >= len(dist[from_stop]):
            return None
        total_time += dist[from_stop][to_stop]
        total_time += service_minutes_by_stop.get(to_stop, 0)
    return total_time


def compute_route(dist: Sequence[Sequence[int]], stop_windows: Sequence[StopWindow]) -> RouteResult:
    service_minutes_by_stop = _service_minutes_by_stop(stop_windows)
    node_count = len(dist)
    if node_count == 0:
        return RouteResult(order=[], total_time=0)
    if node_count == 1:
        return RouteResult(order=[0], total_time=0)

    intermediate_stops = list(range(1, max(1, node_count - 1)))
    random.SystemRandom().shuffle(intermediate_stops)
    order = [0, *intermediate_stops, node_count - 1]
    total_time = _compute_total_time(dist, order, service_minutes_by_stop)
    return RouteResult(order=order, total_time=total_time)
