import argparse
import time

from route_solver_legacy import (
    _build_stop_constraints,
    _solve_exact_tsp_with_time_windows,
    _solve_simulated_annealing_tsp,
)


def _build_dense_distance_matrix(node_count: int) -> list[list[int]]:
    dist: list[list[int]] = []
    for i in range(node_count):
        row: list[int] = []
        for j in range(node_count):
            if i == j:
                row.append(0)
                continue
            row.append(45 + ((i * 17 + j * 31) % 40) + abs(i - j) * 3)
        dist.append(row)
    return dist


def _run_once(node_count: int) -> tuple[float, float, int | None, int | None]:
    dist = _build_dense_distance_matrix(node_count)
    constraints = _build_stop_constraints([], node_count)

    exact_start = time.perf_counter()
    _, exact_total = _solve_exact_tsp_with_time_windows(dist, constraints)
    exact_elapsed = time.perf_counter() - exact_start

    sa_start = time.perf_counter()
    _, sa_total = _solve_simulated_annealing_tsp(dist, constraints)
    sa_elapsed = time.perf_counter() - sa_start

    return exact_elapsed, sa_elapsed, exact_total, sa_total


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark exact DP vs simulated annealing solver.")
    parser.add_argument("--nodes", type=int, default=19, help="Number of nodes in synthetic case.")
    parser.add_argument("--runs", type=int, default=3, help="Number of repeated runs.")
    args = parser.parse_args()

    if args.nodes < 3:
        raise ValueError("--nodes must be at least 3")
    if args.runs < 1:
        raise ValueError("--runs must be at least 1")

    exact_total_elapsed = 0.0
    sa_total_elapsed = 0.0
    last_exact_total: int | None = None
    last_sa_total: int | None = None

    for _ in range(args.runs):
        exact_elapsed, sa_elapsed, exact_total, sa_total = _run_once(args.nodes)
        exact_total_elapsed += exact_elapsed
        sa_total_elapsed += sa_elapsed
        last_exact_total = exact_total
        last_sa_total = sa_total

    exact_avg = exact_total_elapsed / args.runs
    sa_avg = sa_total_elapsed / args.runs
    speedup = exact_avg / sa_avg if sa_avg > 0 else float("inf")

    print(f"nodes={args.nodes} runs={args.runs}")
    print(f"exact_avg_seconds={exact_avg:.6f}")
    print(f"sa_avg_seconds={sa_avg:.6f}")
    print(f"speedup_exact_over_sa={speedup:.2f}x")
    print(f"last_exact_total={last_exact_total}")
    print(f"last_sa_total={last_sa_total}")


if __name__ == "__main__":
    main()
