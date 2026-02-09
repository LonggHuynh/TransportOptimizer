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


def _selected_engine() -> str:
    raw = os.getenv("ROUTE_SOLVER_ENGINE", SOLVER_ENGINE_AUTO).strip().lower()
    if raw in {SOLVER_ENGINE_AUTO, SOLVER_ENGINE_LEGACY, SOLVER_ENGINE_ORTOOLS}:
        return raw
    return SOLVER_ENGINE_AUTO


def _has_feasible_result(result: RouteResult | None, node_count: int) -> bool:
    if result is None:
        return False
    if node_count == 0:
        return result.order == [] and result.total_time == 0
    return bool(result.order) and result.total_time is not None


def compute_route(dist: Sequence[Sequence[int]], stop_windows: Sequence[StopWindow]) -> RouteResult:
    node_count = len(dist)
    engine = _selected_engine()

    if engine == SOLVER_ENGINE_LEGACY:
        return compute_route_legacy(dist, stop_windows)

    if engine == SOLVER_ENGINE_ORTOOLS:
        ortools_result = compute_route_ortools(dist, stop_windows)
        if _has_feasible_result(ortools_result, node_count):
            return ortools_result
        return compute_route_legacy(dist, stop_windows)

    # Auto mode:
    # - Prefer OR-Tools for larger problems.
    # - If OR-Tools is unavailable, keep deterministic local behavior via legacy solver.
    if node_count >= LARGE_ROUTE_THRESHOLD:
        ortools_result = compute_route_ortools(dist, stop_windows)
        if _has_feasible_result(ortools_result, node_count):
            return ortools_result

    return compute_route_legacy(dist, stop_windows)
