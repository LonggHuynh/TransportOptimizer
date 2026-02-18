# TransportOptimizer Terraform Infra Map

## Scope

This reference describes the current Terraform architecture in this repository (`infra/common` + `infra/env`).
Use it as a high-confidence baseline when building diagrams.

## Root Modules

- `infra/common`: shared foundation (network, GKE, IAM, Redis, frontend bucket + LB).
- `infra/env`: app deployment root for `stage` and `prod` via Helm module.

## Shared Foundation (infra/common)

### Networking

- `google_compute_network.vpc`
- `google_compute_subnetwork.primary` (per env)
- `google_compute_subnetwork.gke` (shared)
- `google_compute_router.nat_router`
- `google_compute_router_nat.nat` (per env)
- `google_compute_router_nat.gke` (shared)

### GKE

- `google_container_cluster.primary` (Autopilot, shared)

### Redis (Memorystore Cluster + PSC)

- `google_compute_subnetwork.psc`
- `google_network_connectivity_service_connection_policy.redis`
- `google_redis_cluster.redis` (per env)


### IAM / Workload Identity

- `google_service_account.backend` (per env)
- `google_service_account.worker` (per env)
- `google_project_iam_member.*` for Secret Manager + Redis access
- `google_service_account_iam_member.*` for Workload Identity binding from KSA to GSA

### APIs

- `google_project_service.required` enables required GCP APIs.

## App Layer (infra/env -> modules/app)

- `module.app` deploys `helm_release.app` to GKE.
- Helm chart creates gateway + routes + backend + frontend + worker workloads.
- Module reads shared outputs through `data.terraform_remote_state.common`.

## Environment Model

- Environments: `stage`, `prod`.
- Shared GKE cluster/subnet.
- Per-environment resources for app, Redis, and frontend hosting/LB.

## Diagram Starter Flows


### App Traffic in GKE

`Users -> Gateway -> HTTPRoute -> Backend Service (K8s)`
`Users -> Gateway -> HTTPRoute -> Frontend Service (K8s)`

### Workload Identity + Redis Access

`KSA backend/worker -> Workload Identity Binding -> GSA backend/worker`
`GSA backend/worker -> IAM roles -> Redis Cluster`

### Foundation Networking

`VPC -> Subnets (env + gke + psc) -> Cloud Router -> NATs`

## Explicit Non-Goals

Do not add resources not present in Terraform, including:

- Cloud DNS (Route53 equivalent)
- Cloud Armor
- HTTPS/TLS termination resources
- Cloud CDN beyond backend bucket settings
- IAM related
