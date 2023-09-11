package models

type ComputeRouteResponse struct {
	Order     []int `json:"bestOrder"`
	TotalTime int   `json:"totalTime"`
}
