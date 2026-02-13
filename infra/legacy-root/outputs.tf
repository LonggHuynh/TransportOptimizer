output "vpc_names" {
  value       = { (local.gke_output_key) = google_compute_network.vpc.name }
  description = "VPC network names by GKE environment."
}

output "subnet_names" {
  value       = { for env in local.environments : env => google_compute_subnetwork.primary[env].name }
  description = "Primary subnet names by environment."
}

output "gke_subnet_name" {
  value       = google_compute_subnetwork.gke.name
  description = "Subnet name used by the shared GKE cluster."
}

output "gke_cluster_names" {
  value       = { (local.gke_output_key) = google_container_cluster.primary.name }
  description = "GKE cluster names by GKE environment."
}

output "gke_cluster_endpoints" {
  value       = { (local.gke_output_key) = google_container_cluster.primary.endpoint }
  description = "GKE control plane endpoints by GKE environment."
}

output "backend_service_account_emails" {
  value       = { for env in local.environments : env => google_service_account.backend[env].email }
  description = "Service account emails for backend workload identity by environment."
}

output "worker_service_account_emails" {
  value       = { for env in local.environments : env => google_service_account.worker[env].email }
  description = "Service account emails for worker workload identity by environment."
}

output "frontend_bucket_names" {
  value       = { for env in local.environments : env => google_storage_bucket.frontend[env].name }
  description = "Frontend GCS bucket names by environment."
}

output "frontend_lb_ips" {
  value       = { for env in local.environments : env => google_compute_global_address.frontend[env].address }
  description = "Global HTTP load balancer IPs for frontend by environment."
}

output "frontend_http_urls" {
  value       = { for env in local.environments : env => "http://${google_compute_global_address.frontend[env].address}" }
  description = "Frontend HTTP URLs (no TLS yet) by environment."
}
