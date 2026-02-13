locals {
  required_apis = toset([
    "cloudresourcemanager.googleapis.com",
    "container.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "networkconnectivity.googleapis.com",
    "secretmanager.googleapis.com",
    "redis.googleapis.com",
    "serviceusage.googleapis.com",
    "servicenetworking.googleapis.com",
    "storage.googleapis.com",
  ])
}

resource "google_project_service" "required" {
  for_each = local.manage_foundation ? local.required_apis : toset([])

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}
