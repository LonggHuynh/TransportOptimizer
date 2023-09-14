package logic

import (
	"backend/models"
	"math"
)

func ComputeRoute(dist [][]int, requirements []models.Requirement) (models.ComputeRouteResponse, error) {
	reqSet := make(map[[2]int]struct{})

	for _, pair := range requirements {
		reqSet[pair] = struct{}{}
	}

	n := len(dist)

	minimumTime := make([][]int, 1<<n)
	for i := range minimumTime {
		minimumTime[i] = make([]int, n)
		for j := range minimumTime[i] {
			minimumTime[i][j] = math.MaxInt32
		}
	}

	prevVisit := make([][]int, 1<<n)
	for i := range prevVisit {
		prevVisit[i] = make([]int, n)
	}

	minimumTime[1][0] = 0
	for mask := 0; mask < 1<<n; mask++ {
		for last := 0; last < n; last++ {
			if (mask>>last)&1 == 0 {
				continue
			}

		out:
			for next := 0; next < n; next++ {
				for visited := 0; visited < n; visited++ {
					if (mask>>visited)&1 == 1 {
						if _, exists := reqSet[[2]int{next, visited}]; exists {
							continue out
						}
					}
				}
				if next == last {
					continue
				}
				if (mask>>next)&1 == 1 {
					continue
				}
				newMask := mask | (1 << next)

				if minimumTime[newMask][next] > minimumTime[mask][last]+dist[last][next] {
					minimumTime[newMask][next] = minimumTime[mask][last] + dist[last][next]
					prevVisit[newMask][next] = last
				}
			}
		}
	}

	cur := n - 1
	curMask := (1 << n) - 1

	var bestRoutes []int
	bestRoutes = append(bestRoutes, cur)
	for cur != 0 {
		prev := prevVisit[curMask][cur]
		curMask = curMask ^ (1 << cur)
		bestRoutes = append(bestRoutes, prev)
		cur = prev
	}

	for i, j := 0, len(bestRoutes)-1; i < j; i, j = i+1, j-1 {
		bestRoutes[i], bestRoutes[j] = bestRoutes[j], bestRoutes[i]
	}

	response := models.ComputeRouteResponse{
		Order:     bestRoutes,
		TotalTime: minimumTime[(1<<n)-1][n-1],
	}
	return response, nil
}
