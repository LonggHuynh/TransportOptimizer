using api.Models;

namespace api.Services;

public class RouteService : IRouteService
{
    public RouteResult ComputeRoute(int[][] dist, List<Requirement> requirements)
    {
        var reqSet = new HashSet<(int, int)>();

        foreach (var pair in requirements)
        {
            reqSet.Add((pair.From, pair.To));
        }

        int n = dist.Length;
        var minimumTime = new int[1 << n][];
        var prevVisit = new int[1 << n][];

        for (int i = 0; i < (1 << n); i++)
        {
            minimumTime[i] = new int[n];
            prevVisit[i] = new int[n];

            for (int j = 0; j < n; j++)
            {
                minimumTime[i][j] = int.MaxValue;
            }
        }

        minimumTime[1][0] = 0;

        for (var mask = 0; mask < (1 << n); mask++)
        {
            for (var last = 0; last < n; last++)
            {
                if ((mask >> last & 1) == 0)
                    continue;

                for (var next = 0; next < n; next++)
                {
                    if (next == last || (mask >> next & 1) == 1)
                        continue;

                    var valid = true;
                    for (var visited = 0; visited < n; visited++)
                    {
                        if ((mask >> visited & 1) == 1 && reqSet.Contains((next, visited)))
                        {
                            valid = false;
                            break;
                        }
                    }

                    if (!valid)
                        continue;

                    var newMask = mask | (1 << next);
                    if (minimumTime[newMask][next] > minimumTime[mask][last] + dist[last][next])
                    {
                        minimumTime[newMask][next] = minimumTime[mask][last] + dist[last][next];
                        prevVisit[newMask][next] = last;
                    }
                }
            }
        }

        // Reconstruct the best route
        int cur = n - 1;
        int curMask = (1 << n) - 1;
        List<int> bestRoutes = new List<int> { cur };

        while (cur != 0)
        {
            int prev = prevVisit[curMask][cur];
            curMask ^= (1 << cur);
            bestRoutes.Add(prev);
            cur = prev;
        }

        bestRoutes.Reverse();

        return new RouteResult
        {
            Order = bestRoutes,
            TotalTime = minimumTime[(1 << n) - 1][n - 1]
        };
    }
}