from __future__ import annotations

import math
import random
from typing import Sequence

from route_solver_common import (
    StopConstraint,
    compute_total_time_seconds,
    departure_after_service,
    has_hard_time_windows,
    start_departure_seconds,
    travel_time_seconds,
)

SIMULATED_ANNEALING_MIN_INTERMEDIATE_STOPS = 20
SA_BASE_ITERATIONS = 5000
SA_ITERATIONS_PER_STOP = 140
SA_COOLING_RATE = 0.9985
SA_INITIAL_TEMPERATURE_RATIO = 0.08
SA_MIN_TEMPERATURE = 0.05
SA_RANDOM_SEED = 17


class HeuristicRouteSolver:
    def solve(
        self,
        dist: Sequence[Sequence[int]],
        constraints: Sequence[StopConstraint],
    ) -> tuple[list[int], int | None]:
        intermediate_count = max(0, len(dist) - 2)
        if (
            intermediate_count > SIMULATED_ANNEALING_MIN_INTERMEDIATE_STOPS
            and not has_hard_time_windows(constraints)
        ):
            return self.solve_simulated_annealing(dist, constraints)
        return self.solve_greedy(dist, constraints)

    def solve_greedy(
        self,
        dist: Sequence[Sequence[int]],
        constraints: Sequence[StopConstraint],
    ) -> tuple[list[int], int | None]:
        node_count = len(dist)
        destination = node_count - 1
        unvisited = set(range(1, destination))

        start_departure = start_departure_seconds(constraints)
        if start_departure is None:
            return [], None

        order = [0]
        current_stop = 0
        current_departure = start_departure

        while unvisited:
            best_choice: tuple[int, int] | None = None
            for candidate in unvisited:
                travel_time = travel_time_seconds(dist, current_stop, candidate)
                if travel_time is None:
                    continue

                arrival_seconds = current_departure + travel_time
                candidate_departure = departure_after_service(
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
        total_time = compute_total_time_seconds(
            dist,
            order,
            constraints,
            start_departure,
        )
        if total_time is None:
            return [], None
        return order, total_time

    def solve_simulated_annealing(
        self,
        dist: Sequence[Sequence[int]],
        constraints: Sequence[StopConstraint],
    ) -> tuple[list[int], int | None]:
        node_count = len(dist)
        if node_count <= 2:
            return self.solve_greedy(dist, constraints)

        start_departure = start_departure_seconds(constraints)
        if start_departure is None:
            return [], None

        seed_order, seed_total_time = self.solve_greedy(dist, constraints)
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
                candidate_order[left : right + 1] = reversed(
                    candidate_order[left : right + 1]
                )
            else:
                candidate_order[left], candidate_order[right] = (
                    candidate_order[right],
                    candidate_order[left],
                )

            candidate_total = compute_total_time_seconds(
                dist,
                candidate_order,
                constraints,
                start_departure,
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
