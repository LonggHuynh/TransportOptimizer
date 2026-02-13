resource "google_compute_subnetwork" "psc" {
  count = local.manage_foundation ? 1 : 0

  name          = "${local.gke_name_prefix}-psc"
  ip_cidr_range = var.psc_subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc[0].id
  purpose       = "PRIVATE"

  depends_on = [google_project_service.required]
}

resource "google_network_connectivity_service_connection_policy" "redis" {
  count = local.manage_foundation ? 1 : 0

  name          = "${local.gke_name_prefix}-redis-scp"
  location      = var.region
  service_class = "gcp-memorystore-redis"
  network       = google_compute_network.vpc[0].id

  psc_config {
    subnetworks = [google_compute_subnetwork.psc[0].id]
    limit       = var.redis_psc_connection_limit
  }

  depends_on = [google_project_service.required]
}

resource "google_redis_cluster" "redis" {
  for_each = local.foundation_environments

  name                    = "${local.name_prefix[each.key]}-redis"
  region                  = var.region
  shard_count             = var.redis_shard_count
  replica_count           = var.redis_replica_count
  node_type               = var.redis_node_type
  authorization_mode      = var.redis_auth_mode
  transit_encryption_mode = var.redis_transit_encryption_mode

  psc_configs {
    network = google_compute_network.vpc[0].id
  }

  # Pin the API default explicitly to avoid immutable-field drift across applies.
  zone_distribution_config {
    mode = "MULTI_ZONE"
  }

  # Redis cluster operations are long-running; avoid transient timeout-induced retries.
  timeouts {
    create = "45m"
    update = "45m"
    delete = "60m"
  }

  depends_on = [google_network_connectivity_service_connection_policy.redis[0]]
}
