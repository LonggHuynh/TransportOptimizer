from __future__ import annotations

from typing import Sequence

from models import RouteResult, StopWindow
from route_solver import compute_route as compute_route_v2
from solvers.exact_route_solver import ExactRouteSolver
from solvers.heuristic_route_solver import HeuristicRouteSolver
from solvers.route_solver_common import (
    StopConstraint,
    build_stop_constraints as _build_stop_constraints,
    compute_total_time_seconds as _compute_total_time_seconds,
    departure_after_service as _departure_after_service,
    has_hard_time_windows as _has_hard_time_windows,
    start_departure_seconds as _start_departure_seconds,
    travel_time_seconds as _travel_time_seconds,
)

_exact_solver = ExactRouteSolver()
_heuristic_solver = HeuristicRouteSolver()


def _solve_exact_tsp_with_time_windows(
    dist: Sequence[Sequence[int]],
    constraints: Sequence[StopConstraint],
) -> tuple[list[int], int | None]:
    return _exact_solver.solve(dist, constraints)


def _solve_greedy_tsp_with_time_windows(
    dist: Sequence[Sequence[int]],
    constraints: Sequence[StopConstraint],
) -> tuple[list[int], int | None]:
    return _heuristic_solver.solve_greedy(dist, constraints)


def _solve_simulated_annealing_tsp(
    dist: Sequence[Sequence[int]],
    constraints: Sequence[StopConstraint],
) -> tuple[list[int], int | None]:
    return _heuristic_solver.solve_simulated_annealing(dist, constraints)


def compute_route(
    dist: Sequence[Sequence[int]],
    stop_windows: Sequence[StopWindow],
) -> RouteResult:
    return compute_route_v2(dist, stop_windows)
