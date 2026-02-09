from __future__ import annotations

from dataclasses import dataclass
import math
import random
from typing import Sequence

from models import StopWindow, RouteResult

SECONDS_PER_MINUTE = 60
MAX_WINDOW_MINUTES = 24 * 60 - 1
MAX_WINDOW_SECONDS = MAX_WINDOW_MINUTES * SECONDS_PER_MINUTE
EXACT_SOLVER_MAX_INTERMEDIATE_STOPS = 14
SIMULATED_ANNEALING_MIN_INTERMEDIATE_STOPS = 20
SA_BASE_ITERATIONS = 5000
SA_ITERATIONS_PER_STOP = 140
SA_COOLING_RATE = 0.9985
SA_INITIAL_TEMPERATURE_RATIO = 0.08
SA_MIN_TEMPERATURE = 0.05
SA_RANDOM_SEED = 17


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


def _travel_time_seconds(
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


def _departure_after_service(
    arrival_seconds: int,
    constraint: StopConstraint,
) -> int | None:
    service_start = max(arrival_seconds, constraint.window_start_seconds)
    if service_start > constraint.window_end_seconds:
        return None
    return service_start + constraint.service_seconds


def _start_departure_seconds(constraints: Sequence[StopConstraint]) -> int | None:
    if not constraints:
        return 0
    return _departure_after_service(0, constraints[0])


def _has_hard_time_windows(constraints: Sequence[StopConstraint]) -> bool:
    for constraint in constraints:
        if (
            constraint.window_start_seconds > 0
            or constraint.window_end_seconds < MAX_WINDOW_SECONDS
        ):
            return True
    return False


def _compute_total_time_seconds(
    dist: Sequence[Sequence[int]],
    order: list[int],
    constraints: Sequence[StopConstraint],
    start_departure_seconds: int,
) -> int | None:
    current_time = start_departure_seconds
    for index in range(1, len(order)):
        from_stop = order[index - 1]
        to_stop = order[index]
        travel_time = _travel_time_seconds(dist, from_stop, to_stop)
        if travel_time is None:
            return None

        arrival_seconds = current_time + travel_time
        next_departure = _departure_after_service(arrival_seconds, constraints[to_stop])
        if next_departure is None:
            return None
        current_time = next_departure

    return current_time


def _solve_exact_tsp_with_time_windows(
    dist: Sequence[Sequence[int]],
    constraints: Sequence[StopConstraint],
) -> tuple[list[int], int | None]:
    node_count = len(dist)
    destination = node_count - 1
    intermediate_nodes = list(range(1, destination))
    intermediate_count = len(intermediate_nodes)

    start_departure_seconds = _start_departure_seconds(constraints)
    if start_departure_seconds is None:
        return [], None

    if intermediate_count == 0:
        order = [0, destination]
        total_time_seconds = _compute_total_time_seconds(
            dist,
            order,
            constraints,
            start_departure_seconds,
        )
        if total_time_seconds is None:
            return [], None
        return order, total_time_seconds

    full_mask = (1 << intermediate_count) - 1
    best_departure: dict[tuple[int, int], int] = {}
    parent: dict[tuple[int, int], tuple[int, int]] = {}

    for bit_index, stop in enumerate(intermediate_nodes):
        travel_time = _travel_time_seconds(dist, 0, stop)
        if travel_time is None:
            continue

        arrival_seconds = start_departure_seconds + travel_time
        departure_seconds = _departure_after_service(arrival_seconds, constraints[stop])
        if departure_seconds is None:
            continue

        mask = 1 << bit_index
        key = (mask, stop)
        best_departure[key] = departure_seconds
        parent[key] = (0, 0)

    for mask in range(1, full_mask + 1):
        for bit_index, stop in enumerate(intermediate_nodes):
            if (mask & (1 << bit_index)) == 0:
                continue

            key = (mask, stop)
            current_departure = best_departure.get(key)
            if current_departure is None:
                continue

            for next_bit_index, next_stop in enumerate(intermediate_nodes):
                next_flag = 1 << next_bit_index
                if (mask & next_flag) != 0:
                    continue

                travel_time = _travel_time_seconds(dist, stop, next_stop)
                if travel_time is None:
                    continue

                arrival_seconds = current_departure + travel_time
                next_departure = _departure_after_service(arrival_seconds, constraints[next_stop])
                if next_departure is None:
                    continue

                next_mask = mask | next_flag
                next_key = (next_mask, next_stop)
                known_best = best_departure.get(next_key)
                if known_best is None or next_departure < known_best:
                    best_departure[next_key] = next_departure
                    parent[next_key] = (mask, stop)

    best_total_time: int | None = None
    best_last_stop: int | None = None

    for stop in intermediate_nodes:
        key = (full_mask, stop)
        current_departure = best_departure.get(key)
        if current_departure is None:
            continue

        travel_time = _travel_time_seconds(dist, stop, destination)
        if travel_time is None:
            continue

        arrival_seconds = current_departure + travel_time
        destination_departure = _departure_after_service(arrival_seconds, constraints[destination])
        if destination_departure is None:
            continue

        if best_total_time is None or destination_departure < best_total_time:
            best_total_time = destination_departure
            best_last_stop = stop

    if best_total_time is None or best_last_stop is None:
        return [], None

    reverse_order = [destination]
    mask = full_mask
    current_stop = best_last_stop

    while mask:
        reverse_order.append(current_stop)
        previous_mask, previous_stop = parent[(mask, current_stop)]
        mask = previous_mask
        current_stop = previous_stop

    reverse_order.append(0)
    order = list(reversed(reverse_order))
    return order, best_total_time


def _solve_greedy_tsp_with_time_windows(
    dist: Sequence[Sequence[int]],
    constraints: Sequence[StopConstraint],
) -> tuple[list[int], int | None]:
    node_count = len(dist)
    destination = node_count - 1
    unvisited = set(range(1, destination))

    start_departure_seconds = _start_departure_seconds(constraints)
    if start_departure_seconds is None:
        return [], None

    order = [0]
    current_stop = 0
    current_departure = start_departure_seconds

    while unvisited:
        best_choice: tuple[int, int] | None = None
        for candidate in unvisited:
            travel_time = _travel_time_seconds(dist, current_stop, candidate)
            if travel_time is None:
                continue

            arrival_seconds = current_departure + travel_time
            candidate_departure = _departure_after_service(
                arrival_seconds,
                constraints[candidate],
            )
            if candidate_departure is None:
                continue

            if best_choice is None or candidate_departure < best_choice[1]:
                best_choice = (candidate, candidate_departure)

        if best_choice is None:
            return [], None

        next_stop, next_departure = best_choice
        order.append(next_stop)
        unvisited.remove(next_stop)
        current_stop = next_stop
        current_departure = next_departure

    order.append(destination)
    total_time_seconds = _compute_total_time_seconds(
        dist,
        order,
        constraints,
        start_departure_seconds,
    )
    if total_time_seconds is None:
        return [], None
    return order, total_time_seconds


def _solve_simulated_annealing_tsp(
    dist: Sequence[Sequence[int]],
    constraints: Sequence[StopConstraint],
) -> tuple[list[int], int | None]:
    node_count = len(dist)
    if node_count <= 2:
        return _solve_greedy_tsp_with_time_windows(dist, constraints)

    start_departure_seconds = _start_departure_seconds(constraints)
    if start_departure_seconds is None:
        return [], None

    seed_order, seed_total_time = _solve_greedy_tsp_with_time_windows(dist, constraints)
    if not seed_order or seed_total_time is None:
        return [], None

    rng = random.Random(SA_RANDOM_SEED + node_count)
    current_order = seed_order[:]
    current_total = seed_total_time
    best_order = seed_order[:]
    best_total = seed_total_time

    intermediate_count = max(0, node_count - 2)
    max_iterations = SA_BASE_ITERATIONS + SA_ITERATIONS_PER_STOP * intermediate_count
    temperature = max(
        1.0,
        float(seed_total_time) * SA_INITIAL_TEMPERATURE_RATIO,
    )

    for _ in range(max_iterations):
        left = rng.randint(1, node_count - 2)
        right = rng.randint(1, node_count - 2)
        if left == right:
            continue

        if left > right:
            left, right = right, left

        candidate_order = current_order[:]
        if rng.random() < 0.55:
            candidate_order[left : right + 1] = reversed(candidate_order[left : right + 1])
        else:
            candidate_order[left], candidate_order[right] = (
                candidate_order[right],
                candidate_order[left],
            )

        candidate_total = _compute_total_time_seconds(
            dist,
            candidate_order,
            constraints,
            start_departure_seconds,
        )
        if candidate_total is None:
            continue

        delta = candidate_total - current_total
        should_accept = delta <= 0
        if not should_accept:
            probability = math.exp(-delta / max(temperature, SA_MIN_TEMPERATURE))
            should_accept = rng.random() < probability

        if should_accept:
            current_order = candidate_order
            current_total = candidate_total

            if candidate_total < best_total:
                best_total = candidate_total
                best_order = candidate_order[:]

        temperature = max(SA_MIN_TEMPERATURE, temperature * SA_COOLING_RATE)

    return best_order, best_total


def compute_route(dist: Sequence[Sequence[int]], stop_windows: Sequence[StopWindow]) -> RouteResult:
    node_count = len(dist)
    if node_count == 0:
        return RouteResult(order=[], total_time=0)

    constraints = _build_stop_constraints(stop_windows, node_count)
    if node_count == 1:
        departure = _start_departure_seconds(constraints)
        if departure is None:
            return RouteResult(order=[], total_time=None)
        return RouteResult(order=[0], total_time=0)

    intermediate_count = max(0, node_count - 2)
    if intermediate_count <= EXACT_SOLVER_MAX_INTERMEDIATE_STOPS:
        order, total_time = _solve_exact_tsp_with_time_windows(dist, constraints)
    elif (
        intermediate_count > SIMULATED_ANNEALING_MIN_INTERMEDIATE_STOPS
        and not _has_hard_time_windows(constraints)
    ):
        order, total_time = _solve_simulated_annealing_tsp(dist, constraints)
    else:
        order, total_time = _solve_greedy_tsp_with_time_windows(dist, constraints)

    return RouteResult(order=order, total_time=total_time)
