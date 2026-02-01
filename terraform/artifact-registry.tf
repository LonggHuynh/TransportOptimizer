// We use ghcr but added here for now
resource "google_artifact_registry_repository" "docker" {
  count = var.create_artifact_registry ? 1 : 0

  location      = local.artifact_registry_location
  repository_id = var.artifact_registry_repo_id
  format        = "DOCKER"
  description   = "Optional Artifact Registry for TransportOptimizer images"

  depends_on = [google_project_service.required]
}
