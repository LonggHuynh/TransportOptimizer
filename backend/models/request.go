package models

type Requirement [2]int

type ComputeRouteRequest struct {
	Dist         [][]int       `json:"dist"`
	Requirements []Requirement `json:"requirements"`
}
