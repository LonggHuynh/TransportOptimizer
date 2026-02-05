resource "google_compute_subnetwork" "psc" {
  name          = "${local.gke_name_prefix}-psc"
  ip_cidr_range = var.psc_subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc.id
  purpose       = "PRIVATE"

  depends_on = [google_project_service.required]
}

resource "google_network_connectivity_service_connection_policy" "redis" {
  name          = "${local.gke_name_prefix}-redis-scp"
  location      = var.region
  service_class = "gcp-memorystore-redis"
  network       = google_compute_network.vpc.id

  psc_config {
    subnetworks = [google_compute_subnetwork.psc.id]
    limit       = var.redis_psc_connection_limit
  }

  depends_on = [google_project_service.required]
}

resource "google_redis_cluster" "redis" {
  for_each = toset(local.environments)

  name                     = "${local.name_prefix[each.key]}-redis"
  region                   = var.region
  shard_count              = var.redis_shard_count
  replica_count            = var.redis_replica_count
  node_type                = var.redis_node_type
  authorization_mode       = var.redis_auth_mode
  transit_encryption_mode  = var.redis_transit_encryption_mode

  psc_configs {
    network = google_compute_network.vpc.id
  }

  depends_on = [google_network_connectivity_service_connection_policy.redis]
}
