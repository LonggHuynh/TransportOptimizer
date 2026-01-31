from models import RouteResult


def compute_route(dist, requirements) -> RouteResult:
    req_set = {(req["from"], req["to"]) for req in requirements}
    n = len(dist)
    max_val = 10**8
    minimum_time = [[max_val] * n for _ in range(1 << n)]
    prev_visit = [[0] * n for _ in range(1 << n)]

    minimum_time[1][0] = 0

    for mask in range(1 << n):
        for last in range(n):
            if (mask >> last) & 1 == 0:
                continue
            for nxt in range(n):
                if nxt == last or ((mask >> nxt) & 1) == 1:
                    continue

                valid = True
                for visited in range(n):
                    if ((mask >> visited) & 1) == 1 and (nxt, visited) in req_set:
                        valid = False
                        break
                if not valid:
                    continue

                new_mask = mask | (1 << nxt)
                cand = minimum_time[mask][last] + dist[last][nxt]
                if minimum_time[new_mask][nxt] > cand:
                    minimum_time[new_mask][nxt] = cand
                    prev_visit[new_mask][nxt] = last

    cur = n - 1
    cur_mask = (1 << n) - 1
    best_routes = [cur]

    while cur != 0:
        prev = prev_visit[cur_mask][cur]
        cur_mask ^= 1 << cur
        best_routes.append(prev)
        cur = prev

    best_routes.reverse()
    total_time = minimum_time[(1 << n) - 1][n - 1]
    if total_time >= max_val:
        total_time = None

    return RouteResult(order=best_routes, total_time=total_time)
