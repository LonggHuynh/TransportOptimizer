resource "google_service_account_iam_member" "backend_workload_identity" {
  for_each = local.foundation_environments

  service_account_id = google_service_account.backend[each.key].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${local.k8s_namespace[each.key]}/${local.backend_k8s_service_account}]"

  depends_on = [google_container_cluster.primary]
}

resource "google_service_account_iam_member" "worker_workload_identity" {
  for_each = local.foundation_environments

  service_account_id = google_service_account.worker[each.key].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${local.k8s_namespace[each.key]}/${local.worker_k8s_service_account}]"

  depends_on = [google_container_cluster.primary]
}
