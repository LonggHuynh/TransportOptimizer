from __future__ import annotations

import os
from typing import Sequence

from models import RouteResult, StopWindow
from route_solver_legacy import compute_route as compute_route_legacy
from route_solver_ortools import compute_route_ortools

SOLVER_ENGINE_AUTO = "auto"
SOLVER_ENGINE_LEGACY = "legacy"
SOLVER_ENGINE_ORTOOLS = "ortools"
LARGE_ROUTE_THRESHOLD = 25
SMALL_COMPARE_THRESHOLD = 20
DEFAULT_ORTOOLS_TIME_LIMIT_SECONDS = 20
SECONDS_PER_MINUTE = 60
MAX_WINDOW_MINUTES = 24 * 60 - 1
MAX_WINDOW_SECONDS = MAX_WINDOW_MINUTES * SECONDS_PER_MINUTE


def _selected_engine() -> str:
    raw = os.getenv("ROUTE_SOLVER_ENGINE", SOLVER_ENGINE_AUTO).strip().lower()
    if raw in {SOLVER_ENGINE_AUTO, SOLVER_ENGINE_LEGACY, SOLVER_ENGINE_ORTOOLS}:
        return raw
    return SOLVER_ENGINE_AUTO


def _parse_int(value: object) -> int | None:
    if not isinstance(value, int) or isinstance(value, bool):
        return None
    return value


def _to_seconds(minutes: int) -> int:
    return max(0, minutes) * SECONDS_PER_MINUTE


def _build_constraints(
    stop_windows: Sequence[StopWindow],
    node_count: int,
) -> list[tuple[int, int, int]]:
    constraints = [(0, MAX_WINDOW_SECONDS, 0) for _ in range(node_count)]
    for stop_window in stop_windows:
        stop_index = _parse_int(stop_window.get("stopIndex"))
        if stop_index is None or stop_index < 0 or stop_index >= node_count:
            continue

        current_start, current_end, current_service = constraints[stop_index]
        window_start = _parse_int(stop_window.get("windowStartMinutes"))
        window_end = _parse_int(stop_window.get("windowEndMinutes"))
        service_minutes = _parse_int(stop_window.get("serviceMinutes"))

        start_seconds = (
            _to_seconds(min(MAX_WINDOW_MINUTES, window_start))
            if window_start is not None
            else current_start
        )
        end_seconds = (
            _to_seconds(min(MAX_WINDOW_MINUTES, window_end))
            if window_end is not None
            else current_end
        )
        service_seconds = (
            _to_seconds(min(MAX_WINDOW_MINUTES, service_minutes))
            if service_minutes is not None and service_minutes > 0
            else current_service
        )

        constraints[stop_index] = (start_seconds, end_seconds, service_seconds)

    return constraints


def _evaluate_order_seconds(
    dist: Sequence[Sequence[int]],
    stop_windows: Sequence[StopWindow],
    order: Sequence[int],
) -> int | None:
    node_count = len(dist)
    if node_count == 0:
        return 0 if not order else None

    if not order:
        return None
    if order[0] != 0 or order[-1] != node_count - 1:
        return None

    intermediate = order[1:-1]
    expected = set(range(1, node_count - 1))
    if set(intermediate) != expected or len(intermediate) != len(expected):
        return None

    constraints = _build_constraints(stop_windows, node_count)

    start_seconds, end_seconds, service_seconds = constraints[0]
    service_start = max(0, start_seconds)
    if service_start > end_seconds:
        return None
    current_time = service_start + service_seconds

    for index in range(1, len(order)):
        from_stop = order[index - 1]
        to_stop = order[index]
        if from_stop < 0 or from_stop >= node_count:
            return None
        if to_stop < 0 or to_stop >= len(dist[from_stop]):
            return None
        travel_seconds = _parse_int(dist[from_stop][to_stop])
        if travel_seconds is None or travel_seconds < 0:
            return None

        arrival_seconds = current_time + travel_seconds
        start_seconds, end_seconds, service_seconds = constraints[to_stop]
        service_start = max(arrival_seconds, start_seconds)
        if service_start > end_seconds:
            return None
        current_time = service_start + service_seconds

    return current_time


