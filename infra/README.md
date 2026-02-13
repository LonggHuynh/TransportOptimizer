# Terraform Workspaces

This stack is split across three Terraform Cloud workspaces:

1. `transport-common`
2. `transport-stage`
3. `transport-prod`

`infra/backend.tf` uses `workspaces { prefix = "transport-" }`, so local CLI workspace names map as:

- `common` -> `transport-common`
- `stage` -> `transport-stage`
- `prod` -> `transport-prod`

## Behavior by Workspace

- `transport-common`: manages shared GCP infrastructure (APIs, VPC/subnets, NAT, GKE, Redis, IAM, frontend bucket/LB).
- `transport-stage`: manages only Helm app release for `stage`.
- `transport-prod`: manages only Helm app release for `prod`.

## Apply Order

1. Apply `transport-common` first.
2. Apply `transport-stage`.
3. Apply `transport-prod`.

## Migration From Old `transport` Workspace

If your existing state is in a single workspace named `transport`, migrate state before first apply with this layout.

1. Rename Terraform Cloud workspace `transport` -> `transport-common` (keeps existing state/history).
2. In local CLI, switch to `common` workspace.
3. Remove Helm release resources from `transport-common` state only (no cluster delete):

```bash
cd infra
terraform init
terraform workspace select common
terraform state rm 'helm_release.app["stage"]'
terraform state rm 'helm_release.app["prod"]'
```

4. Create/select `stage` workspace and import stage Helm release:

```bash
terraform workspace select stage || terraform workspace new stage
terraform import 'helm_release.app["stage"]' transport-stage/transport-optimizer
```

5. Create/select `prod` workspace and import prod Helm release:

```bash
terraform workspace select prod || terraform workspace new prod
terraform import 'helm_release.app["prod"]' transport-prod/transport-optimizer
```

6. Run `terraform plan` in each workspace (`common`, `stage`, `prod`) and confirm no unexpected create/destroy.

## CLI Examples

```bash
cd infra
terraform init

terraform workspace select common || terraform workspace new common
terraform plan
terraform apply

terraform workspace select stage || terraform workspace new stage
terraform plan
terraform apply

terraform workspace select prod || terraform workspace new prod
terraform plan
terraform apply
```
