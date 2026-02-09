from __future__ import annotations

from typing import Sequence

from route_solver_common import (
    StopConstraint,
    compute_total_time_seconds,
    departure_after_service,
    start_departure_seconds,
    travel_time_seconds,
)


class ExactRouteSolver:
    def solve(
        self,
        dist: Sequence[Sequence[int]],
        constraints: Sequence[StopConstraint],
    ) -> tuple[list[int], int | None]:
        node_count = len(dist)
        destination = node_count - 1
        intermediate_nodes = list(range(1, destination))
        intermediate_count = len(intermediate_nodes)

        start_departure = start_departure_seconds(constraints)
        if start_departure is None:
            return [], None

        if intermediate_count == 0:
            order = [0, destination]
            total_time = compute_total_time_seconds(
                dist,
                order,
                constraints,
                start_departure,
            )
            if total_time is None:
                return [], None
            return order, total_time

        full_mask = (1 << intermediate_count) - 1
        best_departure: dict[tuple[int, int], int] = {}
        parent: dict[tuple[int, int], tuple[int, int]] = {}

        for bit_index, stop in enumerate(intermediate_nodes):
            travel_time = travel_time_seconds(dist, 0, stop)
            if travel_time is None:
                continue

            arrival_seconds = start_departure + travel_time
            departure_seconds = departure_after_service(arrival_seconds, constraints[stop])
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

                    travel_time = travel_time_seconds(dist, stop, next_stop)
                    if travel_time is None:
                        continue

                    arrival_seconds = current_departure + travel_time
                    next_departure = departure_after_service(
                        arrival_seconds,
                        constraints[next_stop],
                    )
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

            travel_time = travel_time_seconds(dist, stop, destination)
            if travel_time is None:
                continue

            arrival_seconds = current_departure + travel_time
            destination_departure = departure_after_service(
                arrival_seconds,
                constraints[destination],
            )
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
            parent_key = (mask, current_stop)
            if parent_key not in parent:
                return [], None
            previous_mask, previous_stop = parent[parent_key]
            mask = previous_mask
            current_stop = previous_stop

        reverse_order.append(0)
        order = list(reversed(reverse_order))
        return order, best_total_time
