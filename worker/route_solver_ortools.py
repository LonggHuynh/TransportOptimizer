from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from models import RouteResult, StopWindow

SECONDS_PER_MINUTE = 60
MAX_WINDOW_MINUTES = 24 * 60 - 1
MAX_WINDOW_SECONDS = MAX_WINDOW_MINUTES * SECONDS_PER_MINUTE
DEFAULT_SOLVER_TIME_LIMIT_SECONDS = 5


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


def _build_stop_constraints(
    stop_windows: Sequence[StopWindow],
    node_count: int,
) -> list[StopConstraint]:
    constraints = [StopConstraint() for _ in range(node_count)]

    for stop_window in stop_windows:
        stop_index = _parse_int(stop_window.get("stopIndex"))
        if stop_index is None or stop_index < 0 or stop_index >= node_count:
            continue

        current = constraints[stop_index]
        window_start = _parse_int(stop_window.get("windowStartMinutes"))
        window_end = _parse_int(stop_window.get("windowEndMinutes"))
        service_minutes = _parse_int(stop_window.get("serviceMinutes"))

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


def _is_valid_distance_matrix(dist: Sequence[Sequence[int]]) -> bool:
    node_count = len(dist)
    for row in dist:
        if len(row) < node_count:
            return False
        for value in row[:node_count]:
            if not isinstance(value, int) or isinstance(value, bool) or value < 0:
                return False
    return True


def _safe_time_horizon_seconds(
    dist: Sequence[Sequence[int]],
    constraints: Sequence[StopConstraint],
) -> int:
    max_row_sum = 0
    for row in dist:
        max_row_sum = max(max_row_sum, sum(row[: len(dist)]))
    total_service = sum(constraint.service_seconds for constraint in constraints)
    return max(MAX_WINDOW_SECONDS, max_row_sum + total_service + MAX_WINDOW_SECONDS)


def compute_route_ortools(
    dist: Sequence[Sequence[int]],
    stop_windows: Sequence[StopWindow],
    time_limit_seconds: int = DEFAULT_SOLVER_TIME_LIMIT_SECONDS,
) -> RouteResult | None:
    try:
        from ortools.constraint_solver import pywrapcp, routing_enums_pb2
    except ImportError:
        return None

    node_count = len(dist)
    if node_count == 0:
        return RouteResult(order=[], total_time=0)

    if not _is_valid_distance_matrix(dist):
        return RouteResult(order=[], total_time=None)

    constraints = _build_stop_constraints(stop_windows, node_count)

    if node_count == 1:
        if constraints[0].window_start_seconds > constraints[0].window_end_seconds:
            return RouteResult(order=[], total_time=None)
        return RouteResult(order=[0], total_time=0)

    destination = node_count - 1
    manager = pywrapcp.RoutingIndexManager(node_count, 1, [0], [destination])
    routing = pywrapcp.RoutingModel(manager)

    def transit_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        travel_seconds = dist[from_node][to_node]
        service_seconds = constraints[from_node].service_seconds
        return travel_seconds + service_seconds

    transit_callback_index = routing.RegisterTransitCallback(transit_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    horizon_seconds = _safe_time_horizon_seconds(dist, constraints)
    routing.AddDimension(
        transit_callback_index,
        horizon_seconds,
        horizon_seconds,
        False,
        "Time",
    )
    time_dimension = routing.GetDimensionOrDie("Time")

    for node in range(node_count):
        if node == 0:
            index = routing.Start(0)
        elif node == destination:
            index = routing.End(0)
        else:
            index = manager.NodeToIndex(node)

        constraint = constraints[node]
        time_dimension.CumulVar(index).SetRange(
            constraint.window_start_seconds,
            constraint.window_end_seconds,
        )

    time_dimension.SetGlobalSpanCostCoefficient(1)
    routing.AddVariableMinimizedByFinalizer(time_dimension.CumulVar(routing.Start(0)))
    routing.AddVariableMinimizedByFinalizer(time_dimension.CumulVar(routing.End(0)))

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.FromSeconds(max(1, time_limit_seconds))
    search_parameters.log_search = False

    solution = routing.SolveWithParameters(search_parameters)
    if solution is None:
        return RouteResult(order=[], total_time=None)

    order: list[int] = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        order.append(manager.IndexToNode(index))
        index = solution.Value(routing.NextVar(index))
    order.append(destination)

    end_seconds = solution.Value(time_dimension.CumulVar(routing.End(0)))
    total_time = end_seconds + constraints[destination].service_seconds
    return RouteResult(order=order, total_time=total_time)
