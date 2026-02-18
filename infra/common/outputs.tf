output "vpc_names" {
  value       = length(google_compute_network.vpc) > 0 ? { (local.gke_output_key) = google_compute_network.vpc[0].name } : {}
  description = "VPC network names by GKE environment."
}

output "subnet_names" {
  value       = { for env, subnet in google_compute_subnetwork.primary : env => subnet.name }
  description = "Primary subnet names by environment."
}

output "gke_subnet_name" {
  value       = try(google_compute_subnetwork.gke[0].name, null)
  description = "Subnet name used by the shared GKE cluster."
}

output "gke_cluster_names" {
  value       = length(google_container_cluster.primary) > 0 ? { (local.gke_output_key) = google_container_cluster.primary[0].name } : {}
  description = "GKE cluster names by GKE environment."
}

output "gke_cluster_endpoints" {
  value       = length(google_container_cluster.primary) > 0 ? { (local.gke_output_key) = google_container_cluster.primary[0].endpoint } : {}
  description = "GKE control plane endpoints by GKE environment."
}

output "backend_service_account_emails" {
  value       = { for env, sa in google_service_account.backend : env => sa.email }
  description = "Service account emails for backend workload identity by environment."
}

output "worker_service_account_emails" {
  value       = { for env, sa in google_service_account.worker : env => sa.email }
  description = "Service account emails for worker workload identity by environment."
}

output "redis_host_by_env" {
  value       = { for env, redis in google_redis_cluster.redis : env => redis.discovery_endpoints[0].address }
  description = "Redis host discovery endpoints by environment."
}

output "redis_port_by_env" {
  value       = { for env, redis in google_redis_cluster.redis : env => redis.discovery_endpoints[0].port }
  description = "Redis port discovery endpoints by environment."
}
