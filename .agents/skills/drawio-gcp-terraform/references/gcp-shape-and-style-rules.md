# GCP Shape and Style Rules

## Goal

Keep diagrams visually consistent and easy to scan while preserving Terraform accuracy.

## Icon Selection

1. Prefer official Google Cloud icons from Draw.io shape libraries.
2. Use generic icons only when a specific service icon is unavailable.
3. Keep icon choice stable for repeated resource types.

## Color System

Use the same color per category across the entire diagram.

| Category | Color | Typical Terraform Resources |
| --- | --- | --- |
| Networking | `#1A73E8` | `google_compute_network`, `google_compute_subnetwork`, `google_compute_router`, `google_compute_router_nat`, `google_compute_global_forwarding_rule`, `google_compute_url_map`, `google_compute_target_http_proxy`, `google_compute_backend_bucket`, `google_compute_global_address` |
| Compute / Containers | `#F29900` | `google_container_cluster`, `helm_release` workloads |
| Storage | `#34A853` | `google_storage_bucket` |
| Database / Cache | `#9C27B0` | `google_redis_cluster` |
| Security / Identity | `#EA4335` | `google_service_account`, `google_project_iam_member`, `google_service_account_iam_member` |
| Platform / APIs | `#5F6368` | `google_project_service` |
| External Actors | `#202124` | Users, external systems |

## Edge Styles

| Edge Type | Style | Color | Use |
| --- | --- | --- | --- |
| Data path | Solid | `#34A853` | User/API/app traffic |
| Control plane / management | Solid | `#1A73E8` | Cluster/API/management relationships |
| Identity / policy / config | Dashed | `#9AA0A6` | IAM, Workload Identity, bindings, config wiring |

## Label Rules

1. Use plain text only.
2. Keep labels short and explicit.
3. Put annotations to the right of icons.
4. Put one concept per label.

Examples:

- `PSC`
- `Workload Identity`
- `Backend Bucket`
- `HTTP :80`
- `Redis IAM Auth`

## Layout Rules

1. Place the main request flow on one horizontal row.
2. Place supporting services above or below.
3. Place legend at the bottom.
4. Keep equal spacing across environments.
5. Keep shared resources in a dedicated zone.

## Terraform Fidelity Rules

1. Do not infer hidden components.
2. Do not add TLS, Cloud Armor, DNS, or CDN services unless declared.
3. Do not merge multiple Terraform resources into one icon unless explicitly annotated.
4. Mark intentionally omitted implementation details in a short gap list.
