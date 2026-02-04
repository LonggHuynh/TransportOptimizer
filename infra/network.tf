resource "google_compute_network" "vpc" {
  name                    = local.gke_vpc_name
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"

  depends_on = [google_project_service.required]
}

resource "google_compute_subnetwork" "primary" {
  for_each = toset(local.environments)

  name                     = local.subnet_name[each.key]
  ip_cidr_range            = local.subnet_cidr[each.key]
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = var.pods_secondary_range_name
    ip_cidr_range = local.pods_secondary_cidr[each.key]
  }

  secondary_ip_range {
    range_name    = var.services_secondary_range_name
    ip_cidr_range = local.services_secondary_cidr[each.key]
  }

  lifecycle {
    precondition {
      condition     = local.subnet_cidrs_ok
      error_message = "For multi-env, provide unique subnet_cidrs entries for every environment."
    }
    precondition {
      condition     = local.pods_secondary_cidrs_ok
      error_message = "For multi-env, provide unique pods_secondary_cidrs entries for every environment."
    }
    precondition {
      condition     = local.services_secondary_cidrs_ok
      error_message = "For multi-env, provide unique services_secondary_cidrs entries for every environment."
    }
  }
}

resource "google_compute_subnetwork" "gke" {
  name                     = local.gke_subnet_name
  ip_cidr_range            = var.gke_subnet_cidr
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = var.pods_secondary_range_name
    ip_cidr_range = var.gke_pods_secondary_cidr
  }

  secondary_ip_range {
    range_name    = var.services_secondary_range_name
    ip_cidr_range = var.gke_services_secondary_cidr
  }
}

resource "google_compute_router" "nat_router" {
  name    = "${local.gke_name_prefix}-nat-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  for_each = toset(local.environments)

  name                               = "${local.name_prefix[each.key]}-nat"
  router                             = google_compute_router.nat_router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.primary[each.key].id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

resource "google_compute_router_nat" "gke" {
  name                               = "${local.gke_name_prefix}-gke-nat"
  router                             = google_compute_router.nat_router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.gke.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}
