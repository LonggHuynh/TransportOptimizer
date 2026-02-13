resource "google_service_account" "backend" {
  for_each = local.foundation_environments

  account_id   = local.backend_sa_id[each.key]
  display_name = "Transport backend workload (${each.key})"

  depends_on = [google_project_service.required]
}

resource "google_service_account" "worker" {
  for_each = local.foundation_environments

  account_id   = local.worker_sa_id[each.key]
  display_name = "Transport worker workload (${each.key})"

  depends_on = [google_project_service.required]
}

resource "google_project_iam_member" "backend_secret_access" {
  for_each = local.foundation_environments

  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.backend[each.key].email}"
}

resource "google_project_iam_member" "worker_secret_access" {
  for_each = local.foundation_environments

  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.worker[each.key].email}"
}

resource "google_project_iam_member" "backend_redis_access" {
  for_each = local.foundation_environments

  project = var.project_id
  role    = "roles/redis.dbConnectionUser"
  member  = "serviceAccount:${google_service_account.backend[each.key].email}"
}

resource "google_project_iam_member" "worker_redis_access" {
  for_each = local.foundation_environments

  project = var.project_id
  role    = "roles/redis.dbConnectionUser"
  member  = "serviceAccount:${google_service_account.worker[each.key].email}"
}
