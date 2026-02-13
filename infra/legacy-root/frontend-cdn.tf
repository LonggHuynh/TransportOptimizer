resource "google_storage_bucket" "frontend" {
  for_each = toset(local.environments)

  name                        = local.frontend_bucket_name[each.key]
  location                    = var.region
  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }

  lifecycle {
    precondition {
      condition     = local.frontend_bucket_names_ok
      error_message = "Provide frontend bucket names via frontend_bucket_name or frontend_bucket_names for every environment."
    }
    precondition {
      condition     = local.frontend_bucket_names_unique
      error_message = "Frontend bucket names must be unique across environments."
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_storage_bucket_iam_member" "frontend_public_read" {
  for_each = toset(local.environments)

  bucket = google_storage_bucket.frontend[each.key].name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_compute_backend_bucket" "frontend" {
  for_each = toset(local.environments)

  name        = local.frontend_backend_bucket_name[each.key]
  bucket_name = google_storage_bucket.frontend[each.key].name
  enable_cdn  = var.cdn_enabled
}

resource "google_compute_url_map" "frontend" {
  for_each = toset(local.environments)

  name            = local.frontend_url_map_name[each.key]
  default_service = google_compute_backend_bucket.frontend[each.key].self_link
}

resource "google_compute_target_http_proxy" "frontend" {
  for_each = toset(local.environments)

  name    = local.frontend_http_proxy_name[each.key]
  url_map = google_compute_url_map.frontend[each.key].self_link
}

resource "google_compute_global_address" "frontend" {
  for_each = toset(local.environments)

  name = local.frontend_ip_name[each.key]

  depends_on = [google_project_service.required]
}

resource "google_compute_global_forwarding_rule" "frontend" {
  for_each = toset(local.environments)

  name                  = local.frontend_forwarding_rule_name[each.key]
  load_balancing_scheme = "EXTERNAL"
  ip_protocol           = "TCP"
  port_range            = "80"
  target                = google_compute_target_http_proxy.frontend[each.key].self_link
  ip_address            = google_compute_global_address.frontend[each.key].address
}
