# Terraform Diagram Inventory

- Generated: `2026-02-18T04:02:41+00:00`
- Root: `/home/long-huynh/Workplace/TransportOptimizer/infra`
- Nodes: `29`
- Edges: `36`

## Category Counts

| Category | Count |
| --- | ---: |
| compute | 1 |
| database-cache | 1 |
| kubernetes-app | 2 |
| module | 1 |
| networking | 13 |
| platform | 1 |
| security-identity | 8 |
| storage | 2 |

## Nodes

| Address | Kind | Service | Category | Scope | File |
| --- | --- | --- | --- | --- | --- |
| `google_project_service.required` | resource | Project API | platform | unspecified | `common/apis.tf:18` |
| `google_storage_bucket.frontend` | resource | Cloud Storage Bucket | storage | per-environment | `common/frontend-cdn.tf:1` |
| `google_storage_bucket_iam_member.frontend_public_read` | resource | Cloud Storage IAM | storage | per-environment | `common/frontend-cdn.tf:27` |
| `google_compute_backend_bucket.frontend` | resource | Backend Bucket | networking | per-environment | `common/frontend-cdn.tf:35` |
| `google_compute_url_map.frontend` | resource | URL Map | networking | per-environment | `common/frontend-cdn.tf:43` |
| `google_compute_target_http_proxy.frontend` | resource | HTTP Proxy | networking | per-environment | `common/frontend-cdn.tf:50` |
| `google_compute_global_address.frontend` | resource | Global Address | networking | per-environment | `common/frontend-cdn.tf:57` |
| `google_compute_global_forwarding_rule.frontend` | resource | Global Forwarding Rule | networking | per-environment | `common/frontend-cdn.tf:65` |
| `google_container_cluster.primary` | resource | GKE Cluster | compute | shared-foundation | `common/gke.tf:1` |
| `google_service_account.backend` | resource | Service Account | security-identity | per-environment | `common/iam.tf:1` |
| `google_service_account.worker` | resource | Service Account | security-identity | per-environment | `common/iam.tf:10` |
| `google_project_iam_member.backend_secret_access` | resource | Project IAM Binding | security-identity | per-environment | `common/iam.tf:19` |
| `google_project_iam_member.worker_secret_access` | resource | Project IAM Binding | security-identity | per-environment | `common/iam.tf:27` |
| `google_project_iam_member.backend_redis_access` | resource | Project IAM Binding | security-identity | per-environment | `common/iam.tf:35` |
| `google_project_iam_member.worker_redis_access` | resource | Project IAM Binding | security-identity | per-environment | `common/iam.tf:43` |
| `google_compute_network.vpc` | resource | VPC Network | networking | shared-foundation | `common/network.tf:1` |
| `google_compute_subnetwork.primary` | resource | Subnetwork | networking | per-environment | `common/network.tf:11` |
| `google_compute_subnetwork.gke` | resource | Subnetwork | networking | shared-foundation | `common/network.tf:46` |
| `google_compute_router.nat_router` | resource | Cloud Router | networking | shared-foundation | `common/network.tf:66` |
| `google_compute_router_nat.nat` | resource | Cloud NAT | networking | per-environment | `common/network.tf:74` |
| `google_compute_router_nat.gke` | resource | Cloud NAT | networking | shared-foundation | `common/network.tf:94` |
| `google_compute_subnetwork.psc` | resource | Subnetwork | networking | shared-foundation | `common/redis-cluster.tf:1` |
| `google_network_connectivity_service_connection_policy.redis` | resource | PSC Service Connection Policy | networking | shared-foundation | `common/redis-cluster.tf:13` |
| `google_redis_cluster.redis` | resource | Memorystore Redis Cluster | database-cache | per-environment | `common/redis-cluster.tf:29` |
| `google_service_account_iam_member.backend_workload_identity` | resource | Service Account IAM Binding | security-identity | per-environment | `common/workload-identity.tf:1` |
| `google_service_account_iam_member.worker_workload_identity` | resource | Service Account IAM Binding | security-identity | per-environment | `common/workload-identity.tf:11` |
| `helm_release.app` | resource | Helm Release | kubernetes-app | single-environment | `env/app-release.tf:1` |
| `module.app` | module | Terraform Module (app) | module | single-environment | `env/main.tf:1` |
| `helm_release.app` | resource | Helm Release | kubernetes-app | single-environment | `modules/app/main.tf:112` |

## Edges

| From | To | Relation |
| --- | --- | --- |
| `google_compute_backend_bucket.frontend` | `google_compute_url_map.frontend` | references |
| `google_compute_global_address.frontend` | `google_compute_global_forwarding_rule.frontend` | references |
| `google_compute_network.vpc` | `google_compute_router.nat_router` | references |
| `google_compute_network.vpc` | `google_compute_subnetwork.gke` | references |
| `google_compute_network.vpc` | `google_compute_subnetwork.primary` | references |
| `google_compute_network.vpc` | `google_compute_subnetwork.psc` | references |
| `google_compute_network.vpc` | `google_container_cluster.primary` | references |
| `google_compute_network.vpc` | `google_network_connectivity_service_connection_policy.redis` | references |
| `google_compute_network.vpc` | `google_redis_cluster.redis` | references |
| `google_compute_router.nat_router` | `google_compute_router_nat.gke` | references |
| `google_compute_router.nat_router` | `google_compute_router_nat.nat` | references |
| `google_compute_subnetwork.gke` | `google_compute_router_nat.gke` | references |
| `google_compute_subnetwork.gke` | `google_container_cluster.primary` | references |
| `google_compute_subnetwork.primary` | `google_compute_router_nat.nat` | references |
| `google_compute_subnetwork.psc` | `google_network_connectivity_service_connection_policy.redis` | references |
| `google_compute_target_http_proxy.frontend` | `google_compute_global_forwarding_rule.frontend` | references |
| `google_compute_url_map.frontend` | `google_compute_target_http_proxy.frontend` | references |
| `google_container_cluster.primary` | `google_service_account_iam_member.backend_workload_identity` | references |
| `google_container_cluster.primary` | `google_service_account_iam_member.worker_workload_identity` | references |
| `google_network_connectivity_service_connection_policy.redis` | `google_redis_cluster.redis` | references |
| `google_project_service.required` | `google_compute_global_address.frontend` | references |
| `google_project_service.required` | `google_compute_network.vpc` | references |
| `google_project_service.required` | `google_compute_subnetwork.psc` | references |
| `google_project_service.required` | `google_container_cluster.primary` | references |
| `google_project_service.required` | `google_network_connectivity_service_connection_policy.redis` | references |
| `google_project_service.required` | `google_service_account.backend` | references |
| `google_project_service.required` | `google_service_account.worker` | references |
| `google_project_service.required` | `google_storage_bucket.frontend` | references |
| `google_service_account.backend` | `google_project_iam_member.backend_redis_access` | references |
| `google_service_account.backend` | `google_project_iam_member.backend_secret_access` | references |
| `google_service_account.backend` | `google_service_account_iam_member.backend_workload_identity` | references |
| `google_service_account.worker` | `google_project_iam_member.worker_redis_access` | references |
| `google_service_account.worker` | `google_project_iam_member.worker_secret_access` | references |
| `google_service_account.worker` | `google_service_account_iam_member.worker_workload_identity` | references |
| `google_storage_bucket.frontend` | `google_compute_backend_bucket.frontend` | references |
| `google_storage_bucket.frontend` | `google_storage_bucket_iam_member.frontend_public_read` | references |