def _evaluate_result_seconds(
    result: RouteResult | None,
    dist: Sequence[Sequence[int]],
    stop_windows: Sequence[StopWindow],
) -> int | None:
    if result is None or result.total_time is None:
        return None

    evaluated = _evaluate_order_seconds(dist, stop_windows, result.order)
    if evaluated is None:
        return None

    # OR-Tools may return a non-earliest schedule for the same route.
    if result.total_time < evaluated:
        return None

    return evaluated


def _choose_best_valid_result(
    legacy_result: RouteResult,
    ortools_result: RouteResult | None,
    dist: Sequence[Sequence[int]],
    stop_windows: Sequence[StopWindow],
) -> RouteResult:
    legacy_eval = _evaluate_result_seconds(legacy_result, dist, stop_windows)
    ortools_eval = _evaluate_result_seconds(ortools_result, dist, stop_windows)

    if legacy_eval is None and ortools_eval is None:
        return legacy_result
    if legacy_eval is None:
        return ortools_result if ortools_result is not None else legacy_result
    if ortools_eval is None:
        return legacy_result

    if ortools_eval < legacy_eval:
        return ortools_result if ortools_result is not None else legacy_result
    if legacy_eval < ortools_eval:
        return legacy_result

    if (
        ortools_result is not None
        and ortools_result.total_time is not None
        and legacy_result.total_time is not None
        and ortools_result.total_time < legacy_result.total_time
    ):
        return ortools_result

    return legacy_result


def _resolve_ortools_time_limit_seconds() -> int:
    raw = os.getenv("ROUTE_SOLVER_ORTOOLS_TIME_LIMIT_SECONDS")
    if raw is None:
        return DEFAULT_ORTOOLS_TIME_LIMIT_SECONDS

    try:
        parsed = int(raw.strip())
    except ValueError:
        return DEFAULT_ORTOOLS_TIME_LIMIT_SECONDS

    return max(1, min(300, parsed))


def compute_route(dist: Sequence[Sequence[int]], stop_windows: Sequence[StopWindow]) -> RouteResult:
    node_count = len(dist)
    engine = _selected_engine()
    ortools_time_limit_seconds = _resolve_ortools_time_limit_seconds()

    if engine == SOLVER_ENGINE_LEGACY:
        return compute_route_legacy(dist, stop_windows)

    if node_count < SMALL_COMPARE_THRESHOLD:
        legacy_result = compute_route_legacy(dist, stop_windows)
        ortools_result = compute_route_ortools(
            dist,
            stop_windows,
            time_limit_seconds=ortools_time_limit_seconds,
        )
        return _choose_best_valid_result(legacy_result, ortools_result, dist, stop_windows)

    if engine == SOLVER_ENGINE_ORTOOLS:
        ortools_result = compute_route_ortools(
            dist,
            stop_windows,
            time_limit_seconds=ortools_time_limit_seconds,
        )
        if _evaluate_result_seconds(ortools_result, dist, stop_windows) is not None:
            return ortools_result
        return compute_route_legacy(dist, stop_windows)

    # Auto mode:
    # - Prefer OR-Tools for larger problems.
    # - If OR-Tools is unavailable, keep deterministic local behavior via legacy solver.
    if node_count >= LARGE_ROUTE_THRESHOLD:
        ortools_result = compute_route_ortools(
            dist,
            stop_windows,
            time_limit_seconds=ortools_time_limit_seconds,
        )
        if _evaluate_result_seconds(ortools_result, dist, stop_windows) is not None:
            return ortools_result

    return compute_route_legacy(dist, stop_windows)
