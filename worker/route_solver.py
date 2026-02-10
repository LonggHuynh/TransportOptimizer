from __future__ import annotations

from typing import Sequence

from models import RouteResult, StopWindowInput
from solvers.route_solver_common import build_stop_constraints, start_departure_seconds
from solvers.route_solver_selector import RouteSolverSelector

_solver_selector = RouteSolverSelector()


def compute_route(
    dist: Sequence[Sequence[int]],
    stop_windows: Sequence[StopWindowInput],
) -> RouteResult:
    node_count = len(dist)
    if node_count == 0:
        return RouteResult(order=[], total_time=0)

    constraints = build_stop_constraints(stop_windows, node_count)
    if node_count == 1:
        departure = start_departure_seconds(constraints)
        if departure is None:
            return RouteResult(order=[], total_time=None)
        return RouteResult(order=[0], total_time=0)

    solver = _solver_selector.select(node_count, constraints)
    order, total_time = solver.solve(dist, constraints)
    return RouteResult(order=order, total_time=total_time)
