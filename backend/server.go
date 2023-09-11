package main

import (
	"backend/handlers"
	"fmt"
	"log"
	"net/http"

	"github.com/rs/cors"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/compute-route", handlers.ComputeRouteHandler)

	// Set up CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"}, // Be sure to adjust this in production
		AllowCredentials: true,
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
	})
	handler := c.Handler(mux)

	port := 8080
	fmt.Printf("Server started on :%d\n", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), handler))
}
