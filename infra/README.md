# Terraform Layout

Terraform is split into two active roots:

1. `infra/common` -> shared infrastructure (`transport-common`)
2. `infra/env` -> app infrastructure for both `stage` and `prod`

`infra/env` uses one codebase with environment-specific variables (`stage`/`prod`), which is the recommended Terraform pattern to avoid duplicate root code.

## What Each Root Manages

- `infra/common`
  - Shared GCP infrastructure: APIs, VPC/subnets/NAT, GKE, Redis, IAM, frontend bucket/LB.
  - Produces outputs consumed by `infra/env`.
- `infra/env`
  - Helm release for app workloads.
  - Environment is selected by workspace (`stage`/`prod`) or tfvars (`environments/stage.tfvars` or `environments/prod.tfvars`).
  - Reads shared outputs from `transport-common` via `data.terraform_remote_state`.

## Terraform Cloud Workspaces

- `transport-common`
- `transport-stage`
- `transport-prod`

`infra/env/backend.tf` uses `workspaces { prefix = "transport-" }`.
Use local workspace `stage` or `prod` when running `infra/env` from CLI.

## Apply Order

1. Apply `infra/common` first.
2. Apply `infra/env` with `stage` vars.
3. Apply `infra/env` with `prod` vars.

## Commands

```bash
cd infra/common
terraform init
terraform plan
terraform apply

cd ../env
terraform init

terraform workspace select stage || terraform workspace new stage
terraform plan -var-file=environments/stage.tfvars
terraform apply -var-file=environments/stage.tfvars

terraform workspace select prod || terraform workspace new prod
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

## Migration From Old Split Stage/Prod Roots

If you previously used separate directories (`infra/stage`, `infra/prod`), keep the same Terraform Cloud workspace names:

- `transport-stage`
- `transport-prod`

Then run `infra/env` with matching workspace + tfvars pair:

- workspace `stage` + `environments/stage.tfvars`
- workspace `prod` + `environments/prod.tfvars`

If Helm resources already exist and state is new, import with:

```bash
cd infra/env
terraform workspace select stage
terraform import -var-file=environments/stage.tfvars 'helm_release.app' transport-stage/transport-optimizer

terraform workspace select prod
terraform import -var-file=environments/prod.tfvars 'helm_release.app' transport-prod/transport-optimizer
```

Legacy single-root Terraform files have been removed from this repository.
