package handlers

import (
	"backend/logic"
	"backend/models"
	"encoding/json"
	"net/http"
)

func ComputeRouteHandler(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodPost {
		http.Error(w, "Only POST is supported", http.StatusMethodNotAllowed)
		return
	}

	var request models.ComputeRouteRequest
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&request); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	result, err := logic.ComputeRoute(request.Dist, request.Requirements)

	if err != nil {
		http.Error(w, "Failed to compute route", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
