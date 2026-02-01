# Current Architecture (GCP)

## Overview

We run **one shared GKE Autopilot cluster** and **multiple environment resources** (stage/prod) in the same project.
Environment separation for workloads is done with **Kubernetes namespaces**.

## Environments

- `environments = ["stage", "prod"]`
- `gke_environment = ""` (no suffix; the cluster runs in the shared GKE subnet)

## Network

Single VPC:

- VPC: `transport-vpc` (no shared suffix)

Subnets:

- **GKE subnet (shared)**: `transport-gke-subnet`
  - Primary CIDR: `10.11.0.0/20`
  - Pods secondary: `10.22.0.0/16`
  - Services secondary: `10.31.0.0/20`

- **Stage subnet**: `transport-subnet-stage`
  - Primary CIDR: `10.10.0.0/20`
  - Pods secondary: `10.20.0.0/16`
  - Services secondary: `10.30.0.0/20`

- **Prod subnet**: `transport-subnet-prod`
  - Primary CIDR: `10.10.16.0/20`
  - Pods secondary: `10.21.0.0/16`
  - Services secondary: `10.30.16.0/20`

## NAT

Single Cloud Router with multiple NATs (one per subnet):

- `transport-nat-router`
- NATs:
  - `transport-stage-nat` → stage subnet
  - `transport-prod-nat` → prod subnet
  - `transport-gke-nat` → GKE subnet

## GKE

- Cluster name: `transport`
- Mode: Autopilot
- Subnet: `transport-gke-subnet`
- Namespaces:
  - `transport-stage`
  - `transport-prod`

Apply namespaces:

```bash
kubectl apply -f k8s/namespaces.yaml
```

## Frontend

Per-environment GCS bucket + HTTP load balancer:

- Buckets:
  - `transport-frontend-pathoptimizer-486102-stage`
  - `transport-frontend-pathoptimizer-486102-prod`
- One LB per environment with public IP

## IAM / Service Accounts

Per-environment service accounts:

- `transport-*-backend`
- `transport-*-worker`

Project IAM:

- `roles/secretmanager.secretAccessor` for backend + worker SAs (stage/prod)

## Outputs (Terraform)

- VPC name (shared)
- Subnet names (per env + GKE)
- Cluster name/endpoint (shared)
- Bucket names (per env)
- Frontend LB IPs (per env)
