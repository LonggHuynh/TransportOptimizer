resource "google_container_cluster" "primary" {
  name     = local.gke_cluster_name
  location = var.region

  enable_autopilot     = true
  deletion_protection  = false
  network              = google_compute_network.vpc.name
  subnetwork           = google_compute_subnetwork.gke.name

  ip_allocation_policy {
    cluster_secondary_range_name  = var.pods_secondary_range_name
    services_secondary_range_name = var.services_secondary_range_name
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  release_channel {
    channel = var.gke_release_channel
  }

  depends_on = [google_project_service.required]
}
