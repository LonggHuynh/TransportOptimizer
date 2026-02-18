# TransportOptimizer Terraform Diagram Inventory

- Generated: `2026-02-18T04:08:04+00:00`
- Diagrammed resources: `28`
- Diagrammed edges: `38`
- Omitted resources: `1`

## Diagrammed Resources

- `google_compute_backend_bucket.frontend` (common/frontend-cdn.tf:35)
- `google_compute_global_address.frontend` (common/frontend-cdn.tf:57)
- `google_compute_global_forwarding_rule.frontend` (common/frontend-cdn.tf:65)
- `google_compute_network.vpc` (common/network.tf:1)
- `google_compute_router.nat_router` (common/network.tf:66)
- `google_compute_router_nat.gke` (common/network.tf:94)
- `google_compute_router_nat.nat` (common/network.tf:74)
- `google_compute_subnetwork.gke` (common/network.tf:46)
- `google_compute_subnetwork.primary` (common/network.tf:11)
- `google_compute_subnetwork.psc` (common/redis-cluster.tf:1)
- `google_compute_target_http_proxy.frontend` (common/frontend-cdn.tf:50)
- `google_compute_url_map.frontend` (common/frontend-cdn.tf:43)
- `google_container_cluster.primary` (common/gke.tf:1)
- `google_network_connectivity_service_connection_policy.redis` (common/redis-cluster.tf:13)
- `google_project_iam_member.backend_redis_access` (common/iam.tf:35)
- `google_project_iam_member.backend_secret_access` (common/iam.tf:19)
- `google_project_iam_member.worker_redis_access` (common/iam.tf:43)
- `google_project_iam_member.worker_secret_access` (common/iam.tf:27)
- `google_project_service.required` (common/apis.tf:18)
- `google_redis_cluster.redis` (common/redis-cluster.tf:29)
- `google_service_account.backend` (common/iam.tf:1)
- `google_service_account.worker` (common/iam.tf:10)
- `google_service_account_iam_member.backend_workload_identity` (common/workload-identity.tf:1)
- `google_service_account_iam_member.worker_workload_identity` (common/workload-identity.tf:11)
- `google_storage_bucket.frontend` (common/frontend-cdn.tf:1)
- `google_storage_bucket_iam_member.frontend_public_read` (common/frontend-cdn.tf:27)
- `helm_release.app` (modules/app/main.tf:112)
- `module.app` (env/main.tf:1)

## Gap List

- Omitted duplicate `helm_release.app` from `env/app-release.tf:1`
