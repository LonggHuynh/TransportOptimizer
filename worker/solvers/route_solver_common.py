from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from pydantic import ValidationError

from models import StopWindow, StopWindowInput

SECONDS_PER_MINUTE = 60
MAX_WINDOW_MINUTES = 24 * 60 - 1
MAX_WINDOW_SECONDS = MAX_WINDOW_MINUTES * SECONDS_PER_MINUTE


@dataclass(frozen=True)
class StopConstraint:
    window_start_seconds: int = 0
    window_end_seconds: int = MAX_WINDOW_SECONDS
    service_seconds: int = 0


def _parse_int(value: object) -> int | None:
    if not isinstance(value, int) or isinstance(value, bool):
        return None
    return value


def _to_seconds(minutes: int) -> int:
    return max(0, minutes) * SECONDS_PER_MINUTE


def build_stop_constraints(
    stop_windows: Sequence[StopWindowInput],
    node_count: int,
) -> list[StopConstraint]:
    constraints = [StopConstraint() for _ in range(node_count)]

    for raw_stop_window in stop_windows:
        if isinstance(raw_stop_window, StopWindow):
            stop_window = raw_stop_window
        else:
            try:
                stop_window = StopWindow.model_validate(raw_stop_window)
            except ValidationError:
                continue

        stop_index = stop_window.stop_index
        if stop_index < 0 or stop_index >= node_count:
            continue

        current = constraints[stop_index]
        window_start = stop_window.window_start_minutes
        window_end = stop_window.window_end_minutes
        service_minutes = stop_window.service_minutes

        start_seconds = (
            _to_seconds(min(MAX_WINDOW_MINUTES, window_start))
            if window_start is not None
            else current.window_start_seconds
        )
        end_seconds = (
            _to_seconds(min(MAX_WINDOW_MINUTES, window_end))
            if window_end is not None
            else current.window_end_seconds
        )
        service_seconds = (
            _to_seconds(min(MAX_WINDOW_MINUTES, service_minutes))
            if service_minutes is not None and service_minutes > 0
            else current.service_seconds
        )

        constraints[stop_index] = StopConstraint(
            window_start_seconds=start_seconds,
            window_end_seconds=end_seconds,
            service_seconds=service_seconds,
        )

    return constraints


def travel_time_seconds(
    dist: Sequence[Sequence[int]],
    from_stop: int,
    to_stop: int,
) -> int | None:
    if from_stop < 0 or from_stop >= len(dist):
        return None
    row = dist[from_stop]
    if to_stop < 0 or to_stop >= len(row):
        return None

    travel_time = _parse_int(row[to_stop])
    if travel_time is None or travel_time < 0:
        return None

    return travel_time


def departure_after_service(
    arrival_seconds: int,
    constraint: StopConstraint,
) -> int | None:
    service_start = max(arrival_seconds, constraint.window_start_seconds)
    if service_start > constraint.window_end_seconds:
        return None
    return service_start + constraint.service_seconds


def start_departure_seconds(constraints: Sequence[StopConstraint]) -> int | None:
    if not constraints:
        return 0
    return departure_after_service(0, constraints[0])


def has_hard_time_windows(constraints: Sequence[StopConstraint]) -> bool:
    for constraint in constraints:
        if (
            constraint.window_start_seconds > 0
            or constraint.window_end_seconds < MAX_WINDOW_SECONDS
        ):
            return True
    return False


def compute_total_time_seconds(
    dist: Sequence[Sequence[int]],
    order: list[int],
    constraints: Sequence[StopConstraint],
    start_departure: int,
) -> int | None:
    current_time = start_departure
    for index in range(1, len(order)):
        from_stop = order[index - 1]
        to_stop = order[index]
        travel_time = travel_time_seconds(dist, from_stop, to_stop)
        if travel_time is None:
            return None

        arrival_seconds = current_time + travel_time
        next_departure = departure_after_service(arrival_seconds, constraints[to_stop])
        if next_departure is None:
            return None
        current_time = next_departure

    return current_time
