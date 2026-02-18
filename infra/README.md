# Terraform Guide

Terraform is split into two roots:

1. `infra/common`: shared platform infrastructure in workspace `transport-common`
2. `infra/env`: application deployment for `stage` and `prod` using one codebase

## Ownership

- `infra/common` manages shared GCP resources (APIs, VPC/subnets/NAT, shared GKE, Redis, IAM/workload identity).
- `infra/env` deploys the app Helm chart to GKE.
- App release state is owned by `module.app.helm_release.app` only.

## Backend and Workspaces

- `infra/common` uses Terraform Cloud/HCP Terraform with fixed workspace name `transport-common`.
- `infra/env` uses `backend "remote"` with workspace prefix `transport-`.
- Local CLI workspace names must be `stage` or `prod`, which map to:
  - `stage` -> `transport-stage`
  - `prod` -> `transport-prod`

## Apply Order

1. Apply `infra/common`.
2. Apply `infra/env` for `stage`.
3. Apply `infra/env` for `prod`.

## CLI Commands

```bash
cd infra/common
terraform init
terraform plan
terraform apply

cd ../env
terraform init -reconfigure

terraform workspace select stage || terraform workspace new stage
terraform plan -var-file=environments/stage.tfvars
terraform apply -var-file=environments/stage.tfvars

terraform workspace select prod || terraform workspace new prod
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

## CI/CD

- `.github/workflows/infra-core.yml`
  - full Terraform apply (`common`, `stage`, or `prod`)
- `.github/workflows/terraform-app-release.yml`
  - app-only release and targets `module.app.helm_release.app`

## State Migration Notes

If an older state still contains a root-level `helm_release.app`, remove it so only module state remains:

```bash
cd infra/env
terraform state list | rg '^helm_release\.app$'
terraform state rm helm_release.app
```

If Helm release exists in cluster but not in state, import it:

```bash
cd infra/env
terraform workspace select stage
terraform import -var-file=environments/stage.tfvars 'module.app.helm_release.app' transport-stage/transport-optimizer

terraform workspace select prod
terraform import -var-file=environments/prod.tfvars 'module.app.helm_release.app' transport-prod/transport-optimizer
```
