from __future__ import annotations

from typing import Protocol, Sequence

from solvers.exact_route_solver import ExactRouteSolver
from solvers.heuristic_route_solver import HeuristicRouteSolver
from solvers.route_solver_common import StopConstraint

EXACT_SOLVER_MAX_INTERMEDIATE_STOPS = 14


class RouteProblemSolver(Protocol):
    def solve(
        self,
        dist: Sequence[Sequence[int]],
        constraints: Sequence[StopConstraint],
    ) -> tuple[list[int], int | None]:
        ...


class RouteSolverSelector:
    def __init__(
        self,
        exact_solver: RouteProblemSolver | None = None,
        heuristic_solver: RouteProblemSolver | None = None,
    ) -> None:
        self._exact_solver = exact_solver or ExactRouteSolver()
        self._heuristic_solver = heuristic_solver or HeuristicRouteSolver()

    def select(self, node_count: int, _constraints: Sequence[StopConstraint]) -> RouteProblemSolver:
        intermediate_count = max(0, node_count - 2)
        if intermediate_count <= EXACT_SOLVER_MAX_INTERMEDIATE_STOPS:
            return self._exact_solver
        return self._heuristic_solver
