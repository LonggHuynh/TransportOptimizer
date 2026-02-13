# Terraform Layout

Terraform is now split into three root directories:

1. `infra/common` -> Terraform Cloud workspace `transport-common`
2. `infra/stage` -> Terraform Cloud workspace `transport-stage`
3. `infra/prod` -> Terraform Cloud workspace `transport-prod`

The previous single-root configuration was moved to `infra/legacy-root` for reference.

## What Each Root Manages

- `infra/common`
  - Shared GCP infrastructure: APIs, VPC/subnets/NAT, GKE, Redis, IAM, frontend bucket/LB.
  - Produces outputs consumed by app roots.
- `infra/stage`
  - Helm release for stage app workloads.
  - Reads shared outputs from `transport-common` via `data.terraform_remote_state`.
- `infra/prod`
  - Helm release for prod app workloads.
  - Reads shared outputs from `transport-common` via `data.terraform_remote_state`.

## Apply Order

1. Apply `infra/common` first.
2. Apply `infra/stage`.
3. Apply `infra/prod`.

## Commands

```bash
cd infra/common
terraform init
terraform plan
terraform apply

cd ../stage
terraform init
terraform plan
terraform apply

cd ../prod
terraform init
terraform plan
terraform apply
```

## Migration From Old Single Workspace

If state/resources still come from the old single-root workflow:

1. Keep/rename old workspace state as `transport-common`.
2. In `infra/common`, run plan/apply and confirm shared resources are stable.
3. In `infra/stage` and `infra/prod`, import Helm releases if they already exist:

```bash
cd infra/stage
terraform import 'module.app.helm_release.app' transport-stage/transport-optimizer

cd ../prod
terraform import 'module.app.helm_release.app' transport-prod/transport-optimizer
```

4. Re-run plan in all three roots and confirm no unexpected destroy.
